---
title: Architecture
description: Monorepo layout, tech stack, data flow, and package boundaries
audience: llm+human
last_updated: 2026-04-23
---

# Architecture

## Stack

| Layer        | Tech                                             |
|--------------|--------------------------------------------------|
| Framework    | Next.js 16 (App Router)                          |
| Language     | TypeScript (strict)                              |
| UI           | React 19 + Tailwind CSS 4                        |
| State        | Redux Toolkit (slices per domain)                |
| Backend      | Firebase Auth + Firestore + Storage              |
| Email        | Brevo via `/api/send`                            |
| Tests        | Jest + React Testing Library + Cypress + Playwright |
| Linter       | Biome 2.4.4                                      |
| Package mgr  | pnpm (workspaces) + Turborepo                    |

## Monorepo layout

```
mi-granja-2/
├── apps/
│   ├── dashboard/              # dashboard.migranja.app (Next.js 16)
│   │   ├── src/app/            # App Router pages + API routes
│   │   ├── src/components/     # UI + modals
│   │   ├── src/features/       # Redux slices (auth, animals, breeding, reminders, farm, billing)
│   │   ├── src/hooks/          # CRUD hooks bridging Redux + Firestore
│   │   ├── src/lib/            # Dashboard utilities + proxies to shared
│   │   └── src/types/          # Re-export proxies from shared
│   └── landing/                # migranja.app (Astro 5, port 3001)
├── packages/
│   └── shared/                 # @mi-granja/shared
│       ├── src/types/          # Animal, BreedingRecord, Farm, Reminder, Sale, billing...
│       └── src/lib/            # Pure utilities (firebase, dateUtils, serializeObj, etc.)
├── firebase/                   # Firebase emulators config
├── docs/                       # This documentation
├── pnpm-workspace.yaml
├── turbo.json
├── biome.json
└── tsconfig.base.json
```

## Path aliases

- Dashboard: `@/*` → `./src/*`
- Re-export proxies in `apps/dashboard/src/types/` and `apps/dashboard/src/lib/` forward to `@mi-granja/shared` so `@/types/*` and `@/lib/*` imports still work.

## Data flow

```
Component → Hook → Firestore + Redux dispatch → useSelector → re-render
```

1. Component calls hook function (e.g., `createAnimal(data)`).
2. Hook writes to Firestore AND dispatches Redux action.
3. Firestore Timestamps serialized via `serializeObj()` from `@mi-granja/shared` before dispatch.
4. Redux state updates; components re-render.

## Redux slices

`apps/dashboard/src/features/`:
- `auth` — user, impersonation state
- `animals` — animals CRUD
- `breeding` — breeding records
- `reminders` — reminders
- `farm` — myFarms, invitationFarms, currentFarm
- `billing` — subscription, usage, planType

Combined in `store.ts`.

## CRUD hooks

`apps/dashboard/src/hooks/`:
- `useAnimalCRUD`, `useBreedingCRUD`, `useFarmCRUD`, `useReminderCRUD`, `useBilling`

Each hook dispatches Redux actions and writes to Firestore directly. Components should use hooks, never call Firestore or dispatch manually.

## Providers

Root layout (`apps/dashboard/src/app/layout.tsx`) wraps everything in `<Providers>`:
- Redux store
- `AuthInitializer` — subscribes to `onAuthStateChanged`, loads user + farm data on login

## Firebase emulators

Local dev ports:
- Auth: 9299
- Firestore: 8180
- Storage: 9399
- Emulator UI: 4100

Start with `pnpm emulators` (data persists between runs, no seed script).

## Related

- [conventions.md](./conventions.md) — Code style
- [features/auth.md](./features/auth.md) — Auth details
- [features/permissions.md](./features/permissions.md) — Role model
