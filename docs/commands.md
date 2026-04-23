---
title: Commands
description: pnpm + Turborepo commands for dev, build, test, lint
audience: llm+human
last_updated: 2026-04-23
---

# Commands

Package manager: **pnpm** (workspaces). Task runner: **Turborepo**.

## From root (monorepo-wide)

```bash
pnpm install          # Install all deps
pnpm build            # Build everything (shared → dashboard + landing)
pnpm dev              # Dev all apps
pnpm lint             # Biome check all packages
pnpm type-check       # TypeScript check all packages
pnpm test             # Run all tests
pnpm emulators        # Start Firebase emulators (data persists)
```

## Filtered (from root)

```bash
pnpm dev:dashboard          # Dev dashboard on port 3000
pnpm dev:landing            # Dev landing on port 3001
pnpm build:dashboard        # Build dashboard only
pnpm build:landing          # Build landing only
pnpm --filter @mi-granja/dashboard test   # Dashboard tests only
pnpm --filter @mi-granja/shared test      # Shared tests only
```

## From `apps/dashboard/`

```bash
pnpm test                                        # Jest unit tests
pnpm test -- --testPathPattern="path/to/test"    # Single test
pnpm test:watch                                  # Jest watch mode
pnpm test:e2e                                    # Cypress headless
pnpm test:e2e:dev                                # Cypress interactive
```

## Emulator ports

- Auth: 9299
- Firestore: 8180
- Storage: 9399
- UI: 4100

## Test battery

- **Shared**: 7 test files, 77 tests (catchError, serializeObj, dateUtils, dates, animalBreedingConfig, animal-utils, records)
- **Dashboard**: 10 suites, 38 tests
- **Landing**: 1 suite, 4 tests (smoke: builds Astro + checks output)
