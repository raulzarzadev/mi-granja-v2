import type { APIRoute } from 'astro'
import {
  APP_URL,
  CONTACT_EMAIL,
  markdownResponse,
  PRODUCT_FEATURES,
  SITE_URL,
  SUPPORTED_ANIMALS,
} from '../lib/product-content'

const featureLines = PRODUCT_FEATURES.map((feature) => `- ${feature}`).join('\n')
const animalList = SUPPORTED_ANIMALS.join(', ')

export const GET: APIRoute = () =>
  markdownResponse(`
# Mi Granja: software de gestión ganadera con IA

> Mi Granja ayuda a productores ganaderos a registrar y consultar la operación de una o varias granjas desde cualquier dispositivo.

## Qué resuelve

${featureLines}

## Especies compatibles

La aplicación admite ${animalList}. Los periodos productivos configurables ayudan a calcular fechas y organizar el seguimiento; el usuario sigue siendo responsable de validar cada dato y decisión productiva o sanitaria.

## Cómo funciona

1. La persona crea su cuenta y perfila su granja.
2. Registra animales individualmente o de forma masiva.
3. Añade movimientos, eventos reproductivos, recordatorios y colaboradores.
4. Consulta la información desde las vistas de animales, etapas, registros, estadísticas o mediante el asistente IA.

## Asistente IA

El asistente usa únicamente el contexto autorizado de la granja activa para resumir animales y movimientos, señalar pendientes y enlazar a acciones de la aplicación. Si un dato no existe, debe indicarlo en lugar de inventarlo. No sustituye diagnósticos veterinarios ni asesoría profesional.

## Acceso y contacto

- Sitio público: ${SITE_URL}
- Aplicación privada: ${APP_URL}/auth
- Planes: ${SITE_URL}/prices
- Contacto: ${CONTACT_EMAIL}
`)
