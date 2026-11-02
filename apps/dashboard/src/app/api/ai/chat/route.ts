import { ANALYTICS_EVENTS } from '@mi-granja/shared'
import { NextRequest, NextResponse } from 'next/server'
import { runOperationalChat } from '@/lib/ai/chat-service'
import {
  consumeDailyAiUse,
  forbidden,
  getDailyAiUsage,
  hasPermission,
  requireAiAuth,
  resolveFarmPermissions,
  totalAiTokens,
} from '@/lib/ai/server'
import { resolveOperationTimeZone } from '@/lib/ai/time-zone'
import { captureServerEvent } from '@/lib/analytics/posthog-server'

const QUERY_TYPE = 'chat'

export async function POST(request: NextRequest) {
  let userId: string | null = null
  try {
    const auth = await requireAiAuth(request)
    if (auth instanceof NextResponse) return auth
    userId = auth.uid

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object' || Array.isArray(body))
      return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    const farmId = typeof body.farmId === 'string' ? body.farmId.trim() : ''
    const history = Array.isArray(body.history)
      ? body.history
          .slice(-30)
          .map((item: unknown) => {
            const value = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
            return {
              role: value.role === 'assistant' ? ('assistant' as const) : ('user' as const),
              text: typeof value.text === 'string' ? value.text.slice(0, 2000) : '',
              ...(value.role === 'assistant' &&
              typeof value.proposalId === 'string' &&
              /^[a-zA-Z0-9_-]{1,128}$/.test(value.proposalId)
                ? { proposalId: value.proposalId }
                : {}),
            }
          })
          .filter((item: { text: string }) => item.text)
      : []
    if (message.length > 4000)
      return NextResponse.json(
        { error: 'El mensaje debe tener como máximo 4,000 caracteres' },
        { status: 400 },
      )
    const conversationId = typeof body.conversationId === 'string' ? body.conversationId : ''
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(conversationId))
      return NextResponse.json({ error: 'Conversación requerida' }, { status: 400 })
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(farmId))
      return NextResponse.json({ error: 'Granja inválida' }, { status: 400 })
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
    const contextAccess = {
      animals: hasPermission(access.permissions, 'animals', 'read'),
      reminders: hasPermission(access.permissions, 'reminders', 'read'),
      breeding: hasPermission(access.permissions, 'breeding', 'read'),
    }
    const timeZone = resolveOperationTimeZone(access.timeZone, body.timeZone)
    await captureServerEvent(auth.uid, ANALYTICS_EVENTS.ai_query_sent, {
      query_type: QUERY_TYPE,
      farm_id: farmId,
      history_length: history.length,
    })
    const startedAt = Date.now()
    const ai = await runOperationalChat({
      message,
      farmId,
      userId: auth.uid,
      conversationId,
      farmName: access.farmName,
      permissions: access.permissions,
      timeZone,
      history,
      access: contextAccess,
    })
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
      kind: ai.parsed.kind,
      message: ai.parsed.message,
      proposal: ai.proposal,
      knowledge: ai.knowledge,
      usage,
    })
  } catch (error) {
    console.error('AI chat error:', error)
    if (userId) {
      await captureServerEvent(userId, ANALYTICS_EVENTS.ai_query_failed, { query_type: QUERY_TYPE })
    }
    return NextResponse.json(
      {
        error: 'No se pudo procesar tu consulta. Inténtalo de nuevo.',
      },
      { status: 500 },
    )
  }
}
