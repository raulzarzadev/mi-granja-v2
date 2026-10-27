import { ANALYTICS_EVENTS } from '@mi-granja/shared'
import { NextRequest, NextResponse } from 'next/server'
import { buildAiContext } from '@/lib/ai/actions'
import { callAiProvider } from '@/lib/ai/openrouter'
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

const QUERY_TYPE = 'chat'

export async function POST(request: NextRequest) {
  let userId: string | null = null
  try {
    const auth = await requireAiAuth(request)
    if (auth instanceof NextResponse) return auth
    userId = auth.uid

    const body = await request.json()
    const message = String(body.message || '').trim()
    const farmId = String(body.farmId || '').trim()
    const history = Array.isArray(body.history)
      ? body.history
          .slice(-30)
          .map((item: unknown) => {
            const value = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
            return {
              role: value.role === 'assistant' ? ('assistant' as const) : ('user' as const),
              text: String(value.text || '').slice(0, 2000),
            }
          })
          .filter((item: { text: string }) => item.text)
      : []
    if (!message) return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 })
    if (!farmId) return NextResponse.json({ error: 'Granja requerida' }, { status: 400 })

    const access = await resolveFarmPermissions({ farmId, userId: auth.uid, email: auth.email })
    if (!access) return forbidden()
    if (
      !hasPermission(access.permissions, 'animals', 'read') &&
      !hasPermission(access.permissions, 'reminders', 'read') &&
      !hasPermission(access.permissions, 'breeding', 'read')
    ) {
      return forbidden('No tienes permisos de lectura en esta granja')
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
    const context = await buildAiContext(farmId, message, {
      animals: hasPermission(access.permissions, 'animals', 'read'),
      reminders: hasPermission(access.permissions, 'reminders', 'read'),
      breeding: hasPermission(access.permissions, 'breeding', 'read'),
    })
    await captureServerEvent(auth.uid, ANALYTICS_EVENTS.ai_query_sent, {
      query_type: QUERY_TYPE,
      farm_id: farmId,
      history_length: history.length,
    })
    const startedAt = Date.now()
    const ai = await callAiProvider({ message, farmName: access.farmName, context, history })
    await captureServerEvent(auth.uid, ANALYTICS_EVENTS.ai_response_received, {
      query_type: QUERY_TYPE,
      farm_id: farmId,
      latency_ms: Date.now() - startedAt,
      tokens_used: totalAiTokens(ai.usage),
      model: ai.model,
      provider: ai.provider,
      response_kind: ai.parsed.kind,
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

    return NextResponse.json({
      ...ai.parsed,
      usage,
    })
  } catch (error) {
    console.error('AI chat error:', error)
    if (userId) {
      await captureServerEvent(userId, ANALYTICS_EVENTS.ai_query_failed, { query_type: QUERY_TYPE })
    }
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error procesando IA',
      },
      { status: 500 },
    )
  }
}
