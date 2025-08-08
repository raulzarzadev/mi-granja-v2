/**
 * Ejemplos de uso de la API de envío de emails
 * Endpoint: POST /api/send
 */

// Ejemplo 1: Email básico
const basicEmail = {
  to: ['usuario@ejemplo.com'],
  subject: 'Bienvenido a Mi Granja',
  html: '<h1>¡Hola!</h1><p>Bienvenido a nuestra plataforma.</p>',
  text: 'Hola! Bienvenido a nuestra plataforma.'
}

// Ejemplo 2: Email con múltiples destinatarios y opciones avanzadas
const advancedEmail = {
  to: ['usuario1@ejemplo.com', 'usuario2@ejemplo.com'],
  cc: ['admin@migranja.app'],
  bcc: ['logs@migranja.app'],
  from: 'Mi Granja <no-reply@migranja.app>',
  reply_to: 'soporte@migranja.app',
  subject: 'Recordatorio importante',
  html: `
    <div style="font-family: Arial, sans-serif;">
      <h2>Recordatorio</h2>
      <p>No olvides revisar tus animales hoy.</p>
      <a href="https://migranja.app/dashboard" style="background: #007bff; color: white; padding: 10px; text-decoration: none;">
        Ver Dashboard
      </a>
    </div>
  `,
  text: 'Recordatorio: No olvides revisar tus animales hoy. Visita: https://migranja.app/dashboard',
  tags: [
    { name: 'category', value: 'reminder' },
    { name: 'priority', value: 'high' }
  ]
}

// Función de ejemplo para usar la API desde el frontend
async function sendEmail(emailData: any) {
  try {
    const response = await fetch('/api/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    })

    const result = await response.json()

    if (result.success) {
      console.log('Email enviado:', result.data)
      return result.data
    } else {
      throw new Error(result.error)
    }
  } catch (error) {
    console.error('Error enviando email:', error)
    throw error
  }
}

// Ejemplo de uso
/*
// Enviar email básico
sendEmail(basicEmail)
  .then(data => console.log('Email enviado exitosamente:', data))
  .catch(error => console.error('Error:', error))

// Enviar email avanzado
sendEmail(advancedEmail)
  .then(data => console.log('Email enviado exitosamente:', data))
  .catch(error => console.error('Error:', error))
*/

// Ejemplo 3: Email específico de granja con tags optimizados
const farmEmail = {
  to: ['ganadero@ejemplo.com'],
  subject: 'Recordatorio: Vacunación de ganado',
  html: `
    <div style="font-family: Arial, sans-serif;">
      <h2>🐄 Recordatorio de Vacunación</h2>
      <p>Es hora de vacunar a los animales del área norte.</p>
      <ul>
        <li>📅 Fecha: Mañana 8:00 AM</li>
        <li>📍 Ubicación: Área Norte - Corral A</li>
        <li>💉 Vacuna: Triple viral bovina</li>
        <li>🔢 Animales: 25 cabezas</li>
      </ul>
      <a href="https://migranja.app/reminders" style="background: #10b981; color: white; padding: 10px; text-decoration: none;">
        Ver Detalles
      </a>
    </div>
  `,
  text: 'Recordatorio: Vacunación de ganado mañana a las 8:00 AM en el área norte.',
  tags: [
    { name: 'type', value: 'reminder' },
    { name: 'category', value: 'vaccination' },
    { name: 'animal_type', value: 'cattle' },
    { name: 'priority', value: 'high' },
    { name: 'farm_area', value: 'north' }
  ]
}

export { basicEmail, advancedEmail, farmEmail, sendEmail }
