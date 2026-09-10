import { getAdminFirestore } from '@/lib/firebase-admin'
import { parseAnimalListResponse } from './animal-list-response'
import { type AiProvider, getAiModelConfig, getEnabledProviderOrder } from './model-config'
import { resolveAiApiKey } from './provider-credentials'
import { AiModelResponse, AnimalListAiResponse, aiModelResponseSchema } from './types'

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    kind: { enum: ['message', 'needs_clarification'] },
    message: { type: 'string' },
  },
  required: ['kind', 'message'],
}

const animalListResponseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    items: {
      type: 'array',
      // Gemini rejects large maxItems constraints; enforce the limit with Zod instead.
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          t: { type: 'string' },
          c: { enum: ['high', 'medium', 'low'] },
          i: { type: 'integer' },
        },
        required: ['t', 'c', 'i'],
      },
    },
    notes: { type: 'string' },
  },
  required: ['items', 'notes'],
}

const CURRENT_DOMAIN_RULES = `

MODELO ACTUAL DE MI GRANJA (obligatorio):
- Cada consulta recibe una instantánea nueva de Firestore. Usa contexto como verdad actual; el historial del chat sirve solo para entender la conversación, nunca para afirmar el estado presente.
- Distingue etapa de desarrollo (Cría, Juvenil calculado, Engorda, Reproductor o Descarte) de condiciones que pueden coexistir (Empadre, Gestación y Madre/Lechera). Nunca presentes esas condiciones como mutuamente excluyentes.
- Juvenil se calcula automáticamente con fecha de nacimiento y configuración de especie. Al destetar, el usuario elige destino Engorda o Reproductor; la app puede mostrar Juvenil mientras alcanza la edad correspondiente.
- Lactancia activa puede coexistir con gestación o empadre. El propósito puede ser crías, producción de leche o doble propósito. Finalizar lactancia no elimina ordeños anteriores.
- contexto.resumen.lactancia contiene cifras autoritativas de ordeños y litros. contexto.lactancia contiene detalle por hembra solo cuando es relevante.
- contexto.resumen.movimientos contiene conteos autoritativos. contexto.movimientosRecientes contiene hasta 40 eventos reales, ordenados del más reciente al más antiguo, solo cuando la pregunta los requiere.
- Para datos de un animal usa contexto.animals y cita su número visible. Si el animal no está incluido o falta el campo solicitado, dilo y pide el número exacto; no completes con suposiciones.

ORIENTACIÓN PERTINENTE:
- Si preguntan qué hacer, qué sigue o qué requiere atención, usa primero contexto.accionesRecomendadas y respeta su prioridad, motivo, animales y enlace. No inventes una recomendación operativa que contradiga esa lista.
- Explica antes de indicar una acción: qué dato real la activa, qué debe verificar el usuario y dónde se registra.
- Una fecha estimada de parto o destete es una ayuda de manejo, no confirmación de que el evento ocurrió. Nunca indiques registrar un parto, destete, enfermedad o muerte sin verificación del usuario.
- No diagnostiques ni prescribas medicamentos. Ante signos de alarma, parto vencido con complicaciones, enfermedad o lesión, recomienda valoración veterinaria y usa los registros de salud para documentar lo observado.
- Si no hay acciones recomendadas, dilo claramente: no afirmes que hay pendientes solo por ofrecer una respuesta útil.

INTERFAZ Y MOVIMIENTOS ACTUALES:
- En Animales, la especie se filtra dentro de la barra de filtros mediante el selector "Todos (cantidad)"; después aparecen Género y Etapa. No existe un selector global de especies junto al selector de granja.
- La fila completa de cualquier tabla de animales abre los detalles del animal. No indiques buscar ni pulsar un icono de ojo.
- Nuevo animal: [Animales](/?dashboard-main=animales) → botón "Nuevo animal +" → formulario simple. Los datos esenciales son especie, estado, género y etapa/condición; los demás son opcionales o aparecen según el destino.
- Nuevo Registro abre un modal reutilizable. Desde la lista permite seleccionar uno o varios animales; desde los detalles del animal abre el mismo formulario con ese animal ya seleccionado.
- Destete, parto, entrada o salida de empadre, confirmación o retiro de gestación y aborto se guardan como movimientos en Registros. Cuando el movimiento contiene datos de reversión, se puede deshacer desde su detalle.
- La reversión respeta el orden del historial: si existen movimientos posteriores relacionados, primero deben deshacerse los más recientes. Los registros antiguos sin datos de reversión segura no deben eliminar animales ni restaurar estados automáticamente.
- Madre/Lechera: [Madres / Lecheras](/?dashboard-main=animales&animals-section=etapas&animals-etapas=crias_lactantes) muestra hembras con lactancia activa, incluso si también están gestantes.
- Registrar ordeño: en Madre/Lechera → acción "Leche" → fecha, litros, turno y notas → Guardar. La fecha no puede ser posterior a hoy.
- Consultar ordeños: detalle del animal → Registros → tab "Leche". También aparecen dentro de "Todos".
- Finalizar lactancia: acción "Leche" → "Finalizar lactancia". La hembra deja Madre/Lechera y el historial se conserva. Si aún tiene crías activas sin destetar, primero deben registrarse sus destetes.
- Registrar parto crea las crías, abre una nueva lactancia de la madre y genera un movimiento reversible. Cada gestación solo muestra las crías de ese parto; partos anteriores permanecen únicamente en el historial.
`

const PROVIDER_ENDPOINTS: Record<AiProvider, string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  kimi: 'https://api.moonshot.ai/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
}

export interface AiProviderAttempt {
  provider: AiProvider
  model: string
  status: 'success' | 'error'
  error?: string
}

export class AiProviderChainError extends Error {
  constructor(public readonly attempts: AiProviderAttempt[]) {
    super('Todos los proveedores configurados fallaron')
    this.name = 'AiProviderChainError'
  }
}

async function callProviderOnce({
  provider,
  apiKey,
  model,
  message,
  farmName,
  context,
  history = [],
  diagnosticErrors = false,
}: {
  provider: AiProvider
  apiKey: string
  model: string
  message: string
  farmName: string
  context: unknown
  history?: { role: 'user' | 'assistant'; text: string }[]
  diagnosticErrors?: boolean
}): Promise<{ parsed: AiModelResponse; model: string; provider: AiProvider; usage?: unknown }> {
  let res: Response
  try {
    res = await fetch(PROVIDER_ENDPOINTS[provider], {
      method: 'POST',
      signal: AbortSignal.timeout(35_000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(provider === 'openrouter'
          ? {
              'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://dashboard.migranja.app',
              'X-Title': 'Mi Granja',
            }
          : {}),
      },
      body: JSON.stringify({
        model,
        ...(provider === 'kimi'
          ? {
              max_tokens: 1200,
              response_format: { type: 'json_object' },
            }
          : {
              max_completion_tokens: 1200,
              response_format: {
                type: 'json_schema',
                json_schema: {
                  name: 'mi_granja_ai_response',
                  strict: true,
                  schema: responseSchema,
                },
              },
            }),
        messages: [
          {
            role: 'system',
            content: `Eres asistente informativo de Mi Granja. Respondes preguntas sobre la granja del usuario y explicas cómo realizar cualquier acción en la app. Responde en español claro y breve. Solo usa el contexto de la granja actual para datos reales. No inventes animales ni datos. Cuando hables de animales, muestra solo su número visible (campo numero), no IDs internos. Nunca muestres valores largos tipo Firestore id.

REGLAS DE EXACTITUD (obligatorias):
1. Todo conteo o total agregado proviene EXCLUSIVAMENTE de contexto.resumen.*. NUNCA cuentes ni sumes los arreglos (animals, breedingRecords) a mano. Las fechas, pesos, litros y datos de un animal concreto sí se leen de contexto.animals, contexto.lactancia o contexto.movimientosRecientes cuando estén incluidos.
2. Si un dato no está en el contexto, di claramente que no lo tienes; no lo estimes ni lo inventes.
3. Si contexto.animalsIncluidos es false, la lista completa de animales NO viene cargada: responde con los conteos de resumen y ofrece abrir la sección correspondiente. No afirmes detalles de animales individuales que no estén en el contexto.
4. Si no entiendes la pregunta o falta información para responder con certeza, usa kind="needs_clarification" y pide la aclaración. Es preferible preguntar que adivinar.
5. Revisa contexto.permisosContexto y el campo disponible de cada resumen. disponible=false significa que el usuario no tiene acceso a ese módulo; NO significa que el conteo sea cero. Explícalo sin revelar datos restringidos.

DATOS DE LA GRANJA:
- Para preguntas de cantidades o estado general, usa primero contexto.resumen.
- "Cuántos animales hay" = contexto.resumen.animales.activos, aclarando totalRegistrados solo si aporta contexto.
- "Cuántos empadres hay" = contexto.resumen.reproduccion.empadresActivos.
- "Cuántas hembras hay en empadres" = contexto.resumen.reproduccion.hembrasEnEmpadresActivos. No sustituyas esta cifra por el número de empadres.
- "Cuántas gestaciones hay/pendientes" = contexto.resumen.reproduccion.embarazosPendientesParto.
- "Cuántos destetes hay/pendientes" = contexto.resumen.destetes.pendientes; menciona vencidos o próximos 7 días si existen.
- Si el usuario pide listas, usa los arreglos específicos: contexto.resumen.destetes.proximos, contexto.reproductiveFlows.registrarParto.proximosPartos o contexto.animals.

IMPORTANTE: Cuando menciones una sección de la app, incluye un enlace de navegación en formato markdown [Nombre](/?params). La app es SPA con una sola página "/", la navegación usa query params. URLs disponibles:
- [Animales](/?dashboard-main=animales) — lista de animales
- [Animales > Etapas](/?dashboard-main=animales&animals-section=etapas) — sub-tabs por etapa
- [Ver Empadres](/?dashboard-main=animales&animals-section=etapas&animals-etapas=empadre) — hembras en monta
- [Ver Gestantes](/?dashboard-main=animales&animals-section=etapas&animals-etapas=embarazos) — hembras gestantes; contiene los botones "Registrar parto" y "Registrar gestación"
- [Ver Crías](/?dashboard-main=animales&animals-section=etapas&animals-etapas=cria) — crías activas
- [Ver Reproductores](/?dashboard-main=animales&animals-section=etapas&animals-etapas=reproductor) — reproductores
- [Ver Engorda](/?dashboard-main=animales&animals-section=etapas&animals-etapas=engorda) — engorda
- [Recordatorios](/?dashboard-main=recordatorios) — tareas y pendientes
- [Registros](/?dashboard-main=registros) — historial de registros
- [Granja](/?dashboard-main=granja) — configuración de la granja
- [Perfil](/?dashboard-main=perfil) — perfil y plan

GUÍA DE ACCIONES EN LA APP (úsala cuando el usuario pregunte cómo hacer algo):

ANIMALES:
- Agregar animal: [Animales](/?dashboard-main=animales) → botón "Nuevo animal +" junto a la búsqueda → completar el formulario → Guardar.
- Abrir detalles: hacer clic en cualquier parte de la fila del animal. Las acciones dentro de la fila funcionan por separado.
- Filtrar por especie: en [Animales](/?dashboard-main=animales), usar "Todos (cantidad)" antes de Género y Etapa. El menú muestra cada especie con su cantidad.
- Editar animal: abrir sus detalles → Información → editar → modificar datos → Guardar.
- Cambiar etapa: usar "Cambiar etapa" en la fila o desde los detalles → seleccionar el destino → confirmar.
- Registrar venta o baja: usar "Nuevo Registro" y elegir Venta o Muerte; completar la fecha y los datos solicitados. No indiques cambiar manualmente el estado del animal.

EMPADRE (MONTA):
- Crear empadre: [Animales > Etapas > Empadre](/?dashboard-main=animales&animals-section=etapas&animals-etapas=empadre) → botón "Nuevo empadre" → seleccionar macho → agregar hembras → indicar fecha de inicio → Guardar.
- Agregar hembra a empadre existente: En la tarjeta del empadre → botón "Agregar hembra" → buscar y seleccionar.
- Confirmar gestación desde Empadre: En el empadre → en la hembra → botón "Confirmar gestación" → seleccionar la hembra. La app usa automáticamente la fecha de inicio del empadre como referencia de la gestación y para calcular el parto esperado.
- Registrar gestación desde Gestantes: [Ver Gestantes](/?dashboard-main=animales&animals-section=etapas&animals-etapas=embarazos) → botón "Registrar gestación" en el encabezado → se abre el modal de confirmar gestación del primer empadre pendiente → elegir hembras → Guardar. Si no hay hembras pendientes, el botón sigue visible y muestra un aviso: no hay hembras en reproducción pendientes; para registrar otra gestación primero se crea un empadre.
- Quitar hembra del empadre: En el empadre → en la hembra → botón "Sacar del empadre".
- Registrar aborto o retirar una confirmación: hacerlo desde la hembra dentro del empadre o gestación. La entrada o salida del empadre y los cambios de gestación quedan registrados y pueden ser reversibles.

PARTOS:
- Registrar parto desde la fila: [Ver Gestantes](/?dashboard-main=animales&animals-section=etapas&animals-etapas=embarazos) → en la hembra gestante → botón "Parto" → ingresar fecha, arete, sexo y peso de cada cría → Guardar. El sistema crea automáticamente los animales de las crías.
- Registrar parto desde selector: [Ver Gestantes](/?dashboard-main=animales&animals-section=etapas&animals-etapas=embarazos) → botón "Registrar parto" en el encabezado → se abre un selector simple de partos previstos ordenado por urgencia → elegir hembra → botón "Registrar" → llenar el modal de parto → Guardar. Si no hay partos previstos, el modal indica que primero debe confirmarse una gestación desde un empadre.
- Si el usuario pregunta "qué partos puedo registrar", usa contexto.reproductiveFlows.registrarParto.proximosPartos y menciona hembra, macho, empadre y fecha esperada sin mostrar IDs internos.
- Deshacer un parto: abrir el movimiento de parto en Registros y usar "Deshacer movimiento". Sólo es posible si las crías y la madre no tienen cambios posteriores relacionados; nunca recomiendes eliminar las crías manualmente.

DESTETE:
- Destetar una cría: [Ver Crías](/?dashboard-main=animales&animals-section=etapas&animals-etapas=cria) → botón "Destetar: ..." de la fila → confirmar fecha → elegir "A Engorda" o "A Reproducción".
- Destetar varias crías: seleccionarlas en Crías → Destetar → elegir el destino. Cada destete pasa por el sistema de movimientos y puede deshacerse desde Registros si no hay cambios posteriores.
- El color del botón comunica urgencia: transparente cuando faltan muchos días, verde cuando faltan pocos días, amarillo cuando se venció hace poco y rojo cuando lleva mucho tiempo vencido. La columna Destete conserva ordenamiento.

RECORDATORIOS:
- Crear recordatorio: [Recordatorios](/?dashboard-main=recordatorios) → botón "Nuevo recordatorio" → ingresar título, descripción, fecha y animales asociados (opcional) → Guardar.

REGISTROS:
- Crear un registro general: [Registros](/?dashboard-main=registros) o [Animales](/?dashboard-main=animales) → botón "Nuevo Registro" → seleccionar animales → elegir el tipo → completar el formulario → Guardar. Se abre en modal, no redirige a otra página.
- Crear un registro para un animal: abrir sus detalles → Registros → "+ Nuevo registro". Se abre el mismo modal con el animal preseleccionado.
- Consultar historial: abrir los detalles del animal → Registros → elegir Todos, Peso, Salud, Nota, Parto o Leche.
- Deshacer: abrir el detalle de un movimiento reversible → "Deshacer movimiento". Si hay cambios posteriores, explicar que deben deshacerse primero. Un registro antiguo puede no incluir reversión segura.

RESPALDO:
- Exportar/restaurar datos: [Granja](/?dashboard-main=granja) → pestaña "Respaldo" → botón "Exportar" o "Restaurar".
${CURRENT_DOMAIN_RULES}`,
          },
          {
            role: 'user',
            content: JSON.stringify({
              granja: farmName,
              hoy: new Date().toISOString().slice(0, 10),
              historial: history,
              contexto: context,
              mensaje: message,
            }),
          },
        ],
      }),
    })
  } catch (error) {
    console.error(
      'AI provider network error:',
      provider,
      error instanceof Error ? error.name : 'unknown',
    )
    throw new Error(
      diagnosticErrors && error instanceof Error
        ? `${provider}: ${error.message}`
        : 'No pude comunicarme con el asistente. Revisa tu conexión e intenta de nuevo.',
    )
  }

  if (!res.ok) {
    const providerError = await res.json().catch(() => null)
    console.error(
      'AI provider response error:',
      provider,
      res.status,
      providerError?.error?.code || '',
    )
    const providerMessage = providerError?.error?.message
    const providerCode = providerError?.error?.code
    if (diagnosticErrors) {
      const rateLimitDetails = [
        ['límite de solicitudes', res.headers.get('x-ratelimit-limit-requests')],
        ['solicitudes restantes', res.headers.get('x-ratelimit-remaining-requests')],
        ['reinicio', res.headers.get('x-ratelimit-reset-requests')],
        ['reintentar después', res.headers.get('retry-after')],
      ]
        .filter((entry): entry is [string, string] => Boolean(entry[1]))
        .map(([label, value]) => `${label}: ${value}`)
      const details = [
        `${provider} respondió HTTP ${res.status}`,
        typeof providerCode === 'string' || typeof providerCode === 'number'
          ? `código ${providerCode}`
          : '',
        typeof providerMessage === 'string' ? providerMessage : '',
        ...rateLimitDetails,
      ].filter(Boolean)
      throw new Error(details.join(' · '))
    }
    if (res.status === 402) {
      throw new Error('El asistente no tiene crédito disponible. Contacta al administrador.')
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error('La conexión del asistente necesita ser revisada por el administrador.')
    }
    if (res.status === 429) {
      throw new Error(
        'El asistente está ocupado en este momento. Intenta de nuevo en unos segundos.',
      )
    }
    throw new Error(
      typeof providerMessage === 'string' && providerMessage.trim()
        ? providerMessage
        : 'El asistente no pudo responder. Intenta nuevamente.',
    )
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error(`${provider} no devolvió contenido`)

  let raw: unknown
  try {
    raw = typeof content === 'string' ? JSON.parse(content) : content
  } catch {
    throw new Error(
      'La IA devolvió una respuesta incompleta. Intenta de nuevo con una frase más corta.',
    )
  }

  return { parsed: aiModelResponseSchema.parse(raw), model, provider, usage: data.usage }
}

export async function callAiProvider({
  message,
  farmName,
  context,
  history = [],
  diagnostics = false,
}: {
  message: string
  farmName: string
  context: unknown
  history?: { role: 'user' | 'assistant'; text: string }[]
  diagnostics?: boolean
}): Promise<{
  parsed: AiModelResponse
  model: string
  provider: AiProvider
  usage?: unknown
  attempts?: AiProviderAttempt[]
}> {
  const firestore = getAdminFirestore()
  const config = await getAiModelConfig(firestore)
  const attempts: string[] = []
  const detailedAttempts: AiProviderAttempt[] = []

  for (const provider of getEnabledProviderOrder(config)) {
    const model = config.providers[provider].model
    const apiKey = await resolveAiApiKey(firestore, provider)
    if (!apiKey) {
      attempts.push(`${provider}: sin API key`)
      detailedAttempts.push({ provider, model, status: 'error', error: 'Sin API key' })
      continue
    }
    try {
      const result = await callProviderOnce({
        provider,
        apiKey,
        model,
        message,
        farmName,
        context,
        history,
        diagnosticErrors: diagnostics,
      })
      detailedAttempts.push({ provider, model, status: 'success' })
      return { ...result, ...(diagnostics ? { attempts: detailedAttempts } : {}) }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'error desconocido'
      attempts.push(`${provider}: ${message}`)
      detailedAttempts.push({ provider, model, status: 'error', error: message })
    }
  }

  console.error('Todos los proveedores de IA fallaron:', attempts.join(' | '))
  if (diagnostics && detailedAttempts.length > 0) {
    throw new AiProviderChainError(detailedAttempts)
  }
  throw new Error(
    attempts.length === 0
      ? 'No hay proveedores de IA habilitados.'
      : 'El asistente no está disponible. El administrador debe revisar sus proveedores.',
  )
}

const ANIMAL_LIST_SYSTEM_PROMPT = `Eres un lector de listas de aretes para Mi Granja.

Analiza todas las imágenes y transcribe únicamente los números o identificadores de arete que aparezcan en listas manuscritas o impresas. Cada renglón o elemento es un item y debes conservar duplicados porque la cantidad de renglones importa.

Reglas:
- No inventes animales ni completes una lista con datos que no se vean.
- t es la transcripción del arete conservando letras, números y separadores visibles. No completes caracteres dudosos.
- c es high, medium o low según la legibilidad.
- i es el índice de imagen empezando en 0. Solo transcribe los aretes; no devuelvas coordenadas ni recortes.
- Si una marca no parece un arete, omítela.
- Si una imagen no contiene aretes legibles, devuelve cero items y explica brevemente por qué en notes.
- Devuelve como máximo 150 items y mantén notes muy breve.
- Responde con JSON compacto, sin sangría ni saltos de línea: {"items":[{"t":"147A","c":"high","i":0}],"notes":""}. No repitas un arete salvo que realmente aparezca otra vez en la foto.`

async function callAnimalListProviderOnce({
  provider,
  apiKey,
  model,
  images,
}: {
  provider: AiProvider
  apiKey: string
  model: string
  images: string[]
}): Promise<{
  parsed: AnimalListAiResponse
  model: string
  provider: AiProvider
  usage?: unknown
}> {
  let res: Response
  try {
    res = await fetch(PROVIDER_ENDPOINTS[provider], {
      method: 'POST',
      signal: AbortSignal.timeout(120_000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(provider === 'openrouter'
          ? {
              'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://dashboard.migranja.app',
              'X-Title': 'Mi Granja',
            }
          : {}),
      },
      body: JSON.stringify({
        model,
        ...(provider === 'kimi'
          ? {
              max_tokens: 16000,
              response_format: { type: 'json_object' },
            }
          : {
              max_completion_tokens: 16000,
              ...(provider === 'openrouter' && model.startsWith('google/gemini-2.5-')
                ? { reasoning: { max_tokens: 1024, exclude: true } }
                : {}),
              response_format: {
                type: 'json_schema',
                json_schema: {
                  name: 'mi_granja_animal_list_response',
                  strict: true,
                  schema: animalListResponseSchema,
                },
              },
            }),
        messages: [
          { role: 'system', content: ANIMAL_LIST_SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Lee los aretes de todas las imágenes adjuntas y conserva el orden de lectura de cada imagen.',
              },
              ...images.map((url) => ({
                type: 'image_url',
                image_url: { url },
              })),
            ],
          },
        ],
      }),
    })
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw error
    }
    throw new Error(
      'No pude comunicarme con el lector de imágenes. Intenta de nuevo en unos momentos.',
    )
  }

  if (!res.ok) {
    const providerError = await res.json().catch(() => null)
    const providerMessage = providerError?.error?.message
    if (res.status === 402) {
      throw new Error('El asistente no tiene crédito disponible. Contacta al administrador.')
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error('La conexión del asistente necesita ser revisada por el administrador.')
    }
    if (res.status === 429) {
      throw new Error('El lector de imágenes está ocupado. Intenta de nuevo en unos segundos.')
    }
    throw new Error(
      typeof providerMessage === 'string' && providerMessage.trim()
        ? providerMessage
        : 'El lector de imágenes no pudo responder. Intenta nuevamente.',
    )
  }

  const data = await res.json()
  const choice = data.choices?.[0]
  const content = choice?.message?.content
  if (!content) {
    // Log only response metadata, never the images, credentials or reasoning text.
    console.error('Animal list returned no content', {
      provider,
      model,
      responseId: data.id,
      finishReason: choice?.finish_reason,
      nativeFinishReason: choice?.native_finish_reason,
      errorCode: data.error?.code,
      completionTokens: data.usage?.completion_tokens,
      reasoningTokens: data.usage?.completion_tokens_details?.reasoning_tokens,
    })
    throw new Error(
      `El modelo ${model} terminó sin generar la lista (motivo: ${choice?.finish_reason || data.error?.code || 'no informado'}). Intenta analizar una imagen a la vez.`,
    )
  }

  return {
    parsed: parseAnimalListResponse(content, choice?.finish_reason, images.length),
    model,
    provider,
    usage: data.usage,
  }
}

export async function callAiAnimalListProvider({ images }: { images: string[] }): Promise<{
  parsed: AnimalListAiResponse
  model: string
  provider: AiProvider
  usage?: unknown
}> {
  const firestore = getAdminFirestore()
  const config = await getAiModelConfig(firestore)
  const provider = config.primaryProvider
  const model =
    (provider === 'openrouter' ? process.env.OPENROUTER_ANIMAL_LIST_MODEL?.trim() : '') ||
    config.providers[provider].model
  const apiKey = await resolveAiApiKey(firestore, provider)
  if (!config.providers[provider].enabled || !apiKey) {
    throw new AiProviderChainError([
      {
        provider,
        model,
        status: 'error',
        error: !apiKey ? 'Sin API key' : 'Proveedor principal deshabilitado',
      },
    ])
  }

  try {
    return await callAnimalListProviderOnce({ provider, apiKey, model, images })
  } catch (error) {
    const timedOut =
      error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
    const message = timedOut
      ? 'La lectura tardó más de dos minutos. Prueba con una imagen a la vez. No se realizó ningún reintento automático.'
      : error instanceof Error
        ? error.message
        : 'error desconocido'
    console.error('Proveedor principal falló al leer la lista:', `${provider}: ${message}`)
    throw new AiProviderChainError([{ provider, model, status: 'error', error: message }])
  }
}
