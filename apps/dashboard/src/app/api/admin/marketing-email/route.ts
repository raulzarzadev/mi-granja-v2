import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, verifyBillingAuth } from '@/lib/billing-auth'
import { sendBrevoEmail } from '@/lib/brevo'
import { buildMarketingEmail, type MarketingEmailTemplate } from '@/lib/emailTemplates/marketing'
import { getAdminFirestore } from '@/lib/firebase-admin'
import { createMarketingUnsubscribeToken } from '@/lib/marketing-unsubscribe'
import { isUserAdmin } from '@/lib/userUtils'

interface MarketingEmailRequest {
  recipientMode: 'all' | 'userIds' | 'emails'
  userIds?: string[]
  emails?: string[]
  subject: string
  message: string
  ctaText?: string
  ctaUrl?: string
  template?: MarketingEmailTemplate
  dryRun?: boolean
}

interface MarketingRecipient {
  email: string
  userId?: string
}

const MAX_SUBJECT_LENGTH = 120
const MAX_MESSAGE_LENGTH = 4000

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  return email
}

async function isRequesterAdmin(uid: string, email: string) {
  const firestore = getAdminFirestore()
  const userSnap = await firestore.doc(`users/${uid}`).get()
  const userData = userSnap.data()
  return isUserAdmin({
    id: uid,
    email,
    roles: userData?.roles || [],
    createdAt: new Date(),
  })
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://dashboard.migranja.app'
}

function buildUnsubscribeUrl(recipient: MarketingRecipient): string | undefined {
  if (!recipient.userId) return undefined
  const token = createMarketingUnsubscribeToken({ uid: recipient.userId, email: recipient.email })
  return `${getAppUrl()}/api/marketing/unsubscribe?token=${encodeURIComponent(token)}`
}

function uniqueRecipients(recipients: MarketingRecipient[]): MarketingRecipient[] {
  const byEmail = new Map<string, MarketingRecipient>()
  for (const recipient of recipients) {
    if (!byEmail.has(recipient.email)) byEmail.set(recipient.email, recipient)
  }
  return Array.from(byEmail.values())
}

async function resolveRecipients(payload: MarketingEmailRequest): Promise<MarketingRecipient[]> {
  const firestore = getAdminFirestore()

  if (payload.recipientMode === 'emails') {
    return [...new Set((payload.emails || []).map(normalizeEmail).filter(Boolean) as string[])].map(
      (email) => ({ email }),
    )
  }

  if (payload.recipientMode === 'userIds') {
    const ids = [...new Set((payload.userIds || []).filter(Boolean))]
    const rows = await Promise.all(
      ids.map(async (id) => {
        const [userSnap, prefsSnap] = await Promise.all([
          firestore.doc(`users/${id}`).get(),
          firestore.doc(`notificationPreferences/${id}`).get(),
        ])
        const email = normalizeEmail(userSnap.data()?.email)
        const prefs = prefsSnap.data()
        if (!email || prefs?.marketingEmailEnabled === false) return null
        return { email, userId: id }
      }),
    )
    return uniqueRecipients(rows.filter(Boolean) as MarketingRecipient[])
  }

  const usersSnap = await firestore.collection('users').get()
  const rows = await Promise.all(
    usersSnap.docs.map(async (doc) => {
      const email = normalizeEmail(doc.data().email)
      const prefsSnap = await firestore.doc(`notificationPreferences/${doc.id}`).get()
      const prefs = prefsSnap.data()
      if (!email || prefs?.marketingEmailEnabled === false) return null
      return { email, userId: doc.id }
    }),
  )
  return uniqueRecipients(rows.filter(Boolean) as MarketingRecipient[])
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyBillingAuth(request)
    if (isAuthError(auth)) return auth

    if (!(await isRequesterAdmin(auth.uid, auth.email))) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const payload = (await request.json()) as MarketingEmailRequest
    const subject = payload.subject?.trim()
    const message = payload.message?.trim()

    if (!subject) return NextResponse.json({ error: 'El asunto es requerido' }, { status: 400 })
    if (!message) return NextResponse.json({ error: 'El mensaje es requerido' }, { status: 400 })
    if (subject.length > MAX_SUBJECT_LENGTH) {
      return NextResponse.json({ error: 'El asunto es demasiado largo' }, { status: 400 })
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: 'El mensaje es demasiado largo' }, { status: 400 })
    }
    if (!['all', 'userIds', 'emails'].includes(payload.recipientMode)) {
      return NextResponse.json({ error: 'Destinatarios invalidos' }, { status: 400 })
    }

    const recipients = await resolveRecipients(payload)
    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No hay destinatarios validos' }, { status: 400 })
    }

    const failed: { email: string; errorCode?: string; status?: number }[] = []
    let sent = 0

    if (!payload.dryRun) {
      for (const recipient of recipients) {
        const email = buildMarketingEmail(payload.template || 'basic', {
          subject,
          message,
          ctaText: payload.ctaText?.trim() || undefined,
          ctaUrl: payload.ctaUrl?.trim() || undefined,
          unsubscribeUrl: buildUnsubscribeUrl(recipient),
        })
        const result = await sendBrevoEmail({
          to: recipient.email,
          subject: email.subject,
          html: email.html,
          text: email.text,
          tags: ['marketing', payload.template || 'basic'],
        })
        if (result.ok) {
          sent++
        } else {
          failed.push({
            email: recipient.email,
            errorCode: result.errorCode,
            status: result.status,
          })
        }
      }
    }

    const firestore = getAdminFirestore()
    await firestore.collection('marketingEmailCampaigns').add({
      subject,
      template: payload.template || 'basic',
      recipientMode: payload.recipientMode,
      requestedRecipients: recipients.length,
      sent,
      failed: failed.length,
      dryRun: Boolean(payload.dryRun),
      createdBy: auth.uid,
      createdByEmail: auth.email,
      createdAt: new Date(),
    })

    return NextResponse.json({
      ok: true,
      dryRun: Boolean(payload.dryRun),
      recipients: recipients.length,
      sent,
      failed: failed.length,
      failures: failed.slice(0, 10),
    })
  } catch (error) {
    console.error('marketing-email error:', error)
    return NextResponse.json({ error: 'Error enviando campaña de email' }, { status: 500 })
  }
}
