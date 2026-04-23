---
title: "ADR-001: Adopt pnpm + Turborepo monorepo"
status: accepted
date: 2026-02-27
description: Migrated from single Next.js app to monorepo with shared package for domain types/utilities
---

# ADR-001: Adopt pnpm + Turborepo monorepo

## Status
Accepted — implemented Feb 2026.

## Context

Original repo was a single Next.js app (`apps/dashboard/` content at root). We needed:
- A separate landing page (migranja.app) independent from dashboard (dashboard.migranja.app)
- Shared domain types and utilities between apps without publishing to npm
- Coordinated builds and caching

## Decision

Adopt **pnpm workspaces + Turborepo**:
- `apps/dashboard` — existing Next.js dashboard
- `apps/landing` — new Astro 5 landing page
- `packages/shared` — `@mi-granja/shared` with domain types + pure utilities
- Root `turbo.json` for pipeline
- Root `tsconfig.base.json` extended by each package

## Consequences

### Positive
- Types shared without npm publish
- Turbo caches builds across CI and local
- Per-app dev/build/test filtering (`pnpm dev:dashboard`)
- Landing can use Astro (static) while dashboard stays on Next.js

### Negative
- More complex setup for new contributors
- Re-export proxies needed in `apps/dashboard/src/types/` and `src/lib/` to preserve `@/types/*` imports

## Alternatives considered

- **Nx** — heavier, more opinionated
- **Publish shared as private npm package** — slower iteration
- **Duplicate types** — rejected, sync burden

## Related

- [architecture.md](../architecture.md)
