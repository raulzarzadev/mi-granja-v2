import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

// Inicializar Resend
const resend = new Resend(process.env.RESEND_API_KEY)

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

export async function POST(request: NextRequest) {
  try {
    // Verificar que la API key esté configurada
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'RESEND_API_KEY no está configurada'
        },
        { status: 500 }
      )
    }

    // Obtener el cuerpo de la petición
    const emailData: EmailRequest = await request.json()

    // Validación básica
    if (
      !emailData.to ||
      (Array.isArray(emailData.to) && emailData.to.length === 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Se requiere al menos un destinatario'
        },
        { status: 400 }
      )
    }

    if (!emailData.subject) {
      return NextResponse.json(
        {
          success: false,
          error: 'El asunto del email es requerido'
        },
        { status: 400 }
      )
    }

    if (!emailData.html && !emailData.text) {
      return NextResponse.json(
        {
          success: false,
          error: 'Se requiere contenido HTML o texto'
        },
        { status: 400 }
      )
    }

    // Preparar el contenido de texto (Resend requiere text)
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

    const textContent: string =
      emailData.text || (emailData.html ? htmlToText(emailData.html) : '')

    // Preparar los datos para Resend (text obligatorio)
    const emailPayload = {
      to: emailData.to,
      subject: emailData.subject,
      from: emailData.from || 'Mi Granja <zarza@email.migranja.app>',
      text: textContent,
      html: emailData.html
    }

    // Agregar campos opcionales
    const withOptional = {
      ...emailPayload,
      ...(emailData.cc ? { cc: emailData.cc } : {}),
      ...(emailData.bcc ? { bcc: emailData.bcc } : {}),
      ...(emailData.reply_to ? { reply_to: emailData.reply_to } : {}),
      ...(emailData.tags ? { tags: emailData.tags } : {})
    }

    // Enviar el email usando Resend
    const data = await resend.emails.send(withOptional)

    return NextResponse.json(
      {
        success: true,
        message: 'Email enviado exitosamente',
        data: data
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error enviando email:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

// Método GET para verificar el estado del servicio
export async function GET() {
  try {
    // Verificar configuración
    const isConfigured = !!process.env.RESEND_API_KEY

    return NextResponse.json({
      service: 'Email Service',
      status: 'online',
      configured: isConfigured,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      {
        service: 'Email Service',
        status: 'error',
        error: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
