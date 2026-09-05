import { NextResponse } from 'next/server'
import { z } from 'zod'
import { hasPermission, resolveFarmPermissions } from '@/lib/ai/server'
import type { AuthenticatedUser } from '@/lib/billing-auth'
import { type BrevoEmail, sendBrevoEmail } from '@/lib/brevo'
import { APP_URL, emailTemplate } from '@/lib/emailTemplate'
import { getAdminFirestore } from '@/lib/firebase-admin'
import { consumeRequestLimit } from '@/lib/request-limits'
import { collaborator_roles_label } from '@/types/collaborators'

const inputSchema = z.discriminatedUnion('purpose', [
  z
    .object({
      purpose: z.literal('invitation'),
      invitationId: z
        .string()
        .min(1)
        .max(200)
        .regex(/^[^/]+$/),
    })
    .strict(),
  z
    .object({
      purpose: z.literal('pro-request'),
      granjas: z.number().int().min(0).max(10000),
      colaboradores: z.number().int().min(0).max(10000),
    })
    .strict(),
])

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  )
}

/** Clients choose an operation, never its recipients, sender or HTML. */
export async function sendTransactionalEmail(body: unknown, auth: AuthenticatedUser) {
  const parsed = inputSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: 'Solicitud de correo inválida' }, { status: 400 })
  const db = getAdminFirestore()
  const emails: BrevoEmail[] = []
  const input = parsed.data
  if (input.purpose === 'invitation') {
    const snapshot = await db.collection('farmInvitations').doc(input.invitationId).get()
    const invitation = snapshot.data()
    if (!invitation)
      return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 })
    const access = await resolveFarmPermissions({
      farmId: invitation.farmId,
      userId: auth.uid,
      email: auth.email,
    })
    if (
      !access ||
      !(
        hasPermission(access.permissions, 'collaborators', 'create') ||
        hasPermission(access.permissions, 'invitations', 'create')
      )
    ) {
      return NextResponse.json(
        { error: 'No tienes permiso para enviar esta invitación' },
        { status: 403 },
      )
    }
    const expiresAt = invitation.expiresAt?.toMillis?.()
    if (
      invitation.status !== 'pending' ||
      !expiresAt ||
      expiresAt <= Date.now() ||
      !invitation.token
    ) {
      return NextResponse.json({ error: 'La invitación no está vigente' }, { status: 409 })
    }
    const token = encodeURIComponent(invitation.token)
    const role =
      collaborator_roles_label[invitation.role as keyof typeof collaborator_roles_label] ||
      'Colaborador'
    emails.push({
      to: invitation.email,
      subject: 'Te han invitado a colaborar en Mi Granja',
      html: emailTemplate({
        title: 'Te han invitado a colaborar',
        body: `<p>${escapeHtml(auth.email)} te invita a <strong>${escapeHtml(access.farmName)}</strong> como ${escapeHtml(role)}.</p>`,
        ctaText: 'Aceptar invitación',
        ctaUrl: `${APP_URL}/invitations/confirm?token=${token}&action=accept`,
        secondaryCtaText: 'Rechazar',
        secondaryCtaUrl: `${APP_URL}/invitations/confirm?token=${token}&action=reject`,
      }),
      tags: ['invitation'],
    })
  } else {
    if (!z.string().email().safeParse(auth.email).success)
      return NextResponse.json({ error: 'La cuenta necesita un email válido' }, { status: 400 })
    const details = `<p>Granjas adicionales: ${input.granjas}. Colaboradores: ${input.colaboradores}.</p>`
    emails.push(
      {
        to: 'raulzarza.dev@gmail.com',
        subject: 'Nueva solicitud de plan Pro',
        html: emailTemplate({
          title: 'Nueva solicitud de plan Pro',
          body: `<p>${escapeHtml(auth.email)} (${escapeHtml(auth.uid)})</p>${details}`,
        }),
      },
      {
        to: auth.email,
        subject: 'Recibimos tu solicitud — Mi Granja Pro',
        html: emailTemplate({
          title: 'Recibimos tu solicitud',
          body: `<p>Gracias por tu interés. Pronto nos pondremos en contacto contigo.</p>${details}`,
        }),
      },
    )
  }
  const retryAfter = await consumeRequestLimit(db, `email:${auth.uid}`, {
    maximum: 20,
    windowMs: 3600000,
    intervalMs: 60000,
  })
  if (retryAfter)
    return NextResponse.json(
      { error: 'Espera antes de enviar otro correo' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )
  for (const email of emails) {
    const result = await sendBrevoEmail(email)
    if (!result.ok)
      return NextResponse.json({ error: 'No se pudo enviar el correo' }, { status: 502 })
  }
  return NextResponse.json({ success: true })
}
