---
title: "ADR-006: Stripe subscriptions priced by active animals"
status: accepted
date: 2026-08-10
---

# ADR-006: Stripe subscriptions priced by active animals

## Context

The admin-managed “Lugares” model coupled price to farms and collaborators, made upgrades manual, and did not align cost with the producer's inventory size.

## Decision

- Use Stripe Checkout for new subscriptions and Stripe Customer Portal for self-service billing.
- Treat verified Stripe webhooks as the subscription authority.
- Price by active animal count across farms owned by the account.
- Exclude animals marked `muerto` or `vendido`.
- Do not charge for farms or collaborators.
- Keep `planType: free | pro` temporarily for existing feature gates while storing the precise `tierId`.
- Use fixed Stripe prices for Inicial, Básico, Pro, and Rancho; route Empresarial to sales.

## Consequences

- Subscription state is asynchronous and must never depend only on the Checkout redirect.
- Stripe price IDs are deployment configuration, not source constants.
- The app must keep the tier table, landing copy, dashboard UI, admin tooling, and Firestore projection aligned.
- Manual admin tier assignments are support overrides and a later Stripe webhook can replace them.

## Supersedes

[ADR-002](./002-no-stripe-lugares.md).
