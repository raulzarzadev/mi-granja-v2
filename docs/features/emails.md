---
title: Email Service
description: Brevo integration via /api/send route and useEmail hook
audience: llm+human
last_updated: 2026-06-12
---

# Email Service

## Provider

**Brevo** (env: `BREVO_API_KEY`). Earlier versions used Resend — migrated.

## Endpoint

`POST /api/send`

```json
{
  "to": "user@example.com",
  "subject": "...",
  "html": "...",
  "text": "...",
  "tags": ["signup", "welcome"]
}
```

Tags are sanitized — only `[a-z0-9_-]` allowed.

## Hook — `useEmail`

```ts
const { sendEmail, sendWelcomeEmail, sendReminderEmail } = useEmail()
```

## Security rule

Never expose error details to client. Log server-side only; return generic messages.

## Upgrade plan emails

`ModalUpgradePlan` sends 2 emails per request:
1. Owner (`raulzarza.dev@gmail.com`) — notification
2. User — confirmation

## Marketing emails

Admin-only endpoint:

`POST /api/admin/marketing-email`

```json
{
  "recipientMode": "all",
  "template": "app_updates",
  "subject": "Nueva mejora disponible",
  "message": "Texto del correo en formato plano.",
  "ctaText": "Abrir Mi Granja",
  "ctaUrl": "https://dashboard.migranja.app"
}
```

Supported `recipientMode`: `all`, `userIds`, `emails`. The API verifies Firebase auth,
requires an admin user, renders the shared `emailTemplate`, sends through Brevo, and records a
summary in `marketingEmailCampaigns`.

Templates:
- `basic` — simple branded message with optional CTA.
- `app_updates` — update announcement. Lines starting with `-`, `*`, or `•` render as highlighted update items.

Marketing consent:
- User preference is stored at `notificationPreferences/{userId}.marketingEmailEnabled`.
- Missing preference defaults to enabled for existing users.
- Marketing campaigns skip users where `marketingEmailEnabled === false`.
- Emails include a signed unsubscribe link: `/api/marketing/unsubscribe?token=...`.
