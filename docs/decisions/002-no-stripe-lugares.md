---
title: "ADR-002: No payment integrations — admin-managed Lugares model"
status: accepted
date: 2026-03-15
description: Stripe/Conekta/MercadoPago removed. Admin manually assigns "places" to users.
---

# ADR-002: No payment integrations — admin-managed "Lugares"

## Status
Accepted — implemented March 2026. Supersedes earlier billing experiments.

## Context

Initial plan was to integrate a payment processor (Stripe, later Conekta / MercadoPago evaluated for LatAm coverage). Goals:
- Monetize Pro plan
- Automate upgrade flow

Blockers:
- Target market (ganaderos LatAm) has low card penetration and distrust of online card entry
- Compliance overhead (tax registration, invoicing per jurisdiction) significant for early stage
- Conekta and MercadoPago integrations evaluated, both added complexity disproportionate to MVP revenue

## Decision

**Remove all payment integrations.** Replace with admin-managed plan:

- **Free**: 1 granja, 0 colaboradores
- **Pro**: admin assigns N `places` to user. Each `place` = 1 extra granja OR 1 colaborador (user decides spending)
- Payment/activation handled **outside** the system (bank transfer, cash, whatever)
- Admin adjusts `places` manually from admin panel

## Consequences

### Positive
- Zero payment integration maintenance
- No PCI scope
- Matches customer payment habits
- Unified quota abstraction ("place" > separate farm/collab quotas)

### Negative
- Manual admin intervention per upgrade
- No self-service billing
- Upgrade requests go via email form (`ModalUpgradePlan`)

## Implementation

See [features/billing.md](../features/billing.md) for full details:
- Types in `packages/shared/src/types/billing.ts`
- Redux `billingSlice`
- Hook `useBilling`
- API routes `/api/billing/*` and `/api/admin/billing`
- Canonical UI: `ModalUpgradePlan`, `ProFeatureBanner`
- Firestore: `subscriptions/{userId}` with `places: number`

## Alternatives considered

- **Stripe Checkout** — card friction in LatAm
- **Conekta** — MX-only, integration complexity high
- **MercadoPago** — integration complexity, fee structure unfavorable at low volume
- **OXXO / bank-transfer via processor** — still requires processor + reconciliation

## Related

- [features/billing.md](../features/billing.md)
- [roadmap.md](../roadmap.md)
