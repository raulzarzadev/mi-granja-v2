---
title: Mi Granja — Documentation Index
description: Central documentation for humans and LLMs. All project specs, features, decisions, and conventions live here.
audience: llm+human
last_updated: 2026-04-23
---

# Mi Granja — Documentation

Spanish-language farm management app (multi-tenant). Next.js App Router + Firebase + Redux Toolkit + Tailwind CSS 4. pnpm + Turborepo monorepo.

> **For LLMs**: start with [architecture.md](./architecture.md) and [GLOSSARY.md](./GLOSSARY.md). Every feature has a self-contained doc under `features/`. Past decisions live in `decisions/` as ADRs.

## Index

### Core
- [architecture.md](./architecture.md) — Monorepo layout, stack, data flow
- [conventions.md](./conventions.md) — Code style, import patterns, linter rules
- [commands.md](./commands.md) — pnpm/turbo commands
- [GLOSSARY.md](./GLOSSARY.md) — Domain vocabulary (Spanish ganadero)
- [roadmap.md](./roadmap.md) — Pending features, done, dropped

### Features
- [features/auth.md](./features/auth.md) — Auth (email/password + magic link) + impersonation
- [features/permissions.md](./features/permissions.md) — Roles, modules, `hasPermissions`
- [features/farms.md](./features/farms.md) — Farms, invitations, FarmSwitcherBar
- [features/animals.md](./features/animals.md) — Animals CRUD, stages, AnimalSelector
- [features/billing.md](./features/billing.md) — "Lugares" model, Pro gates
- [features/modals.md](./features/modals.md) — Modal system
- [features/emails.md](./features/emails.md) — Brevo email service
- [features/reminders.md](./features/reminders.md) — Recordatorios + notificaciones (FCM push, email digest, escalado overdue)
- [features/backups.md](./features/backups.md) — Backup export/import sync rules
- [features/dates.md](./features/dates.md) — Date handling conventions

### Agents (Claude sub-agents)
- [agents/ux-ganadero.md](./agents/ux-ganadero.md) — UX reviewer for farming users

### Decisions (ADRs)
- [decisions/001-monorepo.md](./decisions/001-monorepo.md) — Adopt pnpm + Turborepo monorepo
- [decisions/002-no-stripe-lugares.md](./decisions/002-no-stripe-lugares.md) — No payment integrations; admin-managed "Lugares"
- [decisions/003-biome-over-eslint.md](./decisions/003-biome-over-eslint.md) — Replace ESLint with Biome
- [decisions/004-redux-over-context.md](./decisions/004-redux-over-context.md) — Redux Toolkit over Context API
- [decisions/005-shared-package.md](./decisions/005-shared-package.md) — Extract `@mi-granja/shared` for types/utils

## Conventions for writing new docs

1. Use YAML frontmatter: `title`, `description`, `audience`, `last_updated`.
2. Absolute dates (`2026-04-23`), never "last week".
3. Self-contained: assume the LLM may read only this file.
4. Link related docs with relative paths.
5. Spanish for domain terms; English for technical terms.
6. Code fences with language (```ts, ```bash).
7. One H1 per file. Hierarchical H2/H3.
