import { getAdminFirestore } from '@/lib/firebase-admin'
import { getAiBillingPolicy } from './billing-policy'

export const AI_MONTHLY_INTERNAL_USD = 1
export const AI_CREDIT_MULTIPLIER = 5

/** Un pago por ciclo; no acumula regalos ni vuelve a abonar webhooks repetidos. */
export async function grantPaidAiCredits(input: {
  userId: string
  tierId: string
  subscriptionId: string
  invoiceId: string
  periodStart: number
  periodEnd: number
}) {
  const policy = await getAiBillingPolicy()
  if (input.tierId !== policy.paidTierId) return
  const db = getAdminFirestore()
  const wallet = db.doc(`aiCreditWallets/${input.userId}`)
  const grant = wallet.collection('grants').doc(`${input.subscriptionId}_${input.periodStart}`)
  await db.runTransaction(async (tx) => {
    const [previousGrant, current] = await Promise.all([tx.get(grant), tx.get(wallet)])
    if (previousGrant.exists) return
    const previous = current.data()
    tx.set(grant, {
      ...input,
      internalUsd: policy.monthlyInternalUsd,
      creditUsd: policy.monthlyCreditUsd,
    })
    if (previous && Number(previous.periodStart) >= input.periodStart) return
    // Mantener una consulta en curso del ciclo anterior identificada hasta contabilizarla.
    tx.set(wallet, {
      ...input,
      internalAllowanceUsd: policy.monthlyInternalUsd,
      creditAllowanceUsd: policy.monthlyCreditUsd,
      internalSpentUsd: 0,
      needsReconciliation: false,
      inFlight: previous?.inFlight ?? null,
      updatedAt: new Date().toISOString(),
    })
  })
}

export function actualProviderCostUsd(usage: unknown): number | undefined {
  if (!usage || typeof usage !== 'object') return undefined
  const data = usage as Record<string, any>
  const valid = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0
  const cost = [data.cost, data.total_cost, data.totalCost].find(valid)
  const upstream = data.cost_details?.upstream_inference_cost
  if (data.is_byok === true) return valid(upstream) && valid(cost) ? upstream + cost : undefined
  return valid(cost) ? cost : undefined
}
