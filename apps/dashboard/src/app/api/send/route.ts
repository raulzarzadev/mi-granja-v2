import { NextRequest, NextResponse } from 'next/server'

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

interface EmailRequest {
  to: string | string[]
  from?: string
  cc?: string | string[]
  bcc?: string | string[]
  subject: string
  html?: string
  text?: string
  reply_to?: string | string[]
  tags?: { name: string; value: string }[]
}

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
    const apiKey = process.env.BREVO_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'BREVO_API_KEY no esta configurada' },
        { status: 500 },
      )
    }

    const emailData: EmailRequest = await request.json()

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
        ? { replyTo: { email: Array.isArray(emailData.reply_to) ? emailData.reply_to[0] : emailData.reply_to } }
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
          error: data.message || 'Error al enviar email via Brevo',
          code: data.code,
        },
        { status: response.status },
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Email enviado exitosamente',
        data,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('Error enviando email:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 },
    )
  }
}

// Health check
export async function GET() {
  const isConfigured = !!process.env.BREVO_API_KEY
  return NextResponse.json({
    service: 'Email Service (Brevo)',
    status: 'online',
    configured: isConfigured,
    timestamp: new Date().toISOString(),
  })
}
