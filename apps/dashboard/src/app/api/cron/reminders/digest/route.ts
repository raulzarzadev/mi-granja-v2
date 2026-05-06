import { type NextRequest, NextResponse } from 'next/server'
import { sendBrevoEmail } from '@/lib/brevo'
import { verifyCronAuth } from '@/lib/cron-auth'
import { buildReminderDigestEmail } from '@/lib/emailTemplates/reminderDigest'
import { sendPushToUser } from '@/lib/fcm-admin'
import { getAdminFirestore } from '@/lib/firebase-admin'
import type { NotificationPreferences, Reminder, User } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 300

interface RecipientBucket {
  today: Reminder[]
  overdue: Reminder[]
  upcoming: Reminder[]
}

function bucketReminder(r: Reminder, now: Date, in3Days: Date): keyof RecipientBucket | null {
  const due = r.dueDate instanceof Date ? r.dueDate : new Date(r.dueDate as unknown as string)
  if (Number.isNaN(due.getTime())) return null

  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)

  if (due < startOfToday) return 'overdue'
  if (due <= endOfToday) return 'today'
  if (due <= in3Days) return 'upcoming'
  return null
}

function getRecipientIds(r: Reminder): string[] {
  if (r.assigneeIds && r.assigneeIds.length > 0) return r.assigneeIds
  return [r.farmerId]
}

export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request)
  if (authError) return authError

  const db = getAdminFirestore()
  const now = new Date()
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  // Solo recordatorios no completados con dueDate <= now+3d
  const snap = await db
    .collection('reminders')
    .where('completed', '==', false)
    .where('dueDate', '<=', in3Days)
    .get()

  // Agrupar por destinatario
  const byUser = new Map<string, RecipientBucket>()
  for (const docSnap of snap.docs) {
    const r = { id: docSnap.id, ...docSnap.data() } as Reminder
    // Convertir Timestamp → Date
    const dueDate =
      r.dueDate && typeof (r.dueDate as unknown as { toDate?: () => Date }).toDate === 'function'
        ? (r.dueDate as unknown as { toDate: () => Date }).toDate()
        : new Date(r.dueDate as unknown as string)
    r.dueDate = dueDate

    const bucket = bucketReminder(r, now, in3Days)
    if (!bucket) continue

    for (const userId of getRecipientIds(r)) {
      let userBucket = byUser.get(userId)
      if (!userBucket) {
        userBucket = { today: [], overdue: [], upcoming: [] }
        byUser.set(userId, userBucket)
      }
      userBucket[bucket].push(r)
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dashboard.migranja.app'
  let emailsSent = 0
  let pushesSent = 0
  const updatedReminderIds = new Set<string>()

  // Procesar cada destinatario
  await Promise.all(
    Array.from(byUser.entries()).map(async ([userId, bucket]) => {
      const totalToday = bucket.today.length
      const totalOverdue = bucket.overdue.length
      if (totalToday === 0 && totalOverdue === 0) return // upcoming-only no dispara aviso

      const [prefsSnap, userSnap] = await Promise.all([
        db.collection('notificationPreferences').doc(userId).get(),
        db.collection('users').doc(userId).get(),
      ])
      const prefs = prefsSnap.data() as Partial<NotificationPreferences> | undefined
      const user = userSnap.data() as Partial<User> | undefined

      // Email
      if (prefs?.emailEnabled !== false && user?.email) {
        const { subject, html } = buildReminderDigestEmail({
          userName: user.farmName || user.email.split('@')[0],
          today: bucket.today,
          overdue: bucket.overdue,
          upcoming: bucket.upcoming,
          appUrl,
        })
        const ok = await sendBrevoEmail({
          to: user.email,
          subject,
          html,
          tags: ['reminder-digest'],
        })
        if (ok) emailsSent++
      }

      // Push
      if (prefs?.pushEnabled && Array.isArray(prefs.fcmTokens) && prefs.fcmTokens.length > 0) {
        const title =
          totalOverdue > 0
            ? `${totalOverdue} recordatorio${totalOverdue > 1 ? 's' : ''} atrasado${totalOverdue > 1 ? 's' : ''}`
            : `${totalToday} recordatorio${totalToday > 1 ? 's' : ''} para hoy`
        const body = bucket.today
          .concat(bucket.overdue)
          .slice(0, 3)
          .map((r) => r.title)
          .join(' · ')
        const { success } = await sendPushToUser(userId, prefs.fcmTokens, {
          title,
          body,
          url: '/?dashboard-main=recordatorios',
        })
        pushesSent += success
      }

      // Marcar reminders del día como notificados (no overdue: ese estado lo maneja el otro cron)
      for (const r of bucket.today) updatedReminderIds.add(r.id)
    }),
  )

  // Update notifiedAt en batch (chunks de 500)
  const ids = Array.from(updatedReminderIds)
  for (let i = 0; i < ids.length; i += 500) {
    const batch = db.batch()
    for (const id of ids.slice(i, i + 500)) {
      batch.update(db.collection('reminders').doc(id), { notifiedAt: now })
    }
    await batch.commit()
  }

  return NextResponse.json({
    ok: true,
    recipientCount: byUser.size,
    remindersFlagged: ids.length,
    emailsSent,
    pushesSent,
    timestamp: now.toISOString(),
  })
}
