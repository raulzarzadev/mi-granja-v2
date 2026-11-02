import { z } from 'zod'
import { getAdminFirestore } from '@/lib/firebase-admin'

export const AI_BILLING_POLICY_DOCUMENT = 'settings/aiBilling'
export const aiBillingPolicySchema = z.object({
  freeDailyQueries: z.number().int().min(0).max(100),
  paidTierId: z.enum(['inicial', 'basico', 'pro', 'rancho', 'empresarial']),
  monthlyCreditUsd: z.number().positive().max(10000),
  monthlyInternalUsd: z.number().positive().max(10000),
})
export type AiBillingPolicy = z.infer<typeof aiBillingPolicySchema>
export const DEFAULT_AI_BILLING_POLICY: AiBillingPolicy = {
  freeDailyQueries: 3,
  paidTierId: 'pro',
  monthlyCreditUsd: 5,
  monthlyInternalUsd: 1,
}
export async function getAiBillingPolicy(): Promise<AiBillingPolicy> {
  const snapshot = await getAdminFirestore().doc(AI_BILLING_POLICY_DOCUMENT).get()
  if (!snapshot.exists) return DEFAULT_AI_BILLING_POLICY
  // Una configuración guardada inválida no debe abrir gasto ilimitado.
  return aiBillingPolicySchema.parse(snapshot.data()?.policy)
}
