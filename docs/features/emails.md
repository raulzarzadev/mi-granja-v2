---
title: Email Service
description: Brevo integration via /api/send route and useEmail hook
audience: llm+human
last_updated: 2026-04-23
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
