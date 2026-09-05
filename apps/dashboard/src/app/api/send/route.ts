import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isAuthError, isAuthenticatedUserAdmin, verifyBillingAuth } from '@/lib/billing-auth'
import { getAdminFirestore } from '@/lib/firebase-admin'
import { consumeRequestLimit } from '@/lib/request-limits'
import { sendTransactionalEmail } from '@/lib/transactional-email'

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

const recipientsSchema = z.union([z.string().email(), z.array(z.string().email()).min(1).max(20)])
const emailSchema = z
  .object({
    to: recipientsSchema,
    from: z.string().max(254).optional(),
    cc: recipientsSchema.optional(),
    bcc: recipientsSchema.optional(),
    subject: z.string().min(1).max(200),
    html: z.string().max(100000).optional(),
    text: z.string().max(100000).optional(),
    reply_to: recipientsSchema.optional(),
    tags: z
      .array(z.object({ name: z.string().max(50), value: z.string().max(50) }))
      .max(10)
      .optional(),
  })
  .refine((email) => email.html || email.text)

function toBrevoRecipients(input: string | string[]): { email: string }[] {
  const emails = Array.isArray(input) ? input : [input]
  return emails.map((email) => ({ email }))
}

function parseSender(from?: string): { name: string; email: string } {
  if (!from) return { name: 'Mi Granja', email: 'noreply@migranja.app' }
  // Parse "Name <email>" format
  const match = from.match(/^(.+?)\s*<(.+?)>$/)
  if (match) return { name: match[1].trim(), email: match[2].trim() }
  return { name: 'Mi Granja', email: from }
}

export async function POST(request: NextRequest) {
  try {
    // Verify Firebase Auth token
    const auth = await verifyBillingAuth(request)
    if (isAuthError(auth)) return auth

    const body = await request.json()
    if (body && typeof body === 'object' && 'purpose' in body) {
      return await sendTransactionalEmail(body, auth)
    }
    const db = getAdminFirestore()
    const user = await db.collection('users').doc(auth.uid).get()
    if (!isAuthenticatedUserAdmin(auth.email, user.data()?.roles)) {
      return NextResponse.json(
        { error: 'El envío libre de correos requiere permisos de administrador' },
        { status: 403 },
      )
    }
    const parsed = emailSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: 'Datos de correo inválidos' }, { status: 400 })
    const retryAfter = await consumeRequestLimit(db, `admin-email:${auth.uid}`, {
      maximum: 100,
      windowMs: 3600000,
    })
    if (retryAfter)
      return NextResponse.json(
        { error: 'Límite de correos alcanzado' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      )

    const apiKey = process.env.BREVO_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'BREVO_API_KEY no esta configurada' },
        { status: 500 },
      )
    }

    const emailData = parsed.data

    // Validaciones
    if (!emailData.to || (Array.isArray(emailData.to) && emailData.to.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'Se requiere al menos un destinatario' },
        { status: 400 },
      )
    }
    if (!emailData.subject) {
      return NextResponse.json(
        { success: false, error: 'El asunto del email es requerido' },
        { status: 400 },
      )
    }
    if (!emailData.html && !emailData.text) {
      return NextResponse.json(
        { success: false, error: 'Se requiere contenido HTML o texto' },
        { status: 400 },
      )
    }

    // Preparar texto plano si solo hay HTML
    const htmlToText = (html: string) =>
      html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim()

    const textContent = emailData.text || (emailData.html ? htmlToText(emailData.html) : '')
    const sender = parseSender(emailData.from)

    // Construir payload de Brevo
    const brevoPayload: Record<string, unknown> = {
      sender,
      to: toBrevoRecipients(emailData.to),
      subject: emailData.subject,
      textContent,
      ...(emailData.html ? { htmlContent: emailData.html } : {}),
      ...(emailData.cc ? { cc: toBrevoRecipients(emailData.cc) } : {}),
      ...(emailData.bcc ? { bcc: toBrevoRecipients(emailData.bcc) } : {}),
      ...(emailData.reply_to
        ? {
            replyTo: {
              email: Array.isArray(emailData.reply_to) ? emailData.reply_to[0] : emailData.reply_to,
            },
          }
        : {}),
      ...(emailData.tags ? { tags: emailData.tags.map((t) => t.value) } : {}),
    }

    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(brevoPayload),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Brevo API error:', data)
      return NextResponse.json(
        {
          success: false,
          error: 'Error al enviar email',
        },
        { status: 502 },
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Email enviado exitosamente',
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('Error enviando email:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
      },
      { status: 500 },
    )
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    service: 'Email Service',
    status: 'online',
    timestamp: new Date().toISOString(),
  })
}
