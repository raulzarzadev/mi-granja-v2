---
title: Billing por cantidad de animales
description: Suscripciones Stripe con tiers definidos por animales activos.
audience: llm+human
last_updated: 2026-08-10
---

# Billing por cantidad de animales

## Modelo

El precio depende únicamente de la cantidad de animales activos en las granjas propiedad del usuario. Los animales con estado `muerto` o `vendido` no cuentan. Granjas y colaboradores no consumen cuota ni agregan cargos.

| Tier | Animales | USD/mes |
|---|---:|---:|
| Gratis | 0–10 | $0 |
| Inicial | 11–50 | $2.50 |
| Básico | 51–100 | $5 |
| Pro | 101–500 | $20 |
| Rancho | 501–1000 | $40 |
| Empresarial | 1001+ | A convenir |

`packages/shared/src/types/billing.ts` (`PLAN_TIERS`) contiene los valores por defecto. La configuración vigente puede sobrescribir nombres, precios, límites y Price IDs desde `settings/billing`.

## Stripe

- `POST /api/billing/checkout`: crea una Checkout Session de suscripción para un tier pagado.
- `POST /api/billing/portal`: crea una sesión corta del Customer Portal.
- `POST /api/billing/webhook`: verifica `stripe-signature` y sincroniza Checkout y eventos `customer.subscription.*`.
- `GET /api/billing/subscription`: devuelve la suscripción sincronizada.
- `GET /api/billing/usage`: calcula animales activos, tier contratado y tier requerido.

Variables requeridas en dashboard:

```dotenv
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_INICIAL=
STRIPE_PRICE_BASICO=
STRIPE_PRICE_PRO=
STRIPE_PRICE_RANCHO=
NEXT_PUBLIC_APP_URL=https://panel.migranja.app
```

El webhook es la autoridad para estado, price y fechas de la suscripción. Checkout incluye `userId` y `tierId` tanto en la sesión como en la metadata de la suscripción.

## Firestore

Documento `subscriptions/{userId}`:

- `status`, `planType`, `tierId`
- `stripeCustomerId`, `stripeSubscriptionId`, `stripePriceId`
- `currentPeriodEnd`, `cancelAtPeriodEnd`
- `createdAt`, `updatedAt`

`planType` se conserva como compatibilidad para compuertas de funciones: cualquier tier pagado se proyecta como `pro`.

## Admin y migración

El tab **Precios** del panel administrativo permite editar los planes. Los límites se recalculan como rangos consecutivos; el último plan siempre queda sin límite superior. El documento persistido es `settings/billing` y `GET/PUT /api/admin/billing-config` está restringido a administradores.

El precio visible y el cobro de Stripe se vinculan mediante `stripePriceId`. Al cambiar un importe debe registrarse el Price ID correspondiente; si no existe una configuración persistida, se usan las variables `STRIPE_PRICE_*` como fallback.

El admin también puede asignar un `tierId` manualmente a un usuario para soporte. Esta asignación puede ser sobrescrita por un webhook posterior de Stripe. El antiguo campo `places` ya no forma parte del contrato de billing.

Véase [ADR-006](../decisions/006-stripe-animal-tiers.md).
