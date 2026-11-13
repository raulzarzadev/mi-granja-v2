---
title: Auth + Impersonation
description: Email code + Google sign-in. Admin impersonation with tracked metadata.
audience: llm+human
last_updated: 2026-06-12
---

# Auth + Impersonation

## Methods

1. **Email code** — `/api/auth/send-code` sends a 6-digit code and `/api/auth/verify-code` returns a Firebase custom token.
2. **Google** — client uses Firebase `GoogleAuthProvider`; `/api/auth/ensure-user` creates the Firestore user profile when needed.

## Hook — `useAuth`

```ts
{
  user,
  isLoading,
  error,
  logout,
  sendCode,
  verifyCode,
  loginWithGoogle,
  startImpersonation,
  stopImpersonation
}
```

## AuthInitializer

Lives in `apps/dashboard/src/app/providers.tsx`. Subscribes to `onAuthStateChanged` and loads user + farm data into Redux on login.

## Redux authSlice fields

Standard plus impersonation:
- `originalUser` — admin's own user
- `impersonatingUser` — target user
- `impersonationToken`

## Admin impersonation

- Only `admin` role (and owner implicit) can initiate.
- Route: `/api/admin/impersonate`.
- Persistent visual indicator in navbar while active.
- All impersonated writes wrapped via `wrapWithAdminMetadata(data, reason?)` from `apps/dashboard/src/lib/adminActions.ts`:

```ts
{
  adminAction: {
    performedByAdmin: true,
    adminId,
    adminEmail,
    originalTimestamp,
    impersonationReason?
  }
}
```

- `stopImpersonation` cleans Redux state.

## Related

- [features/permissions.md](./permissions.md)
- [architecture.md](../architecture.md)

## Estado de sesión en la portada

El encabezado de la landing muestra un esqueleto hasta recibir el estado de Firebase
mediante un iframe oculto del panel en `/auth/session-status`. Esa página no monta
los proveedores de datos de la granja y comunica únicamente un booleano, sin datos
del usuario ni tokens. Ambos extremos validan el origen y la landing también la
ventana emisora. Solo los dominios de la portada pueden embeber esta ruta; el resto
del panel conserva `X-Frame-Options: DENY`.

Con sesión se muestra «Ir a mi granja»; sin sesión, «Iniciar Sesión» y «Registrarse
Gratis». Si la comprobación falla o tarda más de diez segundos, aparecen los enlaces
de acceso. Sin JavaScript también quedan disponibles. La detección depende de que
el navegador permita la persistencia de Firebase del panel dentro del iframe;
no sustituye las comprobaciones de autenticación y permisos del panel.

## Fallos durante restauración de sesión

`useAuthInitialization` espera como máximo 15 segundos por la restauración de
Firebase o la lectura de perfil. Los errores muestran un estado recuperable con
«Reintentar», en vez de dejar indefinidamente `auth.user` pendiente. No se inventa
un perfil ni se interpreta un fallo de red como cierre de sesión. Se ignoran
lecturas de perfil antiguas tras logout, cambio de usuario o desmontaje.

En desarrollo, Firestore WebChannel pasa por el mismo origen del dashboard
(`/google.firestore.v1.Firestore/*`), con un rewrite de Next al puerto real del
emulador. Evita fallos de CORS/acceso local entre `dashboard.localhost` y
`127.0.0.1` en Safari al leer el perfil. Producción no habilita ese proxy.
