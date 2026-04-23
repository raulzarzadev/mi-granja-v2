---
title: Billing — "Lugares" Model
description: Admin-managed plan model. No Stripe. Free = 1 farm, 0 collab. Pro = N "places" (each = 1 extra farm OR 1 collaborator).
audience: llm+human
last_updated: 2026-04-23
---

# Billing — "Lugares" Model

## Model

**Admin-managed, no automated payments.** Stripe/Conekta/MercadoPago evaluated and removed (see [decisions/002-no-stripe-lugares.md](../decisions/002-no-stripe-lugares.md)).

| Plan | Limits                                           |
|------|--------------------------------------------------|
| Free | 1 granja, 0 colaboradores, full feature access   |
| Pro  | Admin assigns N `places`. User spends each as 1 extra granja OR 1 colaborador (their choice) |

Payment and activation handled **outside** the system. Admin manually adjusts `places` from admin panel.

## Types

`packages/shared/src/types/billing.ts`:
- `SubscriptionStatus`
- `PlanType` — `'free' | 'pro'`
- `BillingSubscription` — has `places: number`
- `BillingUsage` — `{ totalPlaces, usedPlaces }`
- Helpers: `computeUsedPlaces`, `canAddFarm`, `canAddCollaborator`

## Redux — `billingSlice`

Fields: `subscription`, `usage`, `planType`, `status`, `isLoading`, `error`.

## Hook — `useBilling`

```ts
const {
  planType,           // 'free' | 'pro'
  subscription,
  usage,
  loadSubscription,
  loadUsage,
  canCreateFarm,
  canInviteCollaborator
} = useBilling()

const isPaidUser = planType === 'pro'
```

## API routes

- `GET /api/billing/subscription` — user's subscription
- `GET /api/billing/usage` — user's usage
- `GET /api/admin/billing` — admin fetches user plan data
- `POST /api/admin/billing` — admin assigns `places`

## Firestore

Collection: `subscriptions/{userId}`. Field: `places: number` (not `farmQuantity` / `collaboratorQuantity` — those were dropped).

## UI — Admin

- "Gestionar Plan" button in `AdminUsers` table.
- Modal shows usage + input to assign `places`.
- No separate "Facturación" tab.

## UI — User

- `BillingSection` and `ProfileSection` show plan/places/usage + "contacta al admin".
- `MigrationBanner` for users exceeding free limits.

## Enforcement

`ModalCreateFarm` and `ModalInviteCollaborator` pre-check `usedPlaces < totalPlaces` with alert before submitting.

## Gated features

Canonical components to use for ALL Pro gates:

### `ModalUpgradePlan`
Path: `apps/dashboard/src/components/billing/ModalUpgradePlan.tsx`

"Actualizar a Plan Pro" modal. Shows Free vs Pro comparison, form (granjas, colaboradores, mensaje opcional). Sends 2 emails:
1. Owner: `raulzarza.dev@gmail.com`
2. User confirmation

**Use this modal at EVERY upgrade point in the system.**

### `ProFeatureBanner`
Path: `apps/dashboard/src/components/billing/ProFeatureBanner.tsx`

Inline banner for blocked features (e.g., mass animal form). Shows disclaimer + same request form integrated.

### Navbar button
"⭐ Actualizar Plan" visible when `planType === 'free'`. Opens `ModalUpgradePlan`.

## Gating pattern

```tsx
const { planType } = useBilling()
const isPaidUser = planType === 'pro'

// For explorable forms:
{!isPaidUser && <ProFeatureBanner />}
<button disabled={!isPaidUser}>Guardar</button>

// For action buttons:
{!isPaidUser ? (
  <button onClick={() => setUpgradeOpen(true)}>...</button>
) : (
  <ActionButton />
)}
```

## Currently gated features

- ✅ Registro masivo de animales (`/animal/nuevo` → tab Masivo — banner + disabled submit)
- ⏳ Importación de datos (CSV) — pending gate
- ⏳ Respaldo y restauración — pending gate

## Related

- [decisions/002-no-stripe-lugares.md](../decisions/002-no-stripe-lugares.md)
- [features/farms.md](./farms.md)
