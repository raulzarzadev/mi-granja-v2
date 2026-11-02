import { getAdminFirestore } from '@/lib/firebase-admin'
import { parseAnimalListResponse } from './animal-list-response'
import {
  type AiProvider,
  aiProviderRouting,
  getAiModelConfig,
  getEnabledProviderOrder,
} from './model-config'
import {
  type OperationalModelResponse,
  operationalResponseJsonSchema,
  parseOperationalModelResponse,
} from './model-response'
import { resolveAiApiKey } from './provider-credentials'
import { buildOperationalSystemPrompt } from './system-prompt'
import { AnimalListAiResponse } from './types'

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
}): Promise<{
  parsed: OperationalModelResponse
  model: string
  provider: AiProvider
  usage?: unknown
}> {
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
        ...aiProviderRouting(provider, model),
        ...(provider === 'kimi'
          ? {
              max_tokens: 3000,
              response_format: { type: 'json_object' },
            }
          : {
              max_completion_tokens: 3000,
              response_format: {
                type: 'json_schema',
                json_schema: {
                  name: 'mi_granja_ai_response',
                  strict: true,
                  schema: operationalResponseJsonSchema,
                },
              },
            }),
        messages: [
          {
            role: 'system',
            content: buildOperationalSystemPrompt(),
          },
          {
            role: 'user',
            content: JSON.stringify({
              granja: farmName,
              fechaLocal:
                context && typeof context === 'object' && 'index' in context
                  ? (context as { index?: { localDate?: string } }).index?.localDate
                  : undefined,
              zonaHoraria:
                context && typeof context === 'object' && 'index' in context
                  ? (context as { index?: { timeZone?: string } }).index?.timeZone
                  : undefined,
              historial: history,
              conocimiento: context,
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

  return { parsed: parseOperationalModelResponse(raw), model, provider, usage: data.usage }
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
  parsed: OperationalModelResponse
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
        ...aiProviderRouting(provider, model),
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
