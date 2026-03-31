'use client'

import { useState } from 'react'
import { APP_URL, emailTemplate } from '@/lib/emailTemplate'
import { auth } from '@/lib/firebase'

interface EmailData {
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

interface EmailResponse {
  success: boolean
  message?: string
  data?: string
  error?: string
}

export const useEmail = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Función para sanitizar tags para Resend (solo ASCII, números, _, -)
  const sanitizeTagValue = (value: string): string => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_') // Reemplaza caracteres no válidos con _
      .replace(/_{2,}/g, '_') // Reemplaza múltiples _ con uno solo
      .replace(/^_+|_+$/g, '') // Elimina _ al inicio y final
      .substring(0, 50) // Limita la longitud
  }

  const sendEmail = async (emailData: EmailData): Promise<EmailResponse> => {
    setIsLoading(true)
    setError(null)

    try {
      // Sanitizar tags si existen
      const sanitizedEmailData = {
        ...emailData,
        ...(emailData.tags && {
          tags: emailData.tags.map((tag) => ({
            name: sanitizeTagValue(tag.name),
            value: sanitizeTagValue(tag.value),
          })),
        }),
      }

      const user = auth.currentUser
      if (!user) throw new Error('Usuario no autenticado')
      const token = await user.getIdToken()

      const response = await fetch('/api/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(sanitizedEmailData),
      })

      const result: EmailResponse = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`)
      }

      if (!result.success) {
        throw new Error(result.error || 'Error desconocido al enviar email')
      }

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Función para enviar email de bienvenida (parámetros nombrados)
  const sendWelcomeEmail = async ({
    userEmail,
    userName,
  }: {
    userEmail: string
    userName?: string
  }) => {
    const greeting = userName ? `Hola ${userName},` : 'Hola,'
    return sendEmail({
      to: userEmail,
      subject: '¡Bienvenido a Mi Granja!',
      html: emailTemplate({
        title: '¡Bienvenido a Mi Granja!',
        body: `
          <p>${greeting}</p>
          <p>Gracias por unirte a nuestra plataforma de gestión ganadera.</p>
          <p>Ahora puedes:</p>
          <ul style="padding-left:20px;">
            <li>Registrar y gestionar tus animales</li>
            <li>Llevar control de reproducción</li>
            <li>Gestionar áreas y colaboradores</li>
            <li>Recibir recordatorios importantes</li>
          </ul>
        `,
        ctaText: 'Ir al Dashboard',
        ctaUrl: `${APP_URL}/dashboard`,
        footer: 'Si tienes alguna pregunta, no dudes en contactarnos.',
      }),
      text: `¡Bienvenido a Mi Granja!\n\n${greeting}\n\nGracias por unirte a nuestra plataforma de gestión ganadera.\n\nAhora puedes:\n- Registrar y gestionar tus animales\n- Llevar control de reproducción\n- Gestionar áreas y colaboradores\n- Recibir recordatorios importantes\n\nVisita tu dashboard: ${APP_URL}/dashboard\n\nSi tienes alguna pregunta, no dudes en contactarnos.`,
      tags: [
        { name: 'type', value: 'welcome' },
        { name: 'category', value: 'onboarding' },
      ],
    })
  }

  // Función para enviar email de recordatorio
  const sendReminderEmail = async ({
    userEmail,
    reminderType,
    reminderText,
    userName,
  }: {
    userEmail: string
    reminderType: string
    reminderText: string
    userName?: string
  }) => {
    const greeting = userName ? `Hola ${userName},` : 'Hola,'
    return sendEmail({
      to: userEmail,
      subject: `Recordatorio: ${reminderType}`,
      html: emailTemplate({
        title: `📅 Recordatorio: ${reminderType}`,
        body: `
          <p>${greeting}</p>
          <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px;margin:20px 0;border-radius:4px;">
            <p style="margin:0;font-weight:600;color:#dc2626;">${reminderType}</p>
            <p style="margin:8px 0 0 0;">${reminderText}</p>
          </div>
        `,
        ctaText: 'Ver en Dashboard',
        ctaUrl: `${APP_URL}/dashboard`,
        secondaryCtaText: undefined,
        secondaryCtaUrl: undefined,
        footer: 'Este es un recordatorio automático de Mi Granja.',
      }),
      text: `Recordatorio: ${reminderType}\n\n${greeting}\n\n${reminderText}\n\nVisita tu dashboard: ${APP_URL}/dashboard`,
      tags: [
        { name: 'type', value: 'reminder' },
        { name: 'category', value: sanitizeTagValue(reminderType) },
      ],
    })
  }

  // Función para verificar el servicio
  const checkService = async () => {
    try {
      const response = await fetch('/api/send', { method: 'GET' })
      return await response.json()
    } catch (err) {
      console.error('Error checking email service:', err)
      return { status: 'error', error: 'Service unavailable' }
    }
  }

  return {
    sendEmail,
    sendWelcomeEmail,
    sendReminderEmail,
    checkService,
    isLoading,
    error,
  }
}
