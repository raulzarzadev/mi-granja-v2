import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { NextRequest, NextResponse } from 'next/server'
import { AuthenticatedUser, isAuthError, verifyBillingAuth } from '@/lib/billing-auth'
import { getAdminFirestore } from '@/lib/firebase-admin'
import { DEFAULT_PERMISSIONS } from '@/types/collaborators'
import { FarmPermission } from '@/types/farm'
import type { AiProvider } from './model-config'
import { AiUsageResult } from './types'

const DAILY_LIMIT = 3
const isDev = process.env.NODE_ENV === 'development'

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

export async function consumeDailyAiUse(
  userId: string,
  providerUsage?: unknown,
  providerMetadata?: { provider: AiProvider; model: string },
): Promise<AiUsageResult> {
  const firestore = getAdminFirestore()
  const key = `${userId}_${dateKey()}`
  const ref = firestore.collection('aiUsage').doc(key)
  const tokens = usageNumber(providerUsage, ['total_tokens', 'totalTokens'])
  const cost = usageNumber(providerUsage, ['cost', 'total_cost', 'totalCost'])

  return firestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const current = snap.exists ? Number(snap.data()?.count || 0) : 0
    if (!isDev && current >= DAILY_LIMIT) {
      return { limit: DAILY_LIMIT, used: current, remaining: 0, allowed: false }
    }
    const next = current + 1
    tx.set(
      ref,
      {
        userId,
        dateKey: dateKey(),
        count: next,
        ...(tokens > 0 ? { totalTokens: FieldValue.increment(tokens) } : {}),
        ...(cost > 0 ? { totalCost: FieldValue.increment(cost) } : {}),
        ...(providerMetadata
          ? {
              providerCounts: {
                [providerMetadata.provider]: FieldValue.increment(1),
              },
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
    const previousTokens = Number(snap.data()?.totalTokens || 0)
    const previousCost = Number(snap.data()?.totalCost || 0)
    return {
      limit: isDev ? Number.MAX_SAFE_INTEGER : DAILY_LIMIT,
      used: next,
      remaining: isDev ? Number.MAX_SAFE_INTEGER : DAILY_LIMIT - next,
      allowed: true,
      totalTokens: previousTokens + tokens,
      totalCost: previousCost + cost,
      isUnlimited: isDev,
    }
  })
}

export async function getDailyAiUsage(userId: string): Promise<AiUsageResult> {
  const firestore = getAdminFirestore()
  const snap = await firestore.collection('aiUsage').doc(`${userId}_${dateKey()}`).get()
  const used = snap.exists ? Number(snap.data()?.count || 0) : 0
  const totalTokens = snap.exists ? Number(snap.data()?.totalTokens || 0) : 0
  const totalCost = snap.exists ? Number(snap.data()?.totalCost || 0) : 0
  return {
    limit: isDev ? Number.MAX_SAFE_INTEGER : DAILY_LIMIT,
    used,
    remaining: isDev ? Number.MAX_SAFE_INTEGER : Math.max(DAILY_LIMIT - used, 0),
    totalTokens,
    totalCost,
    isUnlimited: isDev,
  }
}

export async function resolveFarmPermissions({
  farmId,
  userId,
  email,
}: {
  farmId: string
  userId: string
  email: string
}): Promise<{ farmName: string; permissions: FarmPermission[] } | null> {
  const firestore = getAdminFirestore()
  const farmSnap = await firestore.collection('farms').doc(farmId).get()
  if (!farmSnap.exists || farmSnap.data()?.deletedAt) return null

  const farm = farmSnap.data()!
  if (farm.ownerId === userId) {
    return {
      farmName: farm.name || 'Mi granja',
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
