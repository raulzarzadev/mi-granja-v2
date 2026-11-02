import { NextRequest, NextResponse } from 'next/server'
import { getAiBillingPolicy } from '@/lib/ai/billing-policy'
import { isAuthError, verifyBillingAuth } from '@/lib/billing-auth'

/** Proyección pública para clientes: nunca incluye presupuesto ni proporción internos. */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyBillingAuth(request)
    if (isAuthError(auth)) return auth
    const {
      freeDailyQueries,
      paidTierId,
      monthlyCreditUsd,
      ranchoMultiplier,
      empresarialMultiplier,
    } = await getAiBillingPolicy()
    return NextResponse.json({
      freeDailyQueries,
      paidTierId,
      monthlyCreditUsd,
      ranchoMultiplier: ranchoMultiplier ?? 4,
      empresarialMultiplier: empresarialMultiplier ?? 20,
    })
  } catch (error) {
    console.error('Error leyendo beneficios IA', error)
    return NextResponse.json({ error: 'No se pudieron cargar los límites de IA.' }, { status: 500 })
  }
}
