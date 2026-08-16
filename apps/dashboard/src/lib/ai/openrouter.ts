import { getAdminFirestore } from '@/lib/firebase-admin'
import { type AiProvider, getAiModelConfig, getEnabledProviderOrder } from './model-config'
import { resolveAiApiKey } from './provider-credentials'
import { AiModelResponse, aiModelResponseSchema } from './types'

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    kind: { enum: ['message', 'needs_clarification'] },
    message: { type: 'string' },
  },
  required: ['kind', 'message'],
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

FLUJOS NUEVOS:
- Nuevo animal: [Animales](/?dashboard-main=animales) → botón "Nuevo animal +" → formulario simple. Los datos esenciales son especie, estado, género y etapa/condición; los demás son opcionales o aparecen según el destino.
- Madre/Lechera: [Madres / Lecheras](/?dashboard-main=animales&animals-section=etapas&animals-etapas=crias_lactantes) muestra hembras con lactancia activa, incluso si también están gestantes.
- Registrar ordeño: en Madre/Lechera → acción "Leche" → fecha, litros, turno y notas → Guardar. La fecha no puede ser posterior a hoy.
- Consultar ordeños: detalle del animal → Registros → tab "Leche". También aparecen dentro de "Todos".
- Finalizar lactancia: acción "Leche" → "Finalizar lactancia". La hembra deja Madre/Lechera y el historial se conserva. Si aún tiene crías activas sin destetar, primero deben registrarse sus destetes.
- Registrar parto crea las crías y abre una nueva lactancia de la madre. Cada gestación solo muestra las crías de ese parto; partos anteriores permanecen únicamente en el historial.
`

const PROVIDER_ENDPOINTS: Record<AiProvider, string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  kimi: 'https://api.moonshot.ai/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
}

async function callProviderOnce({
  provider,
  apiKey,
  model,
  message,
  farmName,
  context,
  history = [],
}: {
  provider: AiProvider
  apiKey: string
  model: string
  message: string
  farmName: string
  context: unknown
  history?: { role: 'user' | 'assistant'; text: string }[]
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
        max_completion_tokens: 1200,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'mi_granja_ai_response',
            strict: true,
            schema: responseSchema,
          },
        },
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
- Agregar animal nuevo: [Animales](/?dashboard-main=animales) → botón verde "+" (esquina superior derecha) → llenar formulario con arete, especie, sexo, etapa, raza y fecha de nacimiento → Guardar.
- Editar animal: En la lista → clic en el arete del animal → icono de editar → modificar datos → Guardar.
- Cambiar etapa: En el detalle del animal → botón "Cambiar etapa" → seleccionar nueva etapa.
- Registrar venta: En el detalle del animal → opción "Registrar venta" → ingresar precio y fecha.
- Registrar una baja: En el detalle del animal → "Dar de baja". Para muerte, indicar causa, fecha y descripción; para venta, completar fecha, precio y peso.

EMPADRE (MONTA):
- Crear empadre: [Animales > Etapas > Empadre](/?dashboard-main=animales&animals-section=etapas&animals-etapas=empadre) → botón "Nuevo empadre" → seleccionar macho → agregar hembras → indicar fecha de inicio → Guardar.
- Agregar hembra a empadre existente: En la tarjeta del empadre → botón "Agregar hembra" → buscar y seleccionar.
- Confirmar gestación desde Empadre: En el empadre → en la hembra → botón "Confirmar gestación" → seleccionar la hembra. La app usa automáticamente la fecha de inicio del empadre como referencia de la gestación y para calcular el parto esperado.
- Registrar gestación desde Gestantes: [Ver Gestantes](/?dashboard-main=animales&animals-section=etapas&animals-etapas=embarazos) → botón "Registrar gestación" en el encabezado → se abre el modal de confirmar gestación del primer empadre pendiente → elegir hembras → Guardar. Si no hay hembras pendientes, el botón sigue visible y muestra un aviso: no hay hembras en reproducción pendientes; para registrar otra gestación primero se crea un empadre.
- Quitar hembra del empadre: En el empadre → en la hembra → botón "Sacar del empadre".

PARTOS:
- Registrar parto desde la fila: [Ver Gestantes](/?dashboard-main=animales&animals-section=etapas&animals-etapas=embarazos) → en la hembra gestante → botón "Parto" → ingresar fecha, arete, sexo y peso de cada cría → Guardar. El sistema crea automáticamente los animales de las crías.
- Registrar parto desde selector: [Ver Gestantes](/?dashboard-main=animales&animals-section=etapas&animals-etapas=embarazos) → botón "Registrar parto" en el encabezado → se abre un selector simple de partos previstos ordenado por urgencia → elegir hembra → botón "Registrar" → llenar el modal de parto → Guardar. Si no hay partos previstos, el modal indica que primero debe confirmarse una gestación desde un empadre.
- Si el usuario pregunta "qué partos puedo registrar", usa contexto.reproductiveFlows.registrarParto.proximosPartos y menciona hembra, macho, empadre y fecha esperada sin mostrar IDs internos.

DESTETE:
- Destetar crías: [Ver Crías](/?dashboard-main=animales&animals-section=etapas&animals-etapas=cria) → seleccionar crías → botón "Destetar" → elegir si van a engorda o reproductor.

RECORDATORIOS:
- Crear recordatorio: [Recordatorios](/?dashboard-main=recordatorios) → botón "Nuevo recordatorio" → ingresar título, descripción, fecha y animales asociados (opcional) → Guardar.

REGISTROS DE SALUD:
- Agregar vacuna/tratamiento/nota/peso: En el detalle del animal → sección "Registros" → botón "Agregar registro" → elegir tipo → llenar datos → Guardar.

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
    throw new Error('No pude comunicarme con el asistente. Revisa tu conexión e intenta de nuevo.')
  }

  if (!res.ok) {
    const providerError = await res.json().catch(() => null)
    console.error(
      'AI provider response error:',
      provider,
      res.status,
      providerError?.error?.code || '',
    )
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
    throw new Error('El asistente no pudo responder. Intenta nuevamente.')
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
}: {
  message: string
  farmName: string
  context: unknown
  history?: { role: 'user' | 'assistant'; text: string }[]
}): Promise<{ parsed: AiModelResponse; model: string; provider: AiProvider; usage?: unknown }> {
  const firestore = getAdminFirestore()
  const config = await getAiModelConfig(firestore)
  const attempts: string[] = []

  for (const provider of getEnabledProviderOrder(config)) {
    const apiKey = await resolveAiApiKey(firestore, provider)
    if (!apiKey) {
      attempts.push(`${provider}: sin API key`)
      continue
    }
    try {
      return await callProviderOnce({
        provider,
        apiKey,
        model: config.providers[provider].model,
        message,
        farmName,
        context,
        history,
      })
    } catch (error) {
      attempts.push(`${provider}: ${error instanceof Error ? error.message : 'error desconocido'}`)
    }
  }

  console.error('Todos los proveedores de IA fallaron:', attempts.join(' | '))
  throw new Error(
    attempts.length === 0
      ? 'No hay proveedores de IA habilitados.'
      : 'El asistente no está disponible. El administrador debe revisar sus proveedores.',
  )
}
