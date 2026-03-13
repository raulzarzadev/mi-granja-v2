# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mi Granja is a Spanish-language farm management app (multi-tenant) built with Next.js App Router. It tracks animals, breeding records, reminders, and farm collaborators. All UI text, type field names, comments, and domain logic use Spanish.

## Monorepo Structure

This is a **pnpm workspaces + Turborepo** monorepo with the following packages:

```
mi-granja-2/
├── apps/
│   ├── dashboard/          ← main app (dashboard.migranja.app)
│   │   ├── src/
│   │   ├── cypress/
│   │   ├── public/
│   │   ├── package.json
│   │   └── next.config.ts
│   └── landing/            ← landing page (migranja.app)
│       ├── src/app/
│       ├── public/
│       └── package.json
├── packages/
│   └── shared/             ← @mi-granja/shared
│       ├── src/types/      ← domain types (animals, farm, breedings, etc.)
│       ├── src/lib/        ← shared utilities (firebase, dates, serializeObj, etc.)
│       └── src/index.ts    ← barrel export
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
└── package.json
```

## Commands

```bash
# Monorepo-wide (from root)
pnpm install              # Install all deps
pnpm build                # Build everything (shared → dashboard + landing)
pnpm dev                  # Dev all apps
pnpm lint                 # Lint all packages
pnpm type-check           # TypeScript check all packages
pnpm test                 # Run all tests

# Filtered (from root)
pnpm dev:dashboard        # Dev dashboard on port 3000
pnpm dev:landing          # Dev landing on port 3001
pnpm build:dashboard      # Build dashboard only
pnpm build:landing        # Build landing only

# From within apps/dashboard/
pnpm test                 # Jest unit tests
pnpm test -- --testPathPattern="path/to/test"  # Single test
pnpm test:watch           # Jest watch mode
pnpm test:e2e             # Cypress headless
pnpm test:e2e:dev         # Cypress interactive
```

Package manager: **pnpm** (workspaces)

## Architecture

**Stack**: Next.js 16 (App Router) + TypeScript + Firebase (Firestore/Auth) + Redux Toolkit + Tailwind CSS 4

### Shared package (`packages/shared/`)

Contains domain types and pure utilities shared across apps:
- **`src/types/`** — TypeScript interfaces: `animals.tsx`, `farm.ts`, `breedings.ts`, `collaborators.ts`, `comment.tsx`, `date.ts`, `records.ts`
- **`src/lib/`** — Utilities: `firebase.ts`, `dateUtils.ts`, `dates.ts`, `serializeObj.ts`, `animalBreedingConfig.ts`, `animal-utils.ts`, `records.ts`, `catchError.ts`

### Dashboard app (`apps/dashboard/`)

**Path alias**: `@/*` maps to `./src/*`

Re-export proxies in `src/types/` and `src/lib/` forward to `@mi-granja/shared`, so existing `@/types/*` and `@/lib/*` imports work without changes.

- **`src/app/`** — Next.js App Router pages and API routes. Root layout wraps everything in `<Providers>` (Redux store + `AuthInitializer`).
- **`src/features/`** — Redux Toolkit slices organized by domain: `auth`, `animals`, `breeding`, `reminders`, `farm`. Each slice has standard CRUD reducers. `store.ts` combines all slices.
- **`src/hooks/`** — Custom hooks that bridge Redux state and Firestore. Each domain has a CRUD hook (e.g., `useAnimalCRUD`, `useBreedingCRUD`, `useFarmCRUD`). Hooks dispatch Redux actions and call Firestore directly.
- **`src/components/`** — UI components. Modal system uses a base `Modal.tsx` + domain-specific wrappers (e.g., `ModalAnimalForm`). Forms use react-hook-form + Zod schemas. **`AnimalSelector`** (`src/components/inputs/AnimalSelector.tsx`) is the unified component for searching and selecting animals — use it everywhere an animal picker is needed (supports `single`/`multi` mode, chips, search dropdown, `fixedIds`, `filterFn`).
- **`src/lib/`** — Dashboard-specific utilities: `adminActions.ts`, `userUtils.ts`, `migrateBreedings.ts`. Other lib files are re-export proxies from shared.

### Data flow

1. Component calls a hook function (e.g., `createAnimal(data)`)
2. Hook calls Firestore and dispatches Redux action
3. Redux state updates, component re-renders via `useSelector`

Firestore Timestamps are serialized to plain objects via `serializeObj()` from `@mi-granja/shared` before dispatching to Redux.

### Auth

Firebase Auth with two methods: email/password and passwordless magic link (completes at `/auth/complete`). `AuthInitializer` in `providers.tsx` subscribes to `onAuthStateChanged` and loads user + farm data into Redux on login.

### Permissions

Collaborator roles: admin, manager, caretaker, veterinarian, viewer. Permissions are per-module (animals, breeding, reminders, areas, collaborators, reports, invitations). Check with `hasPermissions(module, action)` from `useFarmPermissions`.

### Admin impersonation

Admins can impersonate users via `/api/admin/impersonate`. All impersonated actions are tracked with `wrapWithAdminMetadata()` from `lib/adminActions.ts`.

## Code Conventions

- ESLint: `@typescript-eslint/no-explicit-any` is off; `react-hooks/exhaustive-deps` is off; unused vars prefixed with `_` are allowed
- All client components must have `'use client'` directive
- Date handling: use `DateTimeInput` component and utilities from `lib/dateUtils.ts` — never use raw `new Date()` for user input (timezone issues documented in `MEJORAS_FECHAS.md`)
- Firebase config loaded from `NEXT_PUBLIC_FIREBASE_CONFIG` env var (JSON string)
- Email service uses Brevo via `/api/send` route
- When adding new shared types or utilities, add them to `packages/shared/` and create re-export proxies in the dashboard if needed

## Business Model & Roadmap

### Freemium Model

MiGranja operates under a **Freemium** pricing model:

- **Free plan**: 1 user, 1 farm, full feature access
- **Paid plan**: $250 MXN/month per additional farm, $250 MXN/month per additional collaborator
- Example: 3 farms + 2 collaborators = $1,000 MXN/month
- Annual plan with discount (% TBD)

### Payment Integrations (planned)

| Platform     | Purpose                                         |
|-------------|--------------------------------------------------|
| **Stripe**       | Primary — cards, recurring subscriptions         |
| **Conekta**      | Mexico — OXXO cash, SPEI bank transfers          |
| **MercadoPago**  | Broad LATAM coverage                             |

### Billing Rules

- Monthly recurring subscription via Stripe
- Charges based on active farms and collaborators at end of month
- 3-day grace period on payment failure
- Suspend access to extra farms/collaborators after non-payment
- Webhook-driven activation/deactivation of farms and users

### Pending Features (from Notion board)

| Feature           | Status       | Notes                                              |
|-------------------|--------------|----------------------------------------------------|
| Stripe integration | Not started  | Checkout, portal, webhooks in dashboard API        |
| Upgrade flow UI    | Not started  | In-app flow to add farms/collaborators             |
| Annual plan discount | Not started | Define % and implement in billing                |
| Conekta (OXXO)    | Not started  | Evaluate for cash payment support in Mexico        |
| MercadoPago        | Not started  | LATAM expansion                                    |
| Lost animal status | Not started  | New animal status type                             |
| Collaborators UX   | Not started  | Own logic/flow for adding collaborators            |
| BackOffice         | Not started  | Admin panel for platform management                |
| SEO measurement    | Not started  | Analytics and SEO for landing page                 |
| Landing pricing section | Not started | Update landing to show freemium tiers         |

### Data Model Changes Needed for Billing

The current Firestore model (`Farm`, `User`, `FarmCollaborator`) has **no billing fields**. Future work must add:
- Subscription status and plan tier to `Farm` or a new `subscriptions` collection
- Usage limits enforcement (farm count, collaborator count) in hooks
- A `billingSlice` in Redux for subscription state
- API routes: `/api/billing/checkout`, `/api/billing/webhook`, `/api/billing/portal`

## Environment Variables

Required in `apps/dashboard/.env.local`: `NEXT_PUBLIC_FIREBASE_CONFIG`, `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `BREVO_API_KEY`, `NEXT_PUBLIC_APP_URL`

Future env vars for billing: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `CONEKTA_API_KEY` (when integrated)
