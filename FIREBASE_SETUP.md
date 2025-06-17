# Configuración de Firebase para Mi Granja

## 📋 Configuración Inicial

### 1. Crear Proyecto Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto llamado "mi-granja-app"
3. Habilita Google Analytics (opcional)

### 2. Configurar Authentication

#### Métodos de Autenticación Habilitados:

1. **Email/Password**:

   - Ve a Authentication > Sign-in method
   - Habilita "Email/Password"

2. **Email Link (Passwordless)**:
   - Ve a Authentication > Sign-in method
   - Habilita "Email link (passwordless sign-in)"
   - Configura los dominios autorizados:
     - `localhost` (para desarrollo)
     - `tu-dominio.com` (para producción)

#### Configuración de Dominios Autorizados:

En Authentication > Settings > Authorized domains, asegúrate de tener:

- `localhost` (para desarrollo)
- `tu-dominio-de-produccion.com`

### 3. Configurar Firestore Database

1. Ve a Firestore Database
2. Crea la base de datos en modo test o producción
3. Configura las reglas de seguridad:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Reglas para usuarios: solo pueden acceder a sus propios datos
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Reglas para animales: solo el propietario puede acceder
    match /animals/{animalId} {
      allow read, write: if request.auth != null &&
        request.auth.uid == resource.data.farmerId;
      allow create: if request.auth != null &&
        request.auth.uid == request.resource.data.farmerId;
    }
  }
}
```

### 4. Configurar Variables de Entorno

Ya está configurado en `.env.local` con las credenciales del proyecto.

## 🔧 Configuración Específica para Email Link

### Templates de Email (Opcional)

Para personalizar los emails de autenticación:

1. Ve a Authentication > Templates
2. Personaliza el template "Email address sign-in"
3. Puedes cambiar:
   - Remitente del email
   - Nombre del remitente
   - Asunto
   - Contenido del email

### Configuración de Action URLs

Los enlaces de acción se configuran automáticamente para apuntar a:

- Desarrollo: `http://localhost:3000/auth/complete`
- Producción: `https://tu-dominio.com/auth/complete`

## 📱 Uso de la Autenticación

### Login con Email/Password

1. Usuario ingresa email y contraseña
2. Sistema autentica directamente con Firebase

### Login con Email Link

1. Usuario selecciona "Enlace por email"
2. Ingresa solo su email
3. Sistema envía enlace a su correo
4. Usuario hace clic en el enlace
5. Es redirigido a `/auth/complete` para completar el login

## 🔐 Configuración de Seguridad

### Configuración Recomendada

1. **Password Policy**: Mínimo 6 caracteres (ya configurado)
2. **Rate Limiting**: Firebase maneja automáticamente
3. **Domain Verification**: Solo dominios autorizados
4. **Email Verification**: Opcional, se puede habilitar

### Configuración de Email Templates

Personaliza los mensajes en Authentication > Templates:

- **Verification email**: Para verificar emails nuevos
- **Password reset email**: Para resetear contraseñas
- **Email address change email**: Para cambios de email
- **Email address sign-in**: Para enlaces de autenticación

## 🚀 Deploy a Producción

### Hosting con Firebase

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login en Firebase
firebase login

# Inicializar proyecto
firebase init hosting

# Construir y deployar
npm run build
firebase deploy
```

### Variables de Entorno en Producción

Asegúrate de configurar las variables de entorno en tu plataforma de deployment:

- Vercel: Ve a Project Settings > Environment Variables
- Netlify: Ve a Site Settings > Environment Variables

## 🔍 Testing

### Probar Email Link en Desarrollo

1. Configura un servidor de email local o usa un servicio como Mailtrap
2. O verifica en la consola del navegador el enlace generado
3. Copia y pega el enlace en otra pestaña para probarlo

### Verificar Configuración

```javascript
// Verificar que Firebase esté configurado
console.log('Firebase App:', firebase.app())
console.log('Auth configured:', firebase.auth())
console.log('Firestore configured:', firebase.firestore())
```

## ❗ Troubleshooting

### Errores Comunes

1. **auth/invalid-api-key**: Verificar variables de entorno
2. **auth/unauthorized-domain**: Agregar dominio a authorized domains
3. **auth/invalid-action-code**: Link expirado o ya usado
4. **auth/expired-action-code**: Solicitar nuevo enlace

### Debug Mode

Para desarrollo, puedes habilitar logs detallados:

```javascript
// En firebase.ts
import { connectAuthEmulator } from 'firebase/auth'

if (process.env.NODE_ENV === 'development') {
  connectAuthEmulator(auth, 'http://localhost:9099')
}
```

---

¡Con esta configuración tendrás ambos métodos de autenticación funcionando perfectamente! 🚀
