/**
 * Helper server-only para enviar emails via Brevo sin pasar por /api/send
 * (necesario en cron jobs donde no hay request del usuario).
 */
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

export interface BrevoEmail {
  to: string
  subject: string
  html: string
  text?: string
  tags?: string[]
}

export interface BrevoSendResult {
  ok: boolean
  status?: number
  errorCode?: string
  errorMessage?: string
}

const DEFAULT_SENDER = { name: 'Mi Granja', email: 'noreply@migranja.app' }

export async function sendBrevoEmail(email: BrevoEmail): Promise<BrevoSendResult> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    console.error('BREVO_API_KEY no configurada — omitiendo email')
    return {
      ok: false,
      errorCode: 'missing_api_key',
      errorMessage: 'BREVO_API_KEY no configurada',
    }
  }

  const textContent =
    email.text ||
    email.html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: DEFAULT_SENDER,
        to: [{ email: email.to }],
        subject: email.subject,
        htmlContent: email.html,
        textContent,
        ...(email.tags ? { tags: email.tags } : {}),
      }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      const errorCode =
        typeof data === 'object' && data && 'code' in data ? String(data.code) : 'brevo_error'
      const errorMessage =
        typeof data === 'object' && data && 'message' in data
          ? String(data.message)
          : 'Brevo send failed'
      console.error('Brevo send failed:', response.status, data)
      return { ok: false, status: response.status, errorCode, errorMessage }
    }

    return { ok: true, status: response.status }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error'
    console.error('Brevo send exception:', error)
    return { ok: false, errorCode: 'network_error', errorMessage: message }
  }
}
