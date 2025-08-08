'use client'

import { useState } from 'react'

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
  data?: any
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
            value: sanitizeTagValue(tag.value)
          }))
        })
      }

      const response = await fetch('/api/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sanitizedEmailData)
      })

      const result: EmailResponse = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error || `HTTP error! status: ${response.status}`
        )
      }

      if (!result.success) {
        throw new Error(result.error || 'Error desconocido al enviar email')
      }

      return result
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Función para enviar email de bienvenida (parámetros nombrados)
  const sendWelcomeEmail = async ({
    userEmail,
    userName
  }: {
    userEmail: string
    userName?: string
  }) => {
    return sendEmail({
      to: userEmail,
      subject: '¡Bienvenido a Mi Granja!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">¡Bienvenido a Mi Granja!</h1>
          <p>Hola${userName ? ` ${userName}` : ''},</p>
          <p>Gracias por unirte a nuestra plataforma de gestión ganadera.</p>
          <p>Ahora puedes:</p>
          <ul>
            <li>Registrar y gestionar tus animales</li>
            <li>Llevar control de reproducción</li>
            <li>Gestionar áreas y colaboradores</li>
            <li>Recibir recordatorios importantes</li>
          </ul>
          <a href="${
            process.env.NEXT_PUBLIC_APP_URL || 'https://migranja.app'
          }/dashboard" 
             style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px;">
            Ir al Dashboard
          </a>
          <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
            Si tienes alguna pregunta, no dudes en contactarnos.
          </p>
        </div>
      `,
      text: `¡Bienvenido a Mi Granja!
      
Hola${userName ? ` ${userName}` : ''},

Gracias por unirte a nuestra plataforma de gestión ganadera.

Ahora puedes:
- Registrar y gestionar tus animales
- Llevar control de reproducción  
- Gestionar áreas y colaboradores
- Recibir recordatorios importantes

Visita tu dashboard: ${
        process.env.NEXT_PUBLIC_APP_URL || 'https://migranja.app'
      }/dashboard

Si tienes alguna pregunta, no dudes en contactarnos.`,
      tags: [
        { name: 'type', value: 'welcome' },
        { name: 'category', value: 'onboarding' }
      ]
    })
  }

  // Función para enviar email de recordatorio
  const sendReminderEmail = async ({
    userEmail,
    reminderType,
    reminderText,
    userName
  }: {
    userEmail: string
    reminderType: string
    reminderText: string
    userName?: string
  }) => {
    return sendEmail({
      to: userEmail,
      subject: `Recordatorio: ${reminderType}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">📅 Recordatorio Importante</h2>
          <p>Hola${userName ? ` ${userName}` : ''},</p>
          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0;">
            <h3 style="margin: 0; color: #dc2626;">${reminderType}</h3>
            <p style="margin: 8px 0 0 0;">${reminderText}</p>
          </div>
          <a href="${
            process.env.NEXT_PUBLIC_APP_URL || 'https://migranja.app'
          }/dashboard" 
             style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Ver en Dashboard
          </a>
        </div>
      `,
      text: `Recordatorio: ${reminderType}

Hola${userName ? ` ${userName}` : ''},

${reminderText}

Visita tu dashboard: ${
        process.env.NEXT_PUBLIC_APP_URL || 'https://migranja.app'
      }/dashboard`,
      tags: [
        { name: 'type', value: 'reminder' },
        { name: 'category', value: sanitizeTagValue(reminderType) }
      ]
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
    error
  }
}
