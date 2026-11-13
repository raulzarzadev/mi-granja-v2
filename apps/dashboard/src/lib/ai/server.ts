import { randomUUID } from 'node:crypto'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { NextRequest, NextResponse } from 'next/server'
import { AuthenticatedUser, isAuthError, verifyBillingAuth } from '@/lib/billing-auth'
import { getAdminFirestore } from '@/lib/firebase-admin'
import { DEFAULT_PERMISSIONS } from '@/types/collaborators'
import { FarmPermission } from '@/types/farm'
import { getAiBillingPolicy } from './billing-policy'
import { AI_MONTHLY_INTERNAL_USD, actualProviderCostUsd } from './credits'
import type { AiProvider } from './model-config'
import { AiUsageResult } from './types'

export const AI_DAILY_LIMIT = 3

export async function requireAiAuth(
  request: NextRequest,
): Promise<AuthenticatedUser | NextResponse> {
  const auth = await verifyBillingAuth(request)
  if (isAuthError(auth)) return auth
  return auth
}

export function dateKey(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mazatlan',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

function usageNumber(usage: unknown, keys: string[]): number {
  if (!usage || typeof usage !== 'object') return 0
  for (const key of keys) {
    const value = (usage as Record<string, unknown>)[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  return 0
}

export function totalAiTokens(usage: unknown): number {
  return usageNumber(usage, ['total_tokens', 'totalTokens'])
}

export class AiQuotaError extends Error {
  constructor(
    message: string,
    public usage?: AiUsageResult,
  ) {
    super(message)
  }
}

function creditEligible(subscription: any, wallet: any) {
  return (
    subscription?.tierId === wallet?.tierId &&
    subscription?.status === 'active' &&
    wallet &&
    subscription.stripeSubscriptionId === wallet.subscriptionId &&
    Number(wallet.periodEnd) * 1000 > Date.now() &&
    Number(wallet.periodStart) * 1000 <= Date.now()
  )
}
function usageView(
  daily: any,
  subscription: any,
  wallet: any,
  dailyLimit = AI_DAILY_LIMIT,
): AiUsageResult {
  const used = Math.max(0, Number(daily?.count) || 0)
  if (creditEligible(subscription, wallet)) {
    const balance =
      (Math.max(
        0,
        (Number(wallet.internalAllowanceUsd) || AI_MONTHLY_INTERNAL_USD) -
          (Number(wallet.internalSpentUsd) || 0),
      ) *
        (Number(wallet.creditAllowanceUsd) || 5)) /
      (Number(wallet.internalAllowanceUsd) || 1)
    return {
      mode: 'credits',
      limit: Number(wallet.creditAllowanceUsd) || 5,
      used: (Number(wallet.creditAllowanceUsd) || 5) - balance,
      remaining: wallet.needsReconciliation ? 0 : balance,
      creditBalanceUsd: balance,
      allowed: balance > 0 && !wallet.needsReconciliation,
      totalTokens: Number(daily?.totalTokens) || 0,
    }
  }
  return {
    mode: 'daily',
    limit: dailyLimit,
    used,
    remaining: Math.max(0, dailyLimit - used),
    allowed: used < dailyLimit,
    totalTokens: Number(daily?.totalTokens) || 0,
    totalCost: Number(daily?.totalCost) || 0,
  }
}
export function aiQuotaMessage(usage?: AiUsageResult) {
  return usage?.mode === 'credits'
    ? 'Tus créditos de IA no están disponibles o se agotaron. Se renuevan con el próximo pago mensual del plan con créditos.'
    : `Ya usaste tus ${usage?.limit ?? AI_DAILY_LIMIT} consultas de IA hoy.`
}

/** Reserva antes de llamar al proveedor: cuota gratis atómica y una consulta pagada a la vez. */
export async function reserveAiUse(userId: string): Promise<string> {
  const policy = await getAiBillingPolicy()
  const db = getAdminFirestore(),
    id = randomUUID()
  const day = dateKey(),
    dailyRef = db.doc(`aiUsage/${userId}_${day}`),
    walletRef = db.doc(`aiCreditWallets/${userId}`)
  await db.runTransaction(async (tx) => {
    const [daily, sub, wallet] = await Promise.all([
      tx.get(dailyRef),
      tx.get(db.doc(`subscriptions/${userId}`)),
      tx.get(walletRef),
    ])
    const usage = usageView(daily.data(), sub.data(), wallet.data(), policy.freeDailyQueries)
    if (!usage.allowed) throw new AiQuotaError(aiQuotaMessage(usage), usage)
    const paid = usage.mode === 'credits'
    if (paid && wallet.data()?.inFlight)
      throw new AiQuotaError('Hay una consulta de IA en curso. Espera a que termine.', usage)
    if (
      !paid &&
      (Number(daily.data()?.count) || 0) + (Number(daily.data()?.reserved) || 0) >=
        policy.freeDailyQueries
    )
      throw new AiQuotaError(aiQuotaMessage(usage), usage)
    tx.set(db.doc(`aiUsageReservations/${id}`), {
      userId,
      day,
      mode: paid ? 'credits' : 'daily',
      periodStart: paid ? wallet.data()?.periodStart : null,
      status: 'pending',
      createdAt: new Date().toISOString(),
    })
    if (paid) tx.update(walletRef, { inFlight: id })
    else
      tx.set(dailyRef, { userId, dateKey: day, reserved: FieldValue.increment(1) }, { merge: true })
  })
  return id
}

export async function releaseAiUse(userId: string, id: string) {
  const db = getAdminFirestore(),
    ref = db.doc(`aiUsageReservations/${id}`),
    wallet = db.doc(`aiCreditWallets/${userId}`)
  await db.runTransaction(async (tx) => {
    const [snap, walletSnap] = await Promise.all([tx.get(ref), tx.get(wallet)])
    const data = snap.data()
    if (!data || data.userId !== userId || data.status !== 'pending') return
    tx.update(ref, { status: 'failed' })
    if (data.mode === 'daily')
      tx.set(
        db.doc(`aiUsage/${userId}_${data.day}`),
        { reserved: FieldValue.increment(-1) },
        { merge: true },
      )
    else if (walletSnap.data()?.inFlight === id)
      tx.update(wallet, { inFlight: null, needsReconciliation: true })
  })
}

export async function consumeDailyAiUse(
  userId: string,
  providerUsage?: unknown,
  providerMetadata?: { provider: AiProvider; model: string },
  reservationId?: string,
): Promise<AiUsageResult> {
  if (!reservationId) throw new Error('Reserva de IA requerida.')
  const policy = await getAiBillingPolicy()
  const db = getAdminFirestore(),
    reservationRef = db.doc(`aiUsageReservations/${reservationId}`),
    walletRef = db.doc(`aiCreditWallets/${userId}`)
  const tokens = usageNumber(providerUsage, ['total_tokens', 'totalTokens']),
    actualCost = actualProviderCostUsd(providerUsage)
  return db.runTransaction(async (tx) => {
    const [reservation, sub, wallet] = await Promise.all([
      tx.get(reservationRef),
      tx.get(db.doc(`subscriptions/${userId}`)),
      tx.get(walletRef),
    ])
    const r = reservation.data()
    if (!r || r.userId !== userId) throw new Error('Reserva de IA inválida.')
    const ref = db.doc(`aiUsage/${userId}_${r.day}`),
      snap = await tx.get(ref),
      daily = snap.data() ?? {}
    if (r.status === 'completed')
      return usageView(daily, sub.data(), wallet.data(), policy.freeDailyQueries)
    if (r.status !== 'pending') throw new Error('La reserva no está pendiente.')
    const next = {
      ...daily,
      count: (Number(daily.count) || 0) + 1,
      totalTokens: (Number(daily.totalTokens) || 0) + tokens,
      totalCost: (Number(daily.totalCost) || 0) + (actualCost ?? 0),
    }
    tx.set(
      ref,
      {
        userId,
        dateKey: r.day,
        count: next.count,
        totalTokens: next.totalTokens,
        totalCost: next.totalCost,
        ...(r.mode === 'daily' ? { reserved: FieldValue.increment(-1) } : {}),
        ...(actualCost === undefined ? { unreportedCostQueries: FieldValue.increment(1) } : {}),
        ...(providerMetadata
          ? {
              providerCounts: { [providerMetadata.provider]: FieldValue.increment(1) },
              modelCounts: {
                [`${providerMetadata.provider}:${providerMetadata.model}`]: FieldValue.increment(1),
              },
              lastProvider: providerMetadata.provider,
              lastModel: providerMetadata.model,
            }
          : {}),
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    )
    let nextWallet = wallet.data()
    if (r.mode === 'credits' && nextWallet?.inFlight === reservationId) {
      // Si cambió de ciclo, el gasto sigue en el ciclo al que se autorizó.
      const sameCycle = r.periodStart === nextWallet.periodStart
      const spent = (Number(nextWallet.internalSpentUsd) || 0) + (sameCycle ? (actualCost ?? 0) : 0)
      nextWallet = {
        ...nextWallet,
        inFlight: null,
        internalSpentUsd: spent,
        needsReconciliation: actualCost === undefined,
      }
      tx.update(walletRef, {
        inFlight: null,
        internalSpentUsd: spent,
        needsReconciliation: actualCost === undefined,
      })
    }
    tx.update(reservationRef, {
      status: 'completed',
      ...(actualCost === undefined ? {} : { actualCostUsd: actualCost }),
      totalTokens: tokens,
      completedAt: new Date().toISOString(),
    })
    return { ...usageView(next, sub.data(), nextWallet, policy.freeDailyQueries), allowed: true }
  })
}

export async function getDailyAiUsage(userId: string): Promise<AiUsageResult> {
  const policy = await getAiBillingPolicy()
  const db = getAdminFirestore()
  const [daily, sub, wallet] = await Promise.all([
    db.doc(`aiUsage/${userId}_${dateKey()}`).get(),
    db.doc(`subscriptions/${userId}`).get(),
    db.doc(`aiCreditWallets/${userId}`).get(),
  ])
  const usage = usageView(daily.data(), sub.data(), wallet.data(), policy.freeDailyQueries)
  if (usage.mode === 'credits') {
    return {
      ...usage,
      resetsAt: new Date(Number(wallet.data()?.periodEnd) * 1000).toISOString(),
      renewalCancelled: sub.data()?.cancelAtPeriodEnd === true,
    }
  }
  // La cuota usa America/Mazatlan (UTC−7, sin horario de verano).
  const nextReset = new Date(`${dateKey()}T07:00:00.000Z`)
  nextReset.setUTCDate(nextReset.getUTCDate() + 1)
  return { ...usage, resetsAt: nextReset.toISOString() }
}

export async function resolveFarmPermissions({
  farmId,
  userId,
  email,
}: {
  farmId: string
  userId: string
  email: string
}): Promise<{ farmName: string; timeZone?: string; permissions: FarmPermission[] } | null> {
  const firestore = getAdminFirestore()
  const farmSnap = await firestore.collection('farms').doc(farmId).get()
  if (!farmSnap.exists || farmSnap.data()?.deletedAt) return null

  const farm = farmSnap.data()!
  if (farm.ownerId === userId) {
    return {
      farmName: farm.name || 'Mi granja',
      timeZone: typeof farm.timeZone === 'string' ? farm.timeZone : undefined,
      permissions: [
        { module: 'animals', actions: ['create', 'read', 'update', 'delete'] },
        { module: 'breeding', actions: ['create', 'read', 'update', 'delete'] },
        { module: 'reminders', actions: ['create', 'read', 'update', 'delete'] },
        { module: 'areas', actions: ['create', 'read', 'update', 'delete'] },
        { module: 'collaborators', actions: ['create', 'read', 'update', 'delete'] },
        { module: 'reports', actions: ['create', 'read', 'update', 'delete'] },
      ],
    }
  }

  const inviteSnap = await firestore
    .collection('farmInvitations')
    .where('farmId', '==', farmId)
    .where('status', '==', 'accepted')
    .get()

  const invite = inviteSnap.docs
    .map((doc) => doc.data())
    .find((inv) => inv.userId === userId || inv.email?.toLowerCase() === email.toLowerCase())

  if (!invite) return null

  return {
    farmName: farm.name || 'Mi granja',
    timeZone: typeof farm.timeZone === 'string' ? farm.timeZone : undefined,
    permissions:
      invite.permissions ||
      DEFAULT_PERMISSIONS[invite.role as keyof typeof DEFAULT_PERMISSIONS] ||
      [],
  }
}

export function hasPermission(
  permissions: FarmPermission[],
  module: FarmPermission['module'],
  action: FarmPermission['actions'][number],
): boolean {
  return permissions.some(
    (permission) => permission.module === module && permission.actions.includes(action),
  )
}

export function forbidden(message = 'No tienes permiso para usar la IA en esta granja') {
  return NextResponse.json({ error: message }, { status: 403 })
}
