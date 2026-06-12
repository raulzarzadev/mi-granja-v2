import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase-admin'
import { verifyMarketingUnsubscribeToken } from '@/lib/marketing-unsubscribe'

function htmlPage(title: string, message: string, status = 200) {
  return new NextResponse(
    `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;background:#f3f4f6;font-family:Segoe UI,Arial,sans-serif;color:#111827;">
  <main style="max-width:520px;margin:48px auto;padding:0 16px;">
    <section style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;box-shadow:0 1px 2px rgba(0,0,0,.04);">
      <h1 style="margin:0 0 12px;font-size:22px;">${title}</h1>
      <p style="margin:0 0 20px;color:#4b5563;line-height:1.5;">${message}</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://dashboard.migranja.app'}" style="display:inline-block;background:#16a34a;color:white;text-decoration:none;border-radius:8px;padding:12px 18px;font-weight:600;">Abrir Mi Granja</a>
    </section>
  </main>
</body>
</html>`,
    {
      status,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    },
  )
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) {
    return htmlPage('Link inválido', 'No encontramos un token de baja válido.', 400)
  }

  const payload = verifyMarketingUnsubscribeToken(token)
  if (!payload) {
    return htmlPage('Link inválido', 'Este link de baja no es válido o fue modificado.', 400)
  }

  await getAdminFirestore().collection('notificationPreferences').doc(payload.uid).set(
    {
      userId: payload.uid,
      marketingEmailEnabled: false,
      marketingUnsubscribedAt: new Date(),
      updatedAt: new Date(),
    },
    { merge: true },
  )

  return htmlPage(
    'Te dimos de baja',
    `Ya no enviaremos correos de novedades y actualizaciones a ${payload.email}. Seguirás recibiendo correos operativos importantes si corresponden a tu cuenta.`,
  )
}
