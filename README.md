# Mi Granja - Gestión de Ganado

Una aplicación web moderna para granjeros que necesitan gestionar su ganado de manera eficiente. Construida con Next.js, Firebase, Redux Toolkit y Tailwind CSS.

## 🚀 Características

- **Autenticación**: Registro e inicio de sesión con Firebase Auth
- **Gestión de Animales**: CRUD completo para registro de ganado
- **Dashboard Intuitivo**: Vista general con estadísticas en tiempo real
- **Diseño Mobile-First**: Optimizado para uso en teléfonos móviles
- **Tiempo Real**: Sincronización automática de datos con Firestore
- **Filtros y Búsqueda**: Encuentra rápidamente tus animales

## 🛠️ Tecnologías

- **Frontend**: Next.js 15.3 + React 19 + TypeScript
- **Styling**: Tailwind CSS 4.0
- **Estado Global**: Redux Toolkit + React-Redux
- **Backend**: Firebase (Auth + Firestore)
- **Deployment**: Vercel (recomendado)

## 📦 Instalación y Configuración

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar Firebase

1. Crear un proyecto en [Firebase Console](https://console.firebase.google.com/)
2. Habilitar Authentication (Email/Password)
3. Crear base de datos Firestore
4. Copiar las credenciales del proyecto

### 3. Variables de entorno

Editar `.env.local` con tus credenciales de Firebase:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id
```

### 4. Ejecutar en desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 🐄 Uso Básico

### Registro de Usuario

1. Abre la aplicación
2. Haz clic en "¿No tienes cuenta? Regístrate"
3. Completa el formulario con email, contraseña y nombre de granja
4. Inicia sesión

### Gestión de Animales

1. En el dashboard, haz clic en "+ Agregar Animal"
2. Completa la información del animal:
   - ID único del animal
   - Tipo (oveja, vaca lechera, vaca de engorda, etc.)
   - Etapa (cría, engorda, lechera, reproductor, descarte)
   - Género, peso, edad
   - Información de padres (opcional)
   - Notas adicionales
3. Guarda el animal

### Filtros y Búsqueda

- Usa los filtros por tipo y etapa
- Busca por ID de animal o notas
- Las estadísticas se actualizan automáticamente

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run dev

# Construcción para producción
npm run build

# Iniciar aplicación construida
npm start

# Linting
npm run lint
```

## 🏗️ Estructura del Proyecto

```
src/
├── app/                    # App Router de Next.js
├── components/            # Componentes reutilizables
├── features/              # Features organizadas por dominio
├── hooks/                # Custom hooks
├── lib/                  # Utilidades y configuración
├── store/                # Redux store
└── types/                # Tipos TypeScript
```

## 🔮 Próximas Características

- [ ] Gestión de reproducción y montas
- [ ] Seguimiento de destetes
- [ ] Producción lechera
- [ ] Historial de peso
- [ ] Reportes y exportación
- [ ] Notificaciones y recordatorios

---

**¡Hecho con ❤️ para los granjeros que alimentan al mundo!** 🌾
