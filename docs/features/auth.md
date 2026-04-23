---
title: Auth + Impersonation
description: Email/password + passwordless magic link. Admin impersonation with tracked metadata.
audience: llm+human
last_updated: 2026-04-23
---

# Auth + Impersonation

## Methods

1. **Email + password** — standard Firebase Auth
2. **Passwordless magic link** — completes at `/auth/complete`

## Hook — `useAuth`

```ts
{
  user,
  isLoading,
  error,
  login,
  register,
  logout,
  loginWithEmailLink,
  completeEmailLinkSignIn,
  isEmailLinkSignIn,
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
