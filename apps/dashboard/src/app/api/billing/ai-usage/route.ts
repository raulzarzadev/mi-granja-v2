import { NextRequest, NextResponse } from 'next/server'
import { getDailyAiUsage } from '@/lib/ai/server'
import { isAuthError, resolveEffectiveUid, verifyBillingAuth } from '@/lib/billing-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyBillingAuth(request)
    if (isAuthError(auth)) return auth
    const usage = await getDailyAiUsage(resolveEffectiveUid(auth, request))
    // Solo créditos visibles del cliente, nunca costos ni presupuesto internos.
    return NextResponse.json(
      {
        mode: usage.mode ?? 'daily',
        resetsAt: usage.resetsAt ?? null,
        renewalCancelled: usage.renewalCancelled === true,
        limit: usage.limit,
        used: usage.used,
        remaining: usage.remaining,
        ...(usage.mode === 'credits' ? { balanceUsd: usage.creditBalanceUsd ?? 0 } : {}),
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (error) {
    console.error('Error consultando consumo IA', error)
    return NextResponse.json({ error: 'No se pudo cargar el consumo de IA.' }, { status: 500 })
  }
}
