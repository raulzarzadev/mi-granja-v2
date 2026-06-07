import { type NextRequest, NextResponse } from 'next/server'
import { type BrevoEmail, type BrevoSendResult, sendBrevoEmail } from '@/lib/brevo'
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

type EmailSender = (email: BrevoEmail) => Promise<BrevoSendResult>
type PushSender = typeof sendPushToUser

interface DigestCollection {
  where: (field: string, op: string, value: unknown) => DigestCollection
  get: () => Promise<{ docs: DigestDoc[] }>
  doc: (id: string) => { get: () => Promise<{ data: () => Record<string, unknown> | undefined }> }
}

interface DigestDb {
  collection: (name: string) => DigestCollection
  batch: () => {
    update: (ref: unknown, data: Record<string, unknown>) => void
    commit: () => Promise<void>
  }
}

interface DigestDoc {
  id: string
  data: () => Record<string, unknown>
}

interface DigestOptions {
  db: DigestDb
  now?: Date
  appUrl: string
  dryRun?: boolean
  debug?: boolean
  sendEmail?: EmailSender
  sendPush?: PushSender
}

interface RecipientDebug {
  userId: string
  email?: string
  today: number
  overdue: number
  upcoming: number
  emailAction: 'sent' | 'failed' | 'would_send' | 'skipped'
  emailSkipReason?: string
  emailErrorCode?: string
  emailStatus?: number
  pushAction: 'sent' | 'failed' | 'would_send' | 'skipped'
  pushSkipReason?: string
}

interface DigestResult {
  ok: true
  dryRun: boolean
  debug: boolean
  remindersFound: number
  recipientCount: number
  eligibleRecipients: number
  remindersFlagged: number
  emailsAttempted: number
  emailsSent: number
  emailsFailed: number
  pushesAttempted: number
  pushesSent: number
  pushesFailed: number
  skipped: {
    upcomingOnly: number
    emailDisabled: number
    userNotFound: number
    missingEmail: number
    pushDisabled: number
    missingFcmTokens: number
  }
  recipients?: RecipientDebug[]
  timestamp: string
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

function maskEmail(email: string): string {
  const [name, domain] = email.split('@')
  if (!name || !domain) return '***'
  const visible = name.length <= 2 ? name[0] : name.slice(0, 2)
  return `${visible}${'*'.repeat(Math.max(1, name.length - visible.length))}@${domain}`
}

function docRef(db: DigestDb, collectionName: string, id: string): unknown {
  return db.collection(collectionName).doc(id)
}

function getUserBucket(byUser: Map<string, RecipientBucket>, userId: string): RecipientBucket {
  let userBucket = byUser.get(userId)
  if (!userBucket) {
    userBucket = { today: [], overdue: [], upcoming: [] }
    byUser.set(userId, userBucket)
  }
  return userBucket
}

export async function runReminderDigest({
  db,
  now = new Date(),
  appUrl,
  dryRun = false,
  debug = false,
  sendEmail = sendBrevoEmail,
  sendPush = sendPushToUser,
}: DigestOptions): Promise<DigestResult> {
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
      const userBucket = getUserBucket(byUser, userId)
      userBucket[bucket].push(r)
    }
  }

  let eligibleRecipients = 0
  let emailsAttempted = 0
  let emailsSent = 0
  let emailsFailed = 0
  let pushesAttempted = 0
  let pushesSent = 0
  let pushesFailed = 0
  const skipped = {
    upcomingOnly: 0,
    emailDisabled: 0,
    userNotFound: 0,
    missingEmail: 0,
    pushDisabled: 0,
    missingFcmTokens: 0,
  }
  const recipients: RecipientDebug[] = []
  const updatedReminderIds = new Set<string>()

  // Procesar cada destinatario
  await Promise.all(
    Array.from(byUser.entries()).map(async ([userId, bucket]) => {
      const totalToday = bucket.today.length
      const totalOverdue = bucket.overdue.length
      const debugEntry: RecipientDebug = {
        userId,
        today: totalToday,
        overdue: totalOverdue,
        upcoming: bucket.upcoming.length,
        emailAction: 'skipped',
        pushAction: 'skipped',
      }
      if (totalToday === 0 && totalOverdue === 0) {
        skipped.upcomingOnly++
        debugEntry.emailSkipReason = 'upcoming_only'
        debugEntry.pushSkipReason = 'upcoming_only'
        if (debug) recipients.push(debugEntry)
        return // upcoming-only no dispara aviso
      }
      eligibleRecipients++

      const [prefsSnap, userSnap] = await Promise.all([
        db.collection('notificationPreferences').doc(userId).get(),
        db.collection('users').doc(userId).get(),
      ])
      const prefs = prefsSnap.data() as Partial<NotificationPreferences> | undefined
      const user = userSnap.data() as Partial<User> | undefined
      if (!user) skipped.userNotFound++
      if (user?.email) debugEntry.email = maskEmail(user.email)

      // Email
      if (prefs?.emailEnabled === false) {
        skipped.emailDisabled++
        debugEntry.emailSkipReason = 'email_disabled'
      } else if (!user?.email) {
        if (user) skipped.missingEmail++
        debugEntry.emailSkipReason = user ? 'missing_email' : 'user_not_found'
      } else if (dryRun) {
        debugEntry.emailAction = 'would_send'
      } else {
        try {
          const { subject, html } = buildReminderDigestEmail({
            userName: user.farmName || user.email.split('@')[0],
            today: bucket.today,
            overdue: bucket.overdue,
            upcoming: bucket.upcoming,
            appUrl,
          })
          emailsAttempted++
          const result = await sendEmail({
            to: user.email,
            subject,
            html,
            tags: ['reminder-digest'],
          })
          if (result.ok) {
            emailsSent++
            debugEntry.emailAction = 'sent'
          } else {
            emailsFailed++
            debugEntry.emailAction = 'failed'
            debugEntry.emailErrorCode = result.errorCode
            debugEntry.emailStatus = result.status
          }
        } catch (error) {
          emailsFailed++
          debugEntry.emailAction = 'failed'
          debugEntry.emailErrorCode = 'email_exception'
          console.error('Reminder digest email failed:', userId, error)
        }
      }

      // Push
      if (!prefs?.pushEnabled) {
        skipped.pushDisabled++
        debugEntry.pushSkipReason = 'push_disabled'
      } else if (!Array.isArray(prefs.fcmTokens) || prefs.fcmTokens.length === 0) {
        skipped.missingFcmTokens++
        debugEntry.pushSkipReason = 'missing_fcm_tokens'
      } else if (dryRun) {
        debugEntry.pushAction = 'would_send'
      } else {
        const title =
          totalOverdue > 0
            ? `${totalOverdue} recordatorio${totalOverdue > 1 ? 's' : ''} atrasado${totalOverdue > 1 ? 's' : ''}`
            : `${totalToday} recordatorio${totalToday > 1 ? 's' : ''} para hoy`
        const body = bucket.today
          .concat(bucket.overdue)
          .slice(0, 3)
          .map((r) => r.title)
          .join(' · ')
        try {
          pushesAttempted++
          const { success, failure } = await sendPush(userId, prefs.fcmTokens, {
            title,
            body,
            url: '/?dashboard-main=recordatorios',
          })
          pushesSent += success
          pushesFailed += failure
          if (success > 0) {
            debugEntry.pushAction = 'sent'
          } else {
            debugEntry.pushAction = 'failed'
          }
        } catch (error) {
          pushesFailed++
          debugEntry.pushAction = 'failed'
          console.error('Reminder digest push failed:', userId, error)
        }
      }

      // Marcar reminders del día como notificados (no overdue: ese estado lo maneja el otro cron)
      for (const r of bucket.today) updatedReminderIds.add(r.id)
      if (debug) recipients.push(debugEntry)
    }),
  )

  // Update notifiedAt en batch (chunks de 500)
  const ids = Array.from(updatedReminderIds)
  for (let i = 0; !dryRun && i < ids.length; i += 500) {
    const batch = db.batch()
    for (const id of ids.slice(i, i + 500)) {
      batch.update(docRef(db, 'reminders', id), { notifiedAt: now })
    }
    await batch.commit()
  }

  return {
    ok: true,
    dryRun,
    debug,
    remindersFound: snap.docs.length,
    recipientCount: byUser.size,
    eligibleRecipients,
    remindersFlagged: dryRun ? 0 : ids.length,
    emailsAttempted,
    emailsSent,
    emailsFailed,
    pushesAttempted,
    pushesSent,
    pushesFailed,
    skipped,
    ...(debug ? { recipients } : {}),
    timestamp: now.toISOString(),
  }
}

export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request)
  if (authError) return authError

  const db = getAdminFirestore() as unknown as DigestDb
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dashboard.migranja.app'
  const dryRun = request.nextUrl.searchParams.get('dryRun') === '1'
  const debug = request.nextUrl.searchParams.get('debug') === '1'
  const result = await runReminderDigest({ db, appUrl, dryRun, debug })

  return NextResponse.json(result)
}
