# Mi Granja

Spanish-language farm management app (multi-tenant). Tracks animals, breeding, reminders, sales, and farm collaborators.

## Stack

Next.js 16 (App Router) + TypeScript + React 19 + Tailwind CSS 4 + Redux Toolkit + Firebase (Auth / Firestore / Storage) + Brevo (email). Monorepo: pnpm workspaces + Turborepo.

## Apps

- `apps/dashboard` — main app (dashboard.migranja.app)
- `apps/landing` — landing page (migranja.app, Astro 5)
- `packages/shared` — `@mi-granja/shared` domain types + utils

## Quick start

```bash
pnpm install
cp apps/dashboard/.env.example apps/dashboard/.env.local  # configure Firebase + Brevo
pnpm emulators            # Firebase emulators (optional)
pnpm dev:dashboard        # http://localhost:3000
pnpm dev:landing          # http://localhost:3001
```

## Documentation

All project documentation lives in [`docs/`](./docs/README.md). Entry points:

- **[docs/README.md](./docs/README.md)** — full index
- [docs/architecture.md](./docs/architecture.md) — stack, layout, data flow
- [docs/commands.md](./docs/commands.md) — pnpm/turbo commands
- [docs/conventions.md](./docs/conventions.md) — code style, rules
- [docs/features/](./docs/features/) — per-feature specs
- [docs/decisions/](./docs/decisions/) — ADRs
- [docs/GLOSSARY.md](./docs/GLOSSARY.md) — Spanish ganadero vocabulary
- [docs/roadmap.md](./docs/roadmap.md) — pending / done / dropped

LLM agents: see [`CLAUDE.md`](./CLAUDE.md) and [`llms.txt`](./llms.txt).

## License

Private.
