---
title: "ADR-003: Biome replaces ESLint + Prettier"
status: accepted
date: 2026-02-27
description: Single tool for linting and formatting. Faster, simpler config.
---

# ADR-003: Biome replaces ESLint + Prettier

## Status
Accepted — Biome 2.4.4. Migrated during monorepo setup.

## Context

ESLint + Prettier dual config had:
- Duplicate config files per package
- Slow runs across monorepo
- Conflicts between ESLint auto-fix and Prettier

## Decision

Use **Biome 2.4.4** at monorepo root (`biome.json`). Single tool for lint + format.

### Config highlights
- 2-space indent, single quotes, no semicolons, 100-char line width
- `noExplicitAny`: off
- `useExhaustiveDependencies`: off
- a11y rules disabled (not previously enforced — future ADR may re-enable)
- `.astro` files excluded (not fully supported)
- Unused vars prefixed with `_` allowed

## Consequences

### Positive
- ~10x faster than ESLint
- Single config file
- No ESLint/Prettier conflicts
- Built-in formatter

### Negative
- ~57 existing warnings (noAsyncPromiseExecutor, useHookAtTopLevel, useJsxKeyInIterable) — not blocking; technical debt to clear over time
- Some ESLint plugins lack Biome equivalents
- Astro files need a separate formatter

## Related

- [conventions.md](../conventions.md)
