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

## Pagos y créditos en desarrollo

`pnpm dev:emu` inicia Stripe CLI con `invoice.paid` además de los eventos de
checkout y suscripción. La suscripción activa por sí sola no abona créditos:
el webhook de factura mensual pagada concede el saldo de forma idempotente.
Si faltó ese evento, verificar la factura en Stripe antes de reconciliar el ciclo;
no simular otro cobro ni asignar créditos por cambiar manualmente el plan.

En `/plan`, «Volver al panel» navega directamente a `/` mediante reemplazo
de ruta. No usa el historial del navegador, que puede apuntar a Stripe después
del checkout o del portal de facturación.

La sección «Asistente IA» en `/plan` muestra lo disponible con una barra y el
desglose Incluido / Usado / Disponible, la fecha de renovación o reinicio y qué
significan los créditos (incluidos en el plan, no un cargo). En el panel del
asistente el mismo componente se reduce a una barra con «Ver detalles». Usa la misma fuente de cuota que el chat, con
actualización manual y estado de carga/error. El endpoint `/api/billing/ai-usage`
proyecta solo consultas o créditos visibles, con caché deshabilitada.

El consumo incluye fecha/hora en America/Mazatlan: próxima medianoche para
consultas gratis o fin del periodo de la cartera para créditos. El nuevo abono
requiere pago confirmado; una renovación cancelada muestra solo fin de ciclo.
