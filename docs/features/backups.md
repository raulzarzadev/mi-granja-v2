---
title: Backup & Restore
description: Export/import pipeline and CRITICAL sync rule when changing shared types
audience: llm+human
last_updated: 2026-09-04
---

# Backup & Restore

## Export

Serializes Firestore data (animals, breedings, reminders, sales, etc.) to JSON. Handles Firestore Timestamps via `backup-serialization.ts`.

## Import

Modal: `ModalRestoreBackup`. Shows the JSON guide generated with `JSON.stringify` from `src/lib/backup-format.ts` in "Ver formato requerido del archivo".

## CRITICAL sync rule

When modifying types in `packages/shared/src/types/` (adding/removing/renaming fields on `Animal`, `BreedingRecord`, `Reminder`, `Sale`, etc.):

### 1. `apps/dashboard/src/lib/backup-serialization.ts`
- Add date fields to `DATE_FIELDS_BY_COLLECTION`
- Add date field names to `KNOWN_DATE_FIELD_NAMES`
- Update `BACKUP_TYPE_DESCRIPTIONS` descriptions

### 2. `apps/dashboard/src/lib/backup-format.ts`
- Update `BACKUP_FORMAT`, used by "Ver formato requerido del archivo".
- Run the backup-format and backup-serialization tests. The guide must parse as JSON and its animal enum values must match the shared types.
- Required animal fields include `id`; type, stage, gender, optional status and required timestamps are validated before restoring.

Skipping this breaks export/import for the new field AND misleads users via stale UI docs.

## Gate

Backup/restore is a **Pro feature** — gate pending implementation. See [features/billing.md](./billing.md#currently-gated-features).

## Related

- [conventions.md](../conventions.md#backup-sync-rule-critical)
