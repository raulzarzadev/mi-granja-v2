---
title: Animals
description: Animal CRUD, stages (cría/destetado/adulto), AnimalSelector, ID distinction
audience: llm+human
last_updated: 2026-04-23
---

# Animals

## Types

`packages/shared/src/types/animals.tsx` — `Animal`, stage types, icons/colors/labels (single source of truth for stage display).

## ID distinction

- `animal.id` — Firestore document ID (opaque)
- `animalNumber` — human-readable (e.g., `001`, `002`), generated per type with zero-padding

Migration utility generates unique numbers per animal type.

## Hook — `useAnimalCRUD`

Standard CRUD + `updateAnimalPartial` for partial updates.

## Stage computation

Authoritative rule (confirmed 2026-04-22): `computeAnimalStage` uses `ageDays` vs `weaningDays` as the criterion. **Age wins.** Animal is `cría` only while `ageDays < weaningDays`.

## AnimalSelector — CANONICAL picker

`apps/dashboard/src/components/inputs/AnimalSelector.tsx`

**Use everywhere** an animal picker is needed. Features:
- `single` / `multi` mode
- Chips for selected
- Search dropdown
- `fixedIds` — force include/exclude
- `filterFn` — custom filter

## States in UI

- `activo` — default
- `vendido` — see [features/billing.md](./billing.md) context not applicable; see sale records
- `muerto` — dead
- `perdido` — lost (pending feature, see [roadmap.md](../roadmap.md))
- `destetado` — weaned

## Mass operations

- Registro masivo — Pro feature (gated). See [features/billing.md](./billing.md#gated-features).

## Related

- [features/breeding.md](./breeding.md) (if present)
- [GLOSSARY.md](../GLOSSARY.md)
- [features/backups.md](./backups.md) — sync rule when changing Animal type
