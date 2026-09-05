import { createHash } from 'node:crypto'
import type { Firestore } from 'firebase-admin/firestore'

/** Durable, atomic limit shared by every server instance. No raw email/IP in document IDs. */
export async function consumeRequestLimit(
  db: Firestore,
  key: string,
  { maximum, windowMs, intervalMs = 0 }: { maximum: number; windowMs: number; intervalMs?: number },
  now = Date.now(),
): Promise<number> {
  const ref = db.collection('requestLimits').doc(createHash('sha256').update(key).digest('hex'))
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const data = snap.data()
    const active = data && data.windowEnd > now
    const count = active ? Number(data.count || 0) : 0
    const nextAllowedAt = Math.max(
      active && count >= maximum ? data.windowEnd : 0,
      data ? Number(data.lastAt || 0) + intervalMs : 0,
    )
    if (nextAllowedAt > now) return Math.ceil((nextAllowedAt - now) / 1000)
    tx.set(ref, {
      count: count + 1,
      windowEnd: active ? data.windowEnd : now + windowMs,
      lastAt: now,
    })
    return 0
  })
}
