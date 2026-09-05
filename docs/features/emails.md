---
title: Email Service
description: Brevo integration via /api/send route and useEmail hook
audience: llm+human
last_updated: 2026-09-04
---

# Email Service

## Provider

**Brevo** (env: `BREVO_API_KEY`). Earlier versions used Resend — migrated.

## Endpoint

`POST /api/send` requires a Firebase ID token. Free-form emails require a platform administrator.

```json
{
  "to": "user@example.com",
  "subject": "...",
  "html": "...",
  "text": "...",
  "tags": [{ "name": "type", "value": "welcome" }]
}
```

Tags sent by the `useEmail` hook are sanitized to `[a-z0-9_-]`.

Ordinary accounts use structured operations instead of specifying recipients or HTML:

```json
{ "purpose": "invitation", "invitationId": "existing-invitation-id" }
```

```json
{ "purpose": "pro-request", "granjas": 1, "colaboradores": 2 }
```

The server loads the invitation, verifies farm permissions and expiration, and builds the message. Pro recipients come from the server and authenticated identity. Transactional requests allow 20 operations/hour/account with a 60-second cooldown; free-form admin requests allow 100/hour. Limits use Firestore transactions and survive restarts.

## Hook — `useEmail`

```ts
const { sendEmail, sendWelcomeEmail, sendReminderEmail } = useEmail()
```

## Security rule

Never expose error details to client. Log server-side only; return generic messages.

## Upgrade plan emails

`ProFeatureBanner` makes one structured request; the server sends 2 emails:
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
