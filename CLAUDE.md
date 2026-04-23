# CLAUDE.md

Entry point for Claude Code (claude.ai/code) and other LLM agents.

## Canonical documentation

**All project documentation lives in [`docs/`](./docs/README.md)** and is indexed by [`llms.txt`](./llms.txt) at the root. Start there.

## Quick links

- [docs/README.md](./docs/README.md) — Documentation index
- [docs/architecture.md](./docs/architecture.md) — Stack, monorepo layout, data flow
- [docs/conventions.md](./docs/conventions.md) — Code style, backup sync rule, language
- [docs/commands.md](./docs/commands.md) — pnpm/turbo commands
- [docs/GLOSSARY.md](./docs/GLOSSARY.md) — Spanish ganadero vocabulary
- [docs/roadmap.md](./docs/roadmap.md) — Pending / done / dropped
- [docs/features/](./docs/features/) — Per-feature specs (auth, billing, animals, etc.)
- [docs/decisions/](./docs/decisions/) — ADRs (monorepo, no-Stripe Lugares, Biome, Redux, shared pkg)
- [docs/agents/ux-ganadero.md](./docs/agents/ux-ganadero.md) — UX reviewer sub-agent

## Project summary

Mi Granja — Spanish-language farm management app (multi-tenant). Next.js 16 App Router + Firebase + Redux Toolkit + Tailwind CSS 4. pnpm + Turborepo monorepo (`apps/dashboard`, `apps/landing`, `packages/shared`). All UI, type field names, and domain logic in Spanish. Business model: admin-managed "Lugares" (no payment integrations).

## Hard rules (read the full conventions doc before coding)

- Client components: `'use client'` directive required
- Dates: never raw `new Date()` for user input — use `DateTimeInput` + `dateUtils`
- Firestore Timestamps: serialize with `serializeObj()` before dispatching to Redux
- Animal picker: always use `AnimalSelector` (`apps/dashboard/src/components/inputs/AnimalSelector.tsx`)
- Pro gates: use `ModalUpgradePlan` and `ProFeatureBanner` — no custom upgrade UI
- Shared types: add to `packages/shared/` and export from `src/index.ts`
- **Backup sync (CRITICAL)**: modifying types in `packages/shared/src/types/` requires updating `apps/dashboard/src/lib/backup-serialization.ts` AND `apps/dashboard/src/components/ModalRestoreBackup.tsx` — see [docs/features/backups.md](./docs/features/backups.md)
- API errors: never expose details to client — log server-side, return generic messages

## Environment variables

Required in `apps/dashboard/.env.local`:
`NEXT_PUBLIC_FIREBASE_CONFIG`, `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `BREVO_API_KEY`, `NEXT_PUBLIC_APP_URL`
