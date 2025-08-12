# Mi Granja 2 – Plataforma de Gestión de Granjas

Aplicación web moderna (Next.js + Firebase + Redux Toolkit + Tailwind) para administrar granjas, animales, colaboraciones, recordatorios y flujos de reproducción, con soporte para impersonación de administradores y un sistema robusto de roles/permisos.

---

## ✨ Funcionalidades Principales

- Autenticación (email/password + enlace mágico) y manejo avanzado de sesión
- Sistema de granjas multi‑tenant: granjas propias, invitaciones (pending / accepted / revoked / rejected)
- Gestión de colaboradores con roles y permisos por módulo
- Impersonación de usuarios para administradores (acciones rastreables)
- CRUD de animales, reproducción, áreas y recordatorios
- Sistema de modales reutilizables + formularios desacoplados
- Envío de emails (Resend) con plantillas y tags sanitizados
- Estado global con Redux Toolkit (migrado desde Context) + hooks especializados
- Testing (Jest + RTL + Cypress) con base de mocks y cobertura de flujos clave

---

## 🛠 Stack Técnico

| Capa         | Tecnología                             |
| ------------ | -------------------------------------- |
| Framework    | Next.js (App Router)                   |
| Lenguaje     | TypeScript                             |
| UI           | React 19 + Tailwind CSS                |
| Estado       | Redux Toolkit (slices por dominio)     |
| Backend BaaS | Firebase Auth + Firestore              |
| Emails       | Resend API                             |
| Tests        | Jest / React Testing Library / Cypress |

---

## 📦 Instalación Rápida

```bash
pnpm install   # o npm install / yarn
cp .env.example .env.local  # crea tu archivo de entorno
pnpm dev
```

### Variables de Entorno Básicas

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
```

---

## 🏗 Arquitectura y Estructura

```
src/
   app/                # Rutas Next.js (App Router) + layout/providers
   components/         # UI y modales (Atom > Molecule > Feature)
   features/           # Slices y lógica de dominio (auth, farm, animals,...)
   hooks/              # Hooks reutilizables (useAuth, useFarmCRUD, useEmail,...)
   lib/                # Config Firebase, helpers, fechas, etc.
   types/              # Tipos centrales (farm, animals, collaborators)
   __tests__/          # Unit/integration tests
   integration/        # (si aplica) pruebas futuras
cypress/              # E2E tests
```

Principios:

1. Dominio primero: cada feature encapsula slice + hooks + tipos auxiliares.
2. Componentes “wrapper” para modales; formularios puros y reutilizables.
3. Permisos derivados del rol (DEFAULT_PERMISSIONS) + helper `hasPermissions`.

---

## 🔐 Autenticación & Sesión

Métodos soportados:

1. Email / Password.
2. Enlace mágico (passwordless).

Hook `useAuth` expone:

```
{ user, isLoading, error, login, register, logout,
   loginWithEmailLink, completeEmailLinkSignIn, isEmailLinkSignIn,
   startImpersonation, stopImpersonation }
```

Redux authSlice añade campos para impersonación: `originalUser`, `impersonatingUser`, `impersonationToken`.

---

## 👥 Roles y Permisos

Roles: admin, manager, caretaker, veterinarian, viewer.
Cada rol define `defaultPermissions` (modules: animals, breeding, reminders, areas, collaborators, reports con acciones CRUD).
Utilidades:

```
DEFAULT_PERMISSIONS[role]
getDefaultPermissionsByRole(role)
hasPermissions(module, action|[actions])
```

Uso típico:

```ts
if (hasPermissions('collaborators','delete')) { /* mostrar botón eliminar */ }
```

---

## 🎭 Impersonación de Administradores

- Solo `admin` (y owner implícito) inicia impersonación.
- Indicador visual persistente en navbar.
- `wrapWithAdminMetadata(data, reason?)` anexa:

```ts
{
   adminAction: { performedByAdmin: true, adminId, adminEmail, originalTimestamp, impersonationReason? }
}
```

- Parar impersonación limpia el estado en Redux.

---

## 🏡 Granjas & Invitaciones

Estado en slice farm:

```
{ myFarms[], invitationFarms[], currentFarm, ... }
```

Invitaciones (colección `farmInvitations`) con status: `pending | accepted | rejected | expired | revoked`.
Acciones clave:

- Aceptar / Rechazar (usuario invitado)
- Revocar (admin/manager/update permission) → estado temporal
- Eliminar (solo permiso delete collaborators)

UI FarmSwitcherBar agrupa “Mis Granjas” y “Invitaciones y Accesos” mostrando íconos (⏳ pendiente, ✅ aceptada) y rol.

---

## 📬 Sistema de Emails (Resend)

Endpoint `/api/send`:

```json
POST { to, subject, html?, text?, tags? }
```

Hook `useEmail`:

```
sendEmail(payload) | sendWelcomeEmail | sendReminderEmail
```

Sanitiza tags (solo [a-z0-9_-]). Variables útiles: `RESEND_TEST_EMAIL`, `RESEND_TEST_NAME`.

---

## 🧩 Sistema de Modales

Base: `<Modal />` + hook `useModal()`.
Wrappers: `ModalAnimalForm`, `ModalBreedingForm`, `ModalCreateFarm`, etc.
Patrón: formulario desacoplado + modal wrapper + trigger opcional.

---

## 🐄 Gestión de Animales & Migración de IDs

- Distinción entre `animal.id` (Firestore) y `animalNumber` (legible).
- Acción `updateAnimalPartial` para updates parciales.
- Migración genera números únicos por tipo (relleno con ceros: 001, 002...).

---

## 🧪 Testing

Herramientas: Jest + React Testing Library + Cypress.
Estado resumido:

- authSlice, useAuth, breeding forms: tests pasando.
- Hooks CRUD verificados con tests básicos.
- E2E: flujos auth y app (pendiente validación completa).

Scripts:

```bash
pnpm test              # unit
pnpm run test:watch
pnpm run test:coverage
pnpm cypress:open      # UI
pnpm cypress:run       # headless
```

---

## � Reglas Básicas Firestore (ejemplo simplificado)

```js
match /animals/{id} { allow read, write: if request.auth != null && request.auth.uid == resource.data.farmerId; }
```

Extender para colecciones: farms, farmInvitations, breeding, reminders, areas.

---

## � Deploy

Recomendado: Vercel.
Pasos:

1. Configura variables en panel del proyecto.
2. `pnpm build`
3. Deploy automático desde rama principal.

Firebase Hosting (alternativa): `firebase init hosting && pnpm build && firebase deploy`.

---

## 🧹 Limpieza Realizada

Se consolidó documentación previa (migraciones, testing, impersonación, modales, emails) en este README y se eliminaron archivos .md redundantes.

---

## 🗺 Roadmap Próximo

- Reportes avanzados (export CSV/PDF)
- Seguimiento de peso y producción lechera
- Notificaciones push / email programadas
- Auditoría detallada de acciones admin

---

**Hecho con ❤️ para los granjeros que alimentan al mundo.** 🌾
