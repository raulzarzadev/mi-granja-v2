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
- Billing con Stripe y tiers por cantidad de animales activos
- Landing pricing section
- Fix old version migration
- Monorepo migration (pnpm + Turborepo, Feb 2026)
- Biome replacing ESLint

## Dropped

- **Conekta / MercadoPago** — no integrados. Stripe es el procesador elegido; ver [ADR-006](./decisions/006-stripe-animal-tiers.md).

## Related

- [features/billing.md](./features/billing.md)
- [decisions/](./decisions/)
