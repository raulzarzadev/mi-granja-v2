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
