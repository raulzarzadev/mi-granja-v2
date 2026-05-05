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

const DEFAULT_SENDER = { name: 'Mi Granja', email: 'noreply@migranja.app' }

export async function sendBrevoEmail(email: BrevoEmail): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    console.error('BREVO_API_KEY no configurada — omitiendo email')
    return false
  }

  const textContent =
    email.text ||
    email.html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

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
    console.error('Brevo send failed:', response.status, data)
    return false
  }
  return true
}
