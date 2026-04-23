---
title: Backup & Restore
description: Export/import pipeline and CRITICAL sync rule when changing shared types
audience: llm+human
last_updated: 2026-04-23
---

# Backup & Restore

## Export

Serializes Firestore data (animals, breedings, reminders, sales, etc.) to JSON. Handles Firestore Timestamps via `backup-serialization.ts`.

## Import

Modal: `ModalRestoreBackup`. Shows hardcoded JSON schema in "Ver formato requerido del archivo".

## CRITICAL sync rule

When modifying types in `packages/shared/src/types/` (adding/removing/renaming fields on `Animal`, `BreedingRecord`, `Reminder`, `Sale`, etc.):

### 1. `apps/dashboard/src/lib/backup-serialization.ts`
- Add date fields to `DATE_FIELDS_BY_COLLECTION`
- Add date field names to `KNOWN_DATE_FIELD_NAMES`
- Update `BACKUP_SCHEMA` descriptions

### 2. `apps/dashboard/src/components/ModalRestoreBackup.tsx`
- Update hardcoded JSON schema shown in "Ver formato requerido del archivo"

Skipping this breaks export/import for the new field AND misleads users via stale UI docs.

## Gate

Backup/restore is a **Pro feature** — gate pending implementation. See [features/billing.md](./billing.md#currently-gated-features).

## Related

- [conventions.md](../conventions.md#backup-sync-rule-critical)
