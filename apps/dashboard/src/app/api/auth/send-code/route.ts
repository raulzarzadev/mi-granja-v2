import { randomInt } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { emailTemplate } from '@/lib/emailTemplate'
import { getAdminFirestore } from '@/lib/firebase-admin'
import { consumeRequestLimit } from '@/lib/request-limits'

const BREVO_API_KEY = process.env.BREVO_API_KEY

function generateCode(): string {
  // Cryptographically secure 6-digit numeric code
  return randomInt(100000, 999999).toString()
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    const parsedEmail = z.string().trim().toLowerCase().email().max(254).safeParse(email)
    if (!parsedEmail.success) {
      return NextResponse.json({ error: 'Email válido requerido' }, { status: 400 })
    }

    const normalizedEmail = parsedEmail.data

    const isEmulator =
      (process.env.NEXT_PUBLIC_USE_EMULATOR === 'true' ||
        !!process.env.FIREBASE_AUTH_EMULATOR_HOST) &&
      process.env.NODE_ENV === 'development'
    if (!isEmulator && !BREVO_API_KEY) {
      return NextResponse.json({ error: 'Servicio de email no configurado' }, { status: 500 })
    }
    const firestore = getAdminFirestore()
    const retryAfter = await consumeRequestLimit(firestore, `auth-code:${normalizedEmail}`, {
      maximum: 5,
      windowMs: 60 * 60 * 1000,
      intervalMs: 60 * 1000,
    })
    if (retryAfter) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Espera antes de pedir otro código.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      )
    }
    const code = generateCode()
    await firestore.doc(`authCodes/${normalizedEmail}`).set({
      code,
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0,
      createdAt: Date.now(),
    })
    if (isEmulator) return NextResponse.json({ ok: true, devCode: code })

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
        'api-key': BREVO_API_KEY!,
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
    return NextResponse.json({ error: 'Error enviando código. Intenta de nuevo.' }, { status: 500 })
  }
}
