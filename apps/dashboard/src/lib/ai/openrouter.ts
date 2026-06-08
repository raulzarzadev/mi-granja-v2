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

export async function callOpenRouter({
  message,
  farmName,
  context,
  history = [],
}: {
  message: string
  farmName: string
  context: unknown
  history?: { role: 'user' | 'assistant'; text: string }[]
}): Promise<{ parsed: AiModelResponse; model: string; usage?: unknown }> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('Falta OPENROUTER_API_KEY')

  const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash'
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://dashboard.migranja.app',
      'X-Title': 'Mi Granja',
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 1200,
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

IMPORTANTE: Cuando menciones una sección de la app, incluye un enlace de navegación en formato markdown [Nombre](/?params). La app es SPA con una sola página "/", la navegación usa query params. URLs disponibles:
- [Animales](/?dashboard-main=animales) — lista de animales
- [Animales > Etapas](/?dashboard-main=animales&animals-section=etapas) — sub-tabs por etapa
- [Ver Empadres](/?dashboard-main=animales&animals-section=etapas&animals-etapas=empadre) — hembras en monta
- [Ver Embarazadas](/?dashboard-main=animales&animals-section=etapas&animals-etapas=embarazos) — hembras preñadas; contiene los botones "Registrar parto" y "Registrar embarazo"
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
- Registrar muerte: En el detalle del animal → opción "Registrar muerte" → indicar causa y fecha.

EMPADRE (MONTA):
- Crear empadre: [Animales > Etapas > Empadre](/?dashboard-main=animales&animals-section=etapas&animals-etapas=empadre) → botón "Nuevo empadre" → seleccionar macho → agregar hembras → indicar fecha de inicio → Guardar.
- Agregar hembra a empadre existente: En la tarjeta del empadre → botón "Agregar hembra" → buscar y seleccionar.
- Confirmar embarazo desde Empadre: En el empadre → en la hembra → botón "Confirmar embarazo" → indicar fecha.
- Registrar embarazo desde Embarazos: [Ver Embarazadas](/?dashboard-main=animales&animals-section=etapas&animals-etapas=embarazos) → botón "Registrar embarazo" en el encabezado → se abre el modal de confirmar embarazo del primer empadre pendiente → elegir hembras → indicar fecha de confirmación → Guardar. Si no hay hembras pendientes, el botón sigue visible y muestra un aviso: no hay hembras en reproducción pendientes; para registrar otro embarazo primero se crea un empadre.
- Quitar hembra del empadre: En el empadre → en la hembra → botón "Sacar del empadre".

PARTOS:
- Registrar parto desde la fila: [Ver Embarazadas](/?dashboard-main=animales&animals-section=etapas&animals-etapas=embarazos) → en la hembra embarazada → botón "Parto" → ingresar fecha, arete, sexo y peso de cada cría → Guardar. El sistema crea automáticamente los animales de las crías.
- Registrar parto desde selector: [Ver Embarazadas](/?dashboard-main=animales&animals-section=etapas&animals-etapas=embarazos) → botón "Registrar parto" en el encabezado → se abre un selector simple de partos previstos ordenado por urgencia → elegir hembra → botón "Registrar" → llenar el modal de parto → Guardar. Si no hay partos previstos, el modal indica que primero debe confirmarse un embarazo desde un empadre.
- Si el usuario pregunta "qué partos puedo registrar", usa contexto.reproductiveFlows.registrarParto.proximosPartos y menciona hembra, macho, empadre y fecha esperada sin mostrar IDs internos.

DESTETE:
- Destetar crías: [Ver Crías](/?dashboard-main=animales&animals-section=etapas&animals-etapas=cria) → seleccionar crías → botón "Destetar" → elegir si van a engorda o reproductor.

RECORDATORIOS:
- Crear recordatorio: [Recordatorios](/?dashboard-main=recordatorios) → botón "Nuevo recordatorio" → ingresar título, descripción, fecha y animales asociados (opcional) → Guardar.

REGISTROS DE SALUD:
- Agregar vacuna/tratamiento/nota/peso: En el detalle del animal → sección "Registros" → botón "Agregar registro" → elegir tipo → llenar datos → Guardar.

RESPALDO:
- Exportar/restaurar datos: [Granja](/?dashboard-main=granja) → pestaña "Respaldo" → botón "Exportar" o "Restaurar".`,
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

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`OpenRouter error ${res.status}: ${text.slice(0, 180)}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenRouter no devolvió contenido')

  let raw: unknown
  try {
    raw = typeof content === 'string' ? JSON.parse(content) : content
  } catch {
    throw new Error(
      'La IA devolvió una respuesta incompleta. Intenta de nuevo con una frase más corta.',
    )
  }

  return { parsed: aiModelResponseSchema.parse(raw), model, usage: data.usage }
}
