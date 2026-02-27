'use client'

import React, { useState } from 'react'
import { useEmail } from '@/hooks/useEmail'

const EMAIL_TEST = process.env.NEXT_PUBLIC_RESEND_TEST_EMAIL || 'test@example.com'
const NAME_TEST = process.env.NEXT_PUBLIC_RESEND_TEST_NAME || 'Usuario'

const EmailTestComponent: React.FC = () => {
  const { sendEmail, sendWelcomeEmail, sendReminderEmail, isLoading, error } = useEmail()
  const [emailResult, setEmailResult] = useState<string>('')

  const handleSendBasicEmail = async () => {
    try {
      const result = await sendEmail({
        to: EMAIL_TEST,
        subject: `Email de prueba para ${NAME_TEST}`,
        html: '<h1>¡Hola!</h1><p>Este es un email de prueba desde Mi Granja.</p>',
        text: '¡Hola! Este es un email de prueba desde Mi Granja.',
      })
      setEmailResult(`Email enviado exitosamente: ${JSON.stringify(result.data, null, 2)}`)
    } catch (err) {
      setEmailResult(`Error: ${err instanceof Error ? err.message : 'Error desconocido'}`)
    }
  }

  const handleSendWelcomeEmail = async () => {
    try {
      const result = await sendWelcomeEmail({
        userName: NAME_TEST,
        userEmail: EMAIL_TEST,
      })
      setEmailResult(`Email de bienvenida enviado: ${JSON.stringify(result.data, null, 2)}`)
    } catch (err) {
      setEmailResult(`Error: ${err instanceof Error ? err.message : 'Error desconocido'}`)
    }
  }

  const handleSendReminderEmail = async () => {
    try {
      const result = await sendReminderEmail({
        userName: NAME_TEST,
        userEmail: EMAIL_TEST,
        reminderType: 'Vacunación de ganado',
        reminderText: 'Recuerda vacunar a las vacas del área norte mañana a las 8:00 AM.',
      })
      setEmailResult(`Email de recordatorio enviado: ${JSON.stringify(result.data, null, 2)}`)
    } catch (err) {
      setEmailResult(`Error: ${err instanceof Error ? err.message : 'Error desconocido'}`)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Prueba del Sistema de Emails</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button
          onClick={handleSendBasicEmail}
          disabled={isLoading}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
        >
          {isLoading ? 'Enviando...' : 'Email Básico'}
        </button>

        <button
          onClick={handleSendWelcomeEmail}
          disabled={isLoading}
          className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
        >
          {isLoading ? 'Enviando...' : 'Email Bienvenida'}
        </button>

        <button
          onClick={handleSendReminderEmail}
          disabled={isLoading}
          className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
        >
          {isLoading ? 'Enviando...' : 'Email Recordatorio'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      {emailResult && (
        <div className="bg-gray-100 border border-gray-300 rounded p-4">
          <h3 className="font-bold mb-2">Resultado:</h3>
          <pre className="whitespace-pre-wrap text-sm">{emailResult}</pre>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Configuración requerida</h2>
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p className="font-bold">Asegúrate de configurar:</p>
          <ul className="list-disc list-inside mt-2">
            <li>
              <code>RESEND_API_KEY</code> en tu archivo .env.local
            </li>
            <li>Verificar el dominio en Resend</li>
            <li>
              Configurar <code>NEXT_PUBLIC_APP_URL</code> si es necesario
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default EmailTestComponent
