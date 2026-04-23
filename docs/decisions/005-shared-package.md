---
title: "ADR-005: Extract @mi-granja/shared for types and pure utilities"
status: accepted
date: 2026-02-27
description: Domain types and pure utils live in packages/shared, re-exported by dashboard proxies
---

# ADR-005: Extract `@mi-granja/shared`

## Status
Accepted — alongside monorepo migration (ADR-001).

## Context

Dashboard and landing both need:
- Domain types (Animal, Farm, BreedingRecord, Sale, etc.)
- Date utilities (timezone-safe)
- Firestore helpers (`serializeObj`, `firebase` init)
- Domain logic (`animalBreedingConfig`, `animal-utils`, `records`)

Duplicating these across apps was untenable.

## Decision

Create `packages/shared` as `@mi-granja/shared`:
- `src/types/` — TypeScript interfaces (single source of truth for domain shape)
- `src/lib/` — pure utilities (no React, no Next.js imports)
- `src/index.ts` — barrel export

Dashboard keeps `@/types/*` and `@/lib/*` imports via re-export proxy files in `apps/dashboard/src/types/` and `src/lib/`.

## Consequences

### Positive
- Single source of truth for domain types
- Testable in isolation (77 tests in shared)
- Both apps consume same types/utilities
- Zero import changes in dashboard (proxies preserve paths)

### Negative
- Adding a new shared file requires matching proxy in dashboard (if import must stay under `@/types/*`)
- Build order matters: shared → dashboard/landing (handled by turbo)

## Rule

When adding new shared types/utils:
1. Add to `packages/shared/src/{types,lib}/`
2. Export from `packages/shared/src/index.ts`
3. Add proxy in dashboard if import path must match historical pattern

## Related

- [architecture.md](../architecture.md)
- [conventions.md](../conventions.md)
