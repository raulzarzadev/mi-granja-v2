# API de Envío de Emails

Esta API permite enviar emails usando Resend desde tu aplicación Next.js.

## Configuración

### 1. Variables de entorno

Agrega en tu archivo `.env.local`:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
```

### 2. Verificación de dominio

- Ve a [Resend Dashboard](https://resend.com/domains)
- Agrega y verifica tu dominio
- Configura los registros DNS requeridos

## Endpoints

### POST `/api/send`

Envía un email.

#### Request Body:

```typescript
{
  to: string | string[]           // Destinatarios (requerido)
  subject: string                 // Asunto (requerido)
  html?: string                   // Contenido HTML
  text?: string                   // Contenido texto plano
  from?: string                   // Remitente (default: Mi Granja <zarza@email.migranja.app>)
  cc?: string | string[]          // Con copia
  bcc?: string | string[]         // Con copia oculta
  reply_to?: string | string[]    // Responder a
  tags?: Array<{name: string, value: string}> // Tags para tracking
}
```

#### Response:

```typescript
{
  success: boolean
  message?: string
  data?: any        // Datos de respuesta de Resend
  error?: string    // Mensaje de error si success = false
}
```

### GET `/api/send`

Verifica el estado del servicio.

#### Response:

```typescript
{
  service: "Email Service"
  status: "online" | "error"
  configured: boolean
  timestamp: string
}
```

## Uso desde React

### Hook personalizado:

```typescript
import { useEmail } from '@/hooks/useEmail'

const MyComponent = () => {
  const { sendEmail, isLoading, error } = useEmail()

  const handleSend = async () => {
    try {
      await sendEmail({
        to: 'usuario@ejemplo.com',
        subject: 'Mi asunto',
        html: '<h1>Hola!</h1>'
      })
    } catch (err) {
      console.error('Error:', err)
    }
  }

  return (
    <button onClick={handleSend} disabled={isLoading}>
      {isLoading ? 'Enviando...' : 'Enviar Email'}
    </button>
  )
}
```

### Desde cualquier lugar:

```typescript
const response = await fetch('/api/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'usuario@ejemplo.com',
    subject: 'Hola mundo',
    html: '<p>¡Funciona!</p>'
  })
})

const result = await response.json()
```

## Ejemplos de uso

### Email básico:

```typescript
await sendEmail({
  to: 'usuario@ejemplo.com',
  subject: 'Hola mundo',
  html: '<h1>¡Hola!</h1><p>Este es mi primer email.</p>'
})
```

### Email con múltiples destinatarios:

```typescript
await sendEmail({
  to: ['usuario1@ejemplo.com', 'usuario2@ejemplo.com'],
  cc: ['admin@migranja.app'],
  subject: 'Recordatorio grupal',
  html: '<h2>Recordatorio</h2><p>No olviden la reunión.</p>',
  tags: [
    { name: 'category', value: 'reminder' },
    { name: 'priority', value: 'high' }
  ]
})
```

### Email de bienvenida (usando hook):

```typescript
const { sendWelcomeEmail } = useEmail()

await sendWelcomeEmail({ userEmail: 'nuevo@usuario.com', userName: 'Juan Pérez' })
```

### Email de recordatorio (usando hook):

```typescript
const { sendReminderEmail } = useEmail()

await sendReminderEmail({
  userEmail: 'usuario@ejemplo.com',
  reminderType: 'Vacunación',
  reminderText: 'Recuerda vacunar el ganado mañana',
  userName: 'María'
})
```

## Plantillas predefinidas

El hook `useEmail` incluye funciones para tipos comunes de email:

- `sendWelcomeEmail({ userEmail, userName? })` - Email de bienvenida
- `sendReminderEmail({ userEmail, reminderType, reminderText, userName? })` - Email de recordatorio

## Testing

Usa el componente `<EmailTestComponent />` para probar la funcionalidad:

```typescript
import EmailTestComponent from '@/components/EmailTestComponent'

// En tu página de desarrollo
<EmailTestComponent />
```

## Tags y Validación

Resend tiene restricciones estrictas para los tags:

- ✅ Solo letras ASCII (a-z, A-Z)
- ✅ Números (0-9)
- ✅ Guiones bajos (\_)
- ✅ Guiones (-)
- ❌ Espacios, acentos, símbolos especiales

### Sanitización automática:

El hook `useEmail` automáticamente sanitiza los tags:

```typescript
// ❌ Antes: Tag inválido
{ name: 'categoría', value: 'recordatorio médico' }

// ✅ Después: Tag sanitizado
{ name: 'categoria', value: 'recordatorio_medico' }
```

### Ejemplos de tags válidos:

```typescript
tags: [
  { name: 'type', value: 'reminder' },           // ✅ Válido
  { name: 'category', value: 'vaccination' },    // ✅ Válido
  { name: 'priority', value: 'high' },          // ✅ Válido
  { name: 'animal_type', value: 'cattle' },     // ✅ Válido
  { name: 'farm_id', value: 'farm_123' }        // ✅ Válido
]
```

## Limitaciones de Resend

- **Sandbox**: 100 emails/día (dominio no verificado)
- **Producción**: Sin límites con dominio verificado
- **Rate limit**: 10 requests/segundo por defecto

## Troubleshooting

### Error: "RESEND_API_KEY no está configurada"

- Verifica que la variable esté en `.env.local`
- Reinicia el servidor de desarrollo

### Error: "Domain not verified"

- Verifica tu dominio en Resend Dashboard
- Usa un email `from` con tu dominio verificado

### Error: 429 (Rate limit)

- Implementa retry logic
- Considera usar una cola de emails para volúmenes altos

## Seguridad

- ✅ API key nunca se expone al cliente
- ✅ Validación de datos en servidor
- ✅ Manejo de errores apropiado
- 🔄 TODO: Implementar autenticación para el endpoint
- 🔄 TODO: Rate limiting por usuario/IP
