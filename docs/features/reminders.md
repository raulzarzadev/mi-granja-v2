---
title: Recordatorios y Notificaciones
description: Modelo, flujos, FCM push, email digest, escalado overdue, asignación a colaboradores
audience: llm+human
last_updated: 2026-05-05
---

# Recordatorios y Notificaciones

Sistema de recordatorios manuales con notificaciones multicanal: push web (FCM), email digest (Brevo) y badge in-app.

## Modelo de datos

### `Reminder` (`packages/shared/src/types/index.ts`)

```ts
{
  id, farmerId, farmId,
  animalNumber?    // legacy (deprecated, mantener por compat)
  animalNumbers?: string[],
  title, description, dueDate, completed,
  completionByAnimal?: Record<string, boolean>,
  priority: 'low' | 'medium' | 'high',
  type: 'medical' | 'breeding' | 'feeding' | 'weight' | 'other',
  assigneeIds?: string[],          // userIds que reciben aviso. Vacío => farmerId
  notifiedAt?: Date,               // último digest enviado
  lastOverdueNotifiedAt?: Date,    // último escalado 7d
  createdAt, updatedAt
}
```

### `NotificationPreferences` — `notificationPreferences/{userId}`

```ts
{
  userId,
  pushEnabled: boolean,
  emailEnabled: boolean,
  fcmTokens: string[],   // un user puede tener varios dispositivos
  updatedAt
}
```

## Canales

### 1. Push web (FCM)

- Service worker dinámico: `app/firebase-messaging-sw.js/route.ts` sirve JS con `NEXT_PUBLIC_FIREBASE_CONFIG` inyectado al build/runtime
- Cliente: `lib/fcmClient.ts` (`requestFcmToken`, `subscribeForegroundMessages`)
- Hook usuario: `hooks/useFcmRegistration.ts` — pide permiso, obtiene token, hace `arrayUnion` en `notificationPreferences/{uid}.fcmTokens`
- Server send: `lib/fcm-admin.ts` (`sendPushToUser`) usa `firebase-admin/messaging`. Limpia tokens inválidos automáticamente
- Notification click → abre `/recordatorios` (handler en SW dinámico)

### 2. Email (Brevo)

- Server helper: `lib/brevo.ts` (`sendBrevoEmail`) — llama directo a Brevo API, no depende de auth de usuario (necesario en cron)
- Template: `lib/emailTemplates/reminderDigest.ts` — secciones Atrasados / Hoy / Próximos 3 días con escape HTML

### 3. Badge in-app

- `useReminders.getBadgeCount()` = today + overdue del usuario actual
- Mostrado en tab "📆 Recordatorios" del Dashboard

## Cron jobs

Ambos protegidos con `Authorization: Bearer ${CRON_SECRET}` (Vercel inyecta automáticamente). Configurados en `apps/dashboard/vercel.json`.

### Digest diario — `/api/cron/reminders/digest` (07:00 CDMX / 13:00 UTC)

1. Query Firestore: `reminders` con `completed == false` y `dueDate <= now+3d`
2. Agrupa por destinatario (`assigneeIds[]` o `farmerId`)
3. Para cada destinatario con reminders hoy o atrasados:
   - Si `emailEnabled`: envía digest HTML
   - Si `pushEnabled` y `fcmTokens.length > 0`: envía push (título según count, body con primeros 3 títulos)
4. Marca `notifiedAt = now` en reminders del día (batch de 500)

### Escalado overdue — `/api/cron/reminders/overdue-escalation` (08:00 CDMX / 14:00 UTC)

1. Query: `completed == false` y `dueDate < now-7d`
2. Filtra los con `lastOverdueNotifiedAt` < 7 días atrás
3. Push extra a destinatarios con `pushEnabled`
4. Marca `lastOverdueNotifiedAt = now`

## Audiencia / asignación

- Sin `assigneeIds`: notifica al `farmerId` (dueño del recordatorio)
- Con `assigneeIds`: notifica a cada userId listado
- UI: `components/inputs/InputSelectAssignees.tsx` — chips con dueño + colaboradores activos del farm
- Filtro "Asignados a mí" en `RemindersTab`

## Carga de reminders en cliente

`useReminders` hace **dos queries** y mergea por id:
1. `farmerId == me` (mis propios)
2. `assigneeIds array-contains me` (asignados a mí)

Esto permite que colaboradores vean reminders sin ser dueños.

## Índices Firestore (`firebase/firestore.indexes.json`)

```
reminders:
  - completed ASC, dueDate ASC                       (cron queries)
  - assigneeIds array-contains, completed, dueDate   (asignados a mí)
  - farmerId, completed, dueDate                     (mis propios)
```

## Variables de entorno

| Variable | Scope | Descripción |
|----------|-------|-------------|
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | client | VAPID public key para FCM (Firebase Console → Cloud Messaging → Web Push certificates) |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | server | JSON service account (mismo que ya usa firebase-admin para impersonation) |
| `CRON_SECRET` | server | Bearer secret para proteger `/api/cron/*`. Vercel lo inyecta auto en jobs declarados en `vercel.json` |
| `BREVO_API_KEY` | server | Ya existente. Reutilizado para digest |
| `NEXT_PUBLIC_APP_URL` | server | URL pública. Default `https://dashboard.migranja.app` |

## Backup sync (CRÍTICO)

Los nuevos campos del `Reminder` (`assigneeIds`, `notifiedAt`, `lastOverdueNotifiedAt`) ya están registrados en:
- `apps/dashboard/src/lib/backup-serialization.ts` (DATE_FIELDS_BY_COLLECTION + KNOWN_DATE_FIELD_NAMES + BACKUP_TYPE_DESCRIPTIONS)
- `apps/dashboard/src/components/ModalRestoreBackup.tsx` (descripción JSON)

`notificationPreferences/` es per-user (no farm-scope), por lo tanto **no entra en el backup de granja**.

## Verificación end-to-end

```bash
# 1. Activar push en Profile → ver token guardado en Firestore
# 2. Crear reminder con dueDate = hoy + assigneeIds = [yo]
# 3. Disparar cron manual (curl) — local
curl -H "Authorization: Bearer $CRON_SECRET" \
     http://localhost:3000/api/cron/reminders/digest

# 4. Backdate reminder a -8 días → cron escalación
curl -H "Authorization: Bearer $CRON_SECRET" \
     http://localhost:3000/api/cron/reminders/overdue-escalation

# 5. Toggle off email en Profile → repetir digest → no email, sí push
# 6. Backup/restore → reminders con nuevos campos intactos
```

## Pendientes / fuera de scope (para futuras fases)

- Recurrencia (`every N days`)
- Snooze (`snoozedUntil`)
- Auto-creación desde eventos de reproducción / cambio de etapa
- Preferencias por tipo (silenciar `weight` solamente, etc.)
- Quiet hours (no enviar entre 22-08)
