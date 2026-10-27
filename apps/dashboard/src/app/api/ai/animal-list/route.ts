import { ANALYTICS_EVENTS } from '@mi-granja/shared'
import { NextRequest, NextResponse } from 'next/server'
import { AiProviderChainError, callAiAnimalListProvider } from '@/lib/ai/openrouter'
import {
  consumeDailyAiUse,
  forbidden,
  getDailyAiUsage,
  hasPermission,
  requireAiAuth,
  resolveFarmPermissions,
  totalAiTokens,
} from '@/lib/ai/server'
import { captureServerEvent } from '@/lib/analytics/posthog-server'
import { ANIMAL_LIST_READER_ENABLED } from '@/lib/animal-list-feature'

const MAX_IMAGES = 6
const MAX_IMAGE_DATA_LENGTH = 7_000_000
const IMAGE_DATA_URL = /^data:image\/(?:jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/

export const maxDuration = 150

const QUERY_TYPE = 'animal_list'

export async function POST(request: NextRequest) {
  if (!ANIMAL_LIST_READER_ENABLED) {
    return NextResponse.json(
      { error: 'El lector de imágenes está desactivado temporalmente.' },
      { status: 503 },
    )
  }
  let userId: string | null = null
  try {
    const auth = await requireAiAuth(request)
    if (auth instanceof NextResponse) return auth
    userId = auth.uid

    const body = await request.json()
    const farmId = String(body.farmId || '').trim()
    const rawImages: unknown = body.images
    const images = Array.isArray(rawImages)
      ? rawImages
          .map((image: unknown) => (typeof image === 'string' ? image.trim() : ''))
          .filter(Boolean)
      : []

    if (!farmId) return NextResponse.json({ error: 'Granja requerida' }, { status: 400 })
    if (images.length === 0) {
      return NextResponse.json({ error: 'Selecciona al menos una imagen' }, { status: 400 })
    }
    if (images.length > MAX_IMAGES) {
      return NextResponse.json(
        { error: `Puedes analizar hasta ${MAX_IMAGES} imágenes a la vez` },
        { status: 400 },
      )
    }
    if (
      images.some((image) => image.length > MAX_IMAGE_DATA_LENGTH || !IMAGE_DATA_URL.test(image))
    ) {
      return NextResponse.json(
        { error: 'Una imagen no tiene un formato compatible o es demasiado grande' },
        { status: 400 },
      )
    }

    const access = await resolveFarmPermissions({ farmId, userId: auth.uid, email: auth.email })
    if (!access) return forbidden()
    if (!hasPermission(access.permissions, 'animals', 'read')) {
      return forbidden('No tienes permiso para consultar animales en esta granja')
    }

    const currentUsage = await getDailyAiUsage(auth.uid)
    if (!currentUsage.isUnlimited && currentUsage.remaining <= 0) {
      await captureServerEvent(auth.uid, ANALYTICS_EVENTS.ai_limit_reached, {
        query_type: QUERY_TYPE,
        farm_id: farmId,
      })
      return NextResponse.json(
        { error: 'Ya usaste tus 3 consultas de IA hoy', usage: currentUsage },
        { status: 429 },
      )
    }

    await captureServerEvent(auth.uid, ANALYTICS_EVENTS.ai_query_sent, {
      query_type: QUERY_TYPE,
      farm_id: farmId,
      image_count: images.length,
    })
    const startedAt = Date.now()
    const ai = await callAiAnimalListProvider({ images })
    await captureServerEvent(auth.uid, ANALYTICS_EVENTS.ai_response_received, {
      query_type: QUERY_TYPE,
      farm_id: farmId,
      latency_ms: Date.now() - startedAt,
      tokens_used: totalAiTokens(ai.usage),
      model: ai.model,
      provider: ai.provider,
    })
    const usage = await consumeDailyAiUse(auth.uid, ai.usage, {
      provider: ai.provider,
      model: ai.model,
    })

    if (usage.allowed === false) {
      return NextResponse.json(
        { error: 'Ya usaste tus 3 consultas de IA hoy', usage },
        { status: 429 },
      )
    }

    return NextResponse.json({ ...ai.parsed, usage })
  } catch (error) {
    console.error('AI animal list error:', error)
    if (userId) {
      await captureServerEvent(userId, ANALYTICS_EVENTS.ai_query_failed, { query_type: QUERY_TYPE })
    }
    if (error instanceof AiProviderChainError) {
      const details = error.attempts
        .map((attempt) => `${attempt.provider}: ${attempt.error || 'falló'}`)
        .join(' · ')
      const developmentMessage =
        process.env.NODE_ENV === 'development'
          ? `El lector de imágenes no está disponible. ${details}`
          : 'El lector de imágenes no está disponible. El administrador debe revisar sus proveedores.'
      return NextResponse.json({ error: developmentMessage }, { status: 502 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error leyendo la lista de animales' },
      { status: 500 },
    )
  }
}
