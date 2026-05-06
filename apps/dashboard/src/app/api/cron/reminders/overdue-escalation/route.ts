import { type NextRequest, NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/cron-auth'
import { sendPushToUser } from '@/lib/fcm-admin'
import { getAdminFirestore } from '@/lib/firebase-admin'
import type { NotificationPreferences, Reminder } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 300

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

function toDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (
    typeof value === 'object' &&
    'toDate' in (value as object) &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate()
  }
  return null
}

function getRecipientIds(r: Reminder): string[] {
  if (r.assigneeIds && r.assigneeIds.length > 0) return r.assigneeIds
  return [r.farmerId]
}

/**
 * Escalado overdue: reminders no completados con dueDate < now-7d
 * que no fueron escalados en los últimos 7 días → push extra al destinatario.
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request)
  if (authError) return authError

  const db = getAdminFirestore()
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS_MS)

  const snap = await db
    .collection('reminders')
    .where('completed', '==', false)
    .where('dueDate', '<', sevenDaysAgo)
    .get()

  // Filtrar los que ya fueron escalados hace menos de 7 días
  const eligible: Reminder[] = []
  for (const docSnap of snap.docs) {
    const data = docSnap.data() as Reminder
    const last = toDate(data.lastOverdueNotifiedAt)
    if (last && now.getTime() - last.getTime() < SEVEN_DAYS_MS) continue
    eligible.push({ ...data, id: docSnap.id })
  }

  // Agrupar por destinatario
  const byUser = new Map<string, Reminder[]>()
  for (const r of eligible) {
    for (const userId of getRecipientIds(r)) {
      const list = byUser.get(userId) ?? []
      list.push(r)
      byUser.set(userId, list)
    }
  }

  let pushesSent = 0
  const updatedIds = new Set<string>()

  await Promise.all(
    Array.from(byUser.entries()).map(async ([userId, list]) => {
      const prefsSnap = await db.collection('notificationPreferences').doc(userId).get()
      const prefs = prefsSnap.data() as Partial<NotificationPreferences> | undefined
      if (!prefs?.pushEnabled || !Array.isArray(prefs.fcmTokens) || prefs.fcmTokens.length === 0) {
        return
      }

      const count = list.length
      const title = `${count} recordatorio${count > 1 ? 's' : ''} con más de 7 días atrasados`
      const body = list
        .slice(0, 3)
        .map((r) => r.title)
        .join(' · ')

      const { success } = await sendPushToUser(userId, prefs.fcmTokens, {
        title,
        body,
        url: '/?dashboard-main=recordatorios',
      })
      pushesSent += success
      for (const r of list) updatedIds.add(r.id)
    }),
  )

  const ids = Array.from(updatedIds)
  for (let i = 0; i < ids.length; i += 500) {
    const batch = db.batch()
    for (const id of ids.slice(i, i + 500)) {
      batch.update(db.collection('reminders').doc(id), { lastOverdueNotifiedAt: now })
    }
    await batch.commit()
  }

  return NextResponse.json({
    ok: true,
    overdueRemindersFound: eligible.length,
    recipientCount: byUser.size,
    pushesSent,
    remindersFlagged: ids.length,
    timestamp: now.toISOString(),
  })
}
