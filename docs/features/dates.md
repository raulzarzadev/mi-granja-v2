---
title: Date Handling
description: Never use raw new Date() for user input. Use DateTimeInput + dateUtils.
audience: llm+human
last_updated: 2026-04-23
---

# Date Handling

## Rule

**Never use `new Date()` for user input.** Causes timezone bugs (historical incident documented).

## Canonical utilities

Import from shared:
```ts
import { /* date helpers */ } from '@mi-granja/shared'
// or via proxy:
import { /* ... */ } from '@/lib/dateUtils'
```

Files:
- `packages/shared/src/lib/dateUtils.ts`
- `packages/shared/src/lib/dates.ts`

## Canonical input component

`DateTimeInput` — use for all user-facing date entry. Handles timezone correctly.

## Firestore Timestamps

Always serialize via `serializeObj()` from `@mi-granja/shared` before dispatching to Redux. Redux state must never hold Firestore Timestamp instances (non-serializable).

## Related

- [conventions.md](../conventions.md#date-handling)
