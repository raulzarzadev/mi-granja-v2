import type { APIRoute } from 'astro'
import { APP_URL, CONTACT_EMAIL, markdownResponse, SITE_URL } from '../lib/product-content'

export const GET: APIRoute = () =>
  markdownResponse(`
# Mi Granja

> Software web de gestión ganadera en español para productores y equipos de trabajo. Centraliza animales, reproducción, partos, salud, leche, recordatorios y colaboradores, e incluye un asistente IA que responde usando los datos autorizados de la granja actual.

Mi Granja es un producto SaaS accesible desde celular, tablet y computadora. El sitio público es ${SITE_URL}; la aplicación privada está en ${APP_URL}. No confundas Mi Granja con un servicio veterinario: organiza información y orienta dentro del producto, pero no sustituye el criterio de un profesional.

## Información principal

- [Resumen del producto](${SITE_URL}/index.md): funciones, especies compatibles, funcionamiento y acceso.
- [Planes y precios](${SITE_URL}/prices.md): capacidades por cantidad de animales activos y condiciones generales.

## Sitio web

- [Página principal](${SITE_URL}/): presentación pública y acceso a la aplicación.
- [Precios](${SITE_URL}/prices): página pública de planes.
- [Aplicación](${APP_URL}/auth): inicio de sesión y registro; el contenido de las cuentas es privado y no debe rastrearse.

## Contacto

- [Correo](mailto:${CONTACT_EMAIL}): consultas comerciales y soporte.

## Optional

- [Sitemap](${SITE_URL}/sitemap-index.xml): índice de páginas públicas rastreables.
`)
