---
title: Roadmap
description: Pending features, completed, and dropped. Authoritative board lives in GitHub Projects.
audience: llm+human
last_updated: 2026-04-23
---

# Roadmap

> **Source of truth**: GitHub Projects in `raulzarzadev/mi-granja-v2` (project #4). Notion board deprecated.

## Pending

| Feature              | Notes                                                         |
|----------------------|---------------------------------------------------------------|
| Lost animal status   | Nuevo tipo de estado para animales perdidos                   |
| Collaborators UX     | Flujo propio de invitación/gestión de colaboradores           |
| BackOffice           | Panel admin de plataforma (más allá del impersonate actual)   |
| SEO measurement      | Analytics y SEO en landing                                    |

## Done (do NOT re-add to board)

- Dead animals (state + flow)
- Sale animals (sale record + state)
- Revertir parto
- Tab configuración de razas
- Edición masiva de animales
- Billing "Lugares" model (admin-managed, no Stripe)
- Landing pricing section
- Fix old version migration
- Monorepo migration (pnpm + Turborepo, Feb 2026)
- Biome replacing ESLint

## Dropped

- **Stripe / Conekta / MercadoPago** — payment integrations evaluated and removed. Replaced by admin-managed "Lugares" model. See [decisions/002-no-stripe-lugares.md](./decisions/002-no-stripe-lugares.md).

## Related

- [features/billing.md](./features/billing.md)
- [decisions/](./decisions/)
