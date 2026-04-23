---
title: "ADR-004: Redux Toolkit over React Context"
status: accepted
date: 2025
description: Migrated global state from Context to Redux Toolkit slices for scalability
---

# ADR-004: Redux Toolkit over React Context

## Status
Accepted. Migrated during dashboard's early growth phase.

## Context

Original state managed via React Context:
- Re-render churn as app grew
- Nested providers
- Harder to test in isolation
- No devtools

## Decision

Adopt **Redux Toolkit** with one slice per domain:
- `auth`, `animals`, `breeding`, `reminders`, `farm`, `billing`
- Combined in `apps/dashboard/src/features/store.ts`
- CRUD hooks (`useAnimalCRUD`, `useBreedingCRUD`, etc.) bridge Redux + Firestore

## Consequences

### Positive
- Predictable state transitions
- Redux DevTools
- Slice-level testing (see test-utils.tsx with all 6 reducers)
- Scales to many domains without provider hell

### Negative
- Boilerplate vs Context for trivial state
- Firestore Timestamps must be serialized (`serializeObj()`) before dispatch

## Related

- [architecture.md](../architecture.md)
