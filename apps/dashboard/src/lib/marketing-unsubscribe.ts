import { createHmac, timingSafeEqual } from 'node:crypto'

interface UnsubscribePayload {
  uid: string
  email: string
}

function getSecret(): string {
  return (
    process.env.MARKETING_UNSUBSCRIBE_SECRET ||
    process.env.BREVO_API_KEY ||
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    ''
  )
}

function sign(data: string): string {
  const secret = getSecret()
  if (!secret) throw new Error('MARKETING_UNSUBSCRIBE_SECRET no configurado')
  return createHmac('sha256', secret).update(data).digest('base64url')
}

export function createMarketingUnsubscribeToken(payload: UnsubscribePayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${data}.${sign(data)}`
}

export function verifyMarketingUnsubscribeToken(token: string): UnsubscribePayload | null {
  const [data, signature] = token.split('.')
  if (!data || !signature) return null

  const expected = sign(data)
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'))
    if (typeof payload.uid !== 'string' || typeof payload.email !== 'string') return null
    return { uid: payload.uid, email: payload.email }
  } catch {
    return null
  }
}
