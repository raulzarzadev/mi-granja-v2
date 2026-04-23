---
title: Code Conventions
description: Linting rules, import patterns, client directives, and domain-specific conventions
audience: llm+human
last_updated: 2026-04-23
---

# Code Conventions

## Linter — Biome 2.4.4

Config: `biome.json` at root. Replaced ESLint in Feb 2026.

- Formatter: 2-space indent, single quotes, no semicolons, 100-char line width
- `noExplicitAny`: off
- `useExhaustiveDependencies`: off
- a11y rules: disabled (not previously enforced)
- `.astro` files excluded (not fully supported by Biome)
- Unused vars prefixed with `_` are allowed

Known warnings (~57) in existing code — not blocking: `noAsyncPromiseExecutor`, `useHookAtTopLevel`, `useJsxKeyInIterable`.

## Language

- All UI text, type field names, comments, and domain logic use **Spanish**.
- Technical terms (types, hooks, function names) use English.
- See [GLOSSARY.md](./GLOSSARY.md) for ganadero vocabulary.

## Client components

All client components must have `'use client'` directive at the top.

## Date handling

- Never use raw `new Date()` for user input — timezone issues.
- Use `DateTimeInput` component and utilities from `@/lib/dateUtils` (proxy to `@mi-granja/shared`).
- See [features/dates.md](./features/dates.md).

## Firebase config

Loaded from `NEXT_PUBLIC_FIREBASE_CONFIG` env var (single JSON string) in `apps/dashboard/.env.local`.

## Shared package rule

When adding new shared types or utilities:
1. Add them to `packages/shared/src/types/` or `packages/shared/src/lib/`.
2. Export from `packages/shared/src/index.ts`.
3. Dashboard re-export proxies in `apps/dashboard/src/types/` and `apps/dashboard/src/lib/` forward automatically — no change needed unless adding a new file.

## Backup sync rule (CRITICAL)

When modifying types in `packages/shared/src/types/` (adding/removing/renaming fields on `Animal`, `BreedingRecord`, `Reminder`, `Sale`, etc.):

1. Update `apps/dashboard/src/lib/backup-serialization.ts`:
   - Add date fields to `DATE_FIELDS_BY_COLLECTION` and `KNOWN_DATE_FIELD_NAMES`
   - Update `BACKUP_SCHEMA` descriptions
2. Update `apps/dashboard/src/components/ModalRestoreBackup.tsx`:
   - Update hardcoded JSON schema shown in "Ver formato requerido del archivo"

This keeps backup export/import functional and UI docs in sync.

## AnimalSelector — canonical animal picker

`apps/dashboard/src/components/inputs/AnimalSelector.tsx` is the unified component for searching/selecting animals. Use it everywhere. Supports:
- `single` / `multi` mode
- chips
- search dropdown
- `fixedIds`
- `filterFn`

## UI reuse and states

Always reuse existing buttons/components. Ensure every interactive element has:
- `hover` state
- `cursor-pointer`
- `disabled` state
- `loading` state

## API error details

**Never** expose error details to the client. API routes return generic messages; log details server-side only.

## Agent-specific rules

When editing UI, the `ux-ganadero` agent ([agents/ux-ganadero.md](./agents/ux-ganadero.md)) reviews for:
- Touch targets ≥44px
- Text ≥16px normal, ≥14px secondary
- Spanish ganadero vocabulary
- Loading/empty/error states visible
- Mobile-first

## Related

- [architecture.md](./architecture.md)
- [GLOSSARY.md](./GLOSSARY.md)
