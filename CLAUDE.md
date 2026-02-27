# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mi Granja is a Spanish-language farm management app (multi-tenant) built with Next.js App Router. It tracks animals, breeding records, reminders, and farm collaborators. All UI text, type field names, comments, and domain logic use Spanish.

## Commands

```bash
pnpm dev              # Dev server with Turbopack
pnpm build            # Production build
pnpm lint             # ESLint
pnpm type-check       # tsc --noEmit + lint
pnpm test             # Jest unit tests
pnpm test -- --testPathPattern="path/to/test"  # Run a single test
pnpm test:watch       # Jest watch mode
pnpm test:e2e         # Cypress headless
pnpm test:e2e:dev     # Cypress interactive
```

Package manager: **pnpm**

## Architecture

**Stack**: Next.js 16 (App Router) + TypeScript + Firebase (Firestore/Auth) + Redux Toolkit + Tailwind CSS 4

**Path alias**: `@/*` maps to `./src/*`

### Source layout (`src/`)

- **`app/`** — Next.js App Router pages and API routes. Root layout wraps everything in `<Providers>` (Redux store + `AuthInitializer`).
- **`features/`** — Redux Toolkit slices organized by domain: `auth`, `animals`, `breeding`, `reminders`, `farm`. Each slice has standard CRUD reducers. `store.ts` combines all slices.
- **`hooks/`** — Custom hooks that bridge Redux state and Firestore. Each domain has a CRUD hook (e.g., `useAnimalCRUD`, `useBreedingCRUD`, `useFarmCRUD`). Hooks dispatch Redux actions and call Firestore directly.
- **`components/`** — UI components. Modal system uses a base `Modal.tsx` + domain-specific wrappers (e.g., `ModalAnimalForm`). Forms use react-hook-form + Zod schemas.
- **`types/`** — TypeScript interfaces for all domain models. Key files: `animals.tsx` (Animal, enums), `farm.ts` (Farm, FarmInvitation, FarmPermission), `breedings.ts`, `collaborators.ts`.
- **`lib/`** — Utilities: `firebase.ts` (init), `dateUtils.ts` (date parsing/formatting with date-fns), `animal-utils.ts`, `userUtils.ts`.

### Data flow

1. Component calls a hook function (e.g., `createAnimal(data)`)
2. Hook calls Firestore and dispatches Redux action
3. Redux state updates, component re-renders via `useSelector`

Firestore Timestamps are serialized to plain objects via `serializeObj()` in `features/libs/serializeObj.ts` before dispatching to Redux.

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
- Email service uses Resend via `/api/send` route

## Environment Variables

Required in `.env.local`: `NEXT_PUBLIC_FIREBASE_CONFIG`, `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL`
