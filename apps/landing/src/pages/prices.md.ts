import type { APIRoute } from 'astro'
import {
  markdownResponse,
  PUBLIC_PLAN_TIERS,
  planPriceLabel,
  publicPlanLabel,
  SITE_URL,
} from '../lib/product-content'

const planLines = PUBLIC_PLAN_TIERS.map(
  (tier) =>
    `- **${publicPlanLabel(tier.id, tier.label)}**: ${tier.description}${
      tier.priceUsd === null ? '.' : `; ${planPriceLabel(tier.priceUsd)}.`
    }`,
).join('\n')

export const GET: APIRoute = () =>
  markdownResponse(`
# Planes y precios de Mi Granja

> El plan se determina por la cantidad total de animales activos. Las granjas y los colaboradores no generan cargos adicionales.

## Planes publicados

${planLines}

Los animales vendidos o muertos no cuentan como activos. Los importes están expresados en dólares estadounidenses y pueden cambiar; para una cotización vigente consulta ${SITE_URL}/prices.

## Incluido en los planes

- Gestión de animales, etapas y áreas.
- Reproducción, salud, leche, registros y recordatorios.
- Colaboradores con roles y permisos.
- Asistente IA y respaldos.

## Contratación

El alta y la administración de la suscripción se realizan dentro de la aplicación mediante Stripe. Los planes empresariales se cotizan directamente con Mi Granja.
`)
