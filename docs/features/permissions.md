---
title: Permissions & Roles
description: Role-based per-module permission system with hasPermissions helper
audience: llm+human
last_updated: 2026-04-23
---

# Permissions & Roles

## Roles

| Role         | Description                                 |
|--------------|---------------------------------------------|
| admin        | Platform-level admin (can impersonate)      |
| manager      | Full operational control over a farm        |
| caretaker    | Day-to-day animal operations                |
| veterinarian | Health records focus                        |
| viewer       | Read-only                                   |

## Modules

- `animals`
- `breeding`
- `reminders`
- `areas`
- `collaborators`
- `reports`
- `invitations`

Each module supports CRUD actions: `create`, `read`, `update`, `delete`.

## Helpers

```ts
import { DEFAULT_PERMISSIONS, getDefaultPermissionsByRole } from '@/lib/...'
import { useFarmPermissions } from '@/hooks/useFarmPermissions'

const { hasPermissions } = useFarmPermissions()

if (hasPermissions('collaborators', 'delete')) {
  // show delete button
}

// Multiple actions (AND):
if (hasPermissions('animals', ['read', 'update'])) { ... }
```

## Per-role defaults

`DEFAULT_PERMISSIONS[role]` defines base permissions. Collaborators can have custom overrides stored per-farm.

## Related

- [features/auth.md](./auth.md)
- [features/farms.md](./farms.md)
