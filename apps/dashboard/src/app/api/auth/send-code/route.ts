import { NextRequest, NextResponse } from 'next/server'
import { emailTemplate } from '@/lib/emailTemplate'
import { getAdminFirestore } from '@/lib/firebase-admin'

const BREVO_API_KEY = process.env.BREVO_API_KEY

function generateCode(): string {
  // 6-digit numeric code
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Generate 6-digit code
    const code = generateCode()
    const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutes

    // Store in Firestore (authCodes collection)
    const firestore = getAdminFirestore()
    await firestore.doc(`authCodes/${normalizedEmail}`).set({
      code,
      expiresAt,
      attempts: 0,
      createdAt: Date.now(),
    })

    // Send code via Brevo
    if (!BREVO_API_KEY) {
      console.error('BREVO_API_KEY not configured')
      return NextResponse.json({ error: 'Servicio de email no configurado' }, { status: 500 })
    }

    const html = emailTemplate({
      title: 'Tu código de acceso',
      body: `
        <p>Usa este código para acceder a Mi Granja:</p>
        <div style="text-align:center;margin:24px 0;">
          <span style="display:inline-block;background:#f0fdf4;border:2px solid #16a34a;border-radius:12px;padding:16px 32px;font-size:32px;font-weight:700;letter-spacing:8px;color:#16a34a;font-family:monospace;">
            ${code}
          </span>
        </div>
        <p style="color:#6b7280;font-size:13px;">Este código expira en <strong>10 minutos</strong>. Si no solicitaste este código, puedes ignorar este email.</p>
      `,
    })

    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Mi Granja', email: 'noreply@migranja.app' },
        to: [{ email: normalizedEmail }],
        subject: `${code} — Tu código de acceso a Mi Granja`,
        htmlContent: html,
        tags: ['auth-code'],
      }),
    })

    if (!brevoRes.ok) {
      const errBody = await brevoRes.text()
      console.error('Brevo error:', errBody)
      return NextResponse.json({ error: 'Error enviando email' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('send-code error:', error)
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
