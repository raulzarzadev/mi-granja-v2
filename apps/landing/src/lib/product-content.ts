import { PLAN_TIERS } from '@mi-granja/shared'

export const SITE_NAME = 'Mi Granja'
export const SITE_URL = 'https://www.migranja.app'
export const APP_URL = 'https://panel.migranja.app'
export const CONTACT_EMAIL = 'hola@migranja.app'

export const DEFAULT_TITLE = 'Mi Granja | Software de gestión ganadera con IA'
export const DEFAULT_DESCRIPTION =
  'Software ganadero en español para registrar animales, reproducción, partos, salud, leche, recordatorios y colaboradores, con asistente IA.'

export const PRODUCT_FEATURES = [
  'Inventario e historial individual de animales',
  'Etapas productivas: cría, juvenil, engorda, reproducción y madre o lechera',
  'Empadres, gestaciones, partos, crías y genealogía',
  'Registros de peso, salud, notas, leche y ventas',
  'Recordatorios y notificaciones',
  'Áreas, lotes, colaboradores, roles y permisos',
  'Asistente IA basado en los datos actuales de la granja',
  'Respaldo y restauración de datos',
] as const

export const SUPPORTED_ANIMALS = [
  'bovinos',
  'ovinos',
  'caprinos',
  'porcinos',
  'gallinas',
  'equinos',
  'perros',
  'gatos',
  'otras especies',
] as const

export const PUBLIC_PLAN_TIERS = PLAN_TIERS.filter((tier) => tier.isVisible)

export function planPriceLabel(priceUsd: number | null): string {
  if (priceUsd === null) return 'precio a convenir'
  if (priceUsd === 0) return 'gratis'
  const formattedPrice = Number.isInteger(priceUsd) ? String(priceUsd) : priceUsd.toFixed(2)
  return `$${formattedPrice} USD al mes`
}

export function publicPlanLabel(id: string, label: string): string {
  return id === 'basico' ? 'Básico' : label
}

export function markdownResponse(body: string): Response {
  return new Response(`${body.trim()}\n`, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
