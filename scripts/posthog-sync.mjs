#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const ENV_FILE = resolve(process.cwd(), '.env.posthog.local')
const DASHBOARD_NAME = 'Panel – panel.migranja.app'
const PANEL_HOST = 'panel.migranja.app'

function parseEnv(contents) {
  const values = {}
  for (const rawLine of contents.split(/\r?\n/u)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/u)
    if (!match) continue
    let value = match[2].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    values[match[1]] = value
  }
  return values
}

async function loadConfig() {
  let fileValues = {}
  try {
    fileValues = parseEnv(await readFile(ENV_FILE, 'utf8'))
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }

  const get = (name) => process.env[name] || fileValues[name]
  const token = get('POSTHOG_PERSONAL_API_KEY')
  const projectId = get('POSTHOG_PROJECT_ID')
  const apiHost = (get('POSTHOG_API_HOST') || 'https://us.posthog.com').replace(/\/$/u, '')

  const missing = [
    ['POSTHOG_PERSONAL_API_KEY', token],
    ['POSTHOG_PROJECT_ID', projectId],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name)

  if (missing.length > 0) {
    throw new Error(
      `Faltan variables: ${missing.join(', ')}. Agrégalas a .env.posthog.local o al entorno.`,
    )
  }
  if (!/^https:\/\//u.test(apiHost)) {
    throw new Error('POSTHOG_API_HOST debe ser una URL HTTPS.')
  }

  return { token, projectId, apiHost }
}

function event(name, customName, math = 'total', properties = []) {
  return {
    kind: 'EventsNode',
    event: name,
    name,
    custom_name: customName,
    math,
    properties,
  }
}

function eventProperty(key, value, operator = 'exact') {
  return { key, value, operator, type: 'event' }
}

function trendsQuery({ series, interval, from, display = 'ActionsLineGraph', breakdown }) {
  const source = {
    kind: 'TrendsQuery',
    series,
    version: 4,
    interval,
    dateRange: { date_from: from, explicitDate: false },
    properties: [],
    trendsFilter: {
      display,
      showLegend: true,
      showValuesOnSeries: false,
      showPercentStackView: false,
      aggregationAxisFormat: 'numeric',
      smoothingIntervals: 1,
    },
    filterTestAccounts: true,
  }
  if (breakdown) {
    source.breakdownFilter = {
      breakdowns: [{ type: 'event', property: breakdown }],
      breakdown_type: 'event',
      breakdown_limit: 10,
    }
  }
  return { kind: 'InsightVizNode', source }
}

function funnelQuery({ series, from, windowDays }) {
  return {
    kind: 'InsightVizNode',
    source: {
      kind: 'FunnelsQuery',
      series,
      version: 2,
      interval: 'day',
      dateRange: { date_from: from, explicitDate: false },
      properties: [],
      funnelsFilter: {
        layout: 'horizontal',
        exclusions: [],
        funnelVizType: 'steps',
        funnelOrderType: 'ordered',
        funnelStepReference: 'total',
        funnelWindowInterval: windowDays,
        funnelWindowIntervalUnit: 'day',
        breakdownAttributionType: 'first_touch',
      },
      filterTestAccounts: true,
    },
  }
}

const pageViewsQuery = trendsQuery({
  series: [event('$pageview', 'Páginas vistas', 'total', [eventProperty('$host', PANEL_HOST)])],
  interval: 'day',
  from: '-30d',
  breakdown: '$pathname',
})

const desiredInsights = [
  {
    name: 'Activación de usuarios – panel',
    description: 'Conversión desde el acceso hasta la primera granja, animal y registro.',
    query: funnelQuery({
      series: [
        event('login_completed', 'Inició sesión'),
        event('farm_created', 'Creó una granja'),
        event('animal_created', 'Registró un animal'),
        event('record_created', 'Creó un registro'),
      ],
      from: '-90d',
      windowDays: 14,
    }),
  },
  {
    name: 'Uso semanal de funciones – panel',
    description: 'Usuarios únicos semanales por función principal del producto.',
    query: trendsQuery({
      series: [
        event('animal_created', 'Animales', 'dau'),
        event('record_created', 'Registros', 'dau'),
        event('reminder_created', 'Recordatorios', 'dau'),
        event('reproduction_event_created', 'Reproducción', 'dau'),
        event('ai_query_sent', 'Asistente IA', 'dau'),
      ],
      interval: 'week',
      from: '-90d',
    }),
  },
  {
    name: 'Registros por tipo – panel',
    description: 'Volumen de registros agrupado por el tipo funcional registrado.',
    query: trendsQuery({
      series: [event('record_created', 'Registros')],
      interval: 'week',
      from: '-90d',
      display: 'ActionsBar',
      breakdown: 'record_type',
    }),
  },
  {
    name: 'Conversión a plan pagado – panel',
    description: 'Embudo desde la página de planes hasta una suscripción activada.',
    query: funnelQuery({
      series: [
        event('$pageview', 'Visitó planes', 'total', [
          eventProperty('$host', PANEL_HOST),
          eventProperty('$pathname', '/plan'),
        ]),
        event('checkout_started', 'Inició checkout'),
        event('subscription_activated', 'Activó suscripción'),
      ],
      from: '-90d',
      windowDays: 7,
    }),
  },
  {
    name: 'Salud de suscripciones – panel',
    description: 'Altas, cambios y bajas confirmadas por los webhooks de Stripe.',
    query: trendsQuery({
      series: [
        event('subscription_activated', 'Altas'),
        event('subscription_plan_changed', 'Cambios de plan'),
        event('subscription_ended', 'Bajas'),
      ],
      interval: 'month',
      from: '-180d',
    }),
  },
  {
    name: 'Errores del panel – panel',
    description: 'Excepciones capturadas en el panel, agrupadas por tipo.',
    query: trendsQuery({
      series: [event('$exception', 'Excepciones')],
      interval: 'day',
      from: '-30d',
      breakdown: '$exception_type',
    }),
  },
]

async function main() {
  const config = await loadConfig()
  const projectBase = `${config.apiHost}/api/projects/${encodeURIComponent(config.projectId)}`

  async function api(path, options = {}) {
    const response = await fetch(`${projectBase}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) {
      let detail = ''
      try {
        const body = await response.json()
        detail = body?.detail || body?.error || ''
      } catch {
        // Do not include response bodies that could contain sensitive data.
      }
      throw new Error(
        `PostHog respondió ${response.status} en ${options.method || 'GET'} ${path}${detail ? `: ${detail}` : ''}`,
      )
    }
    if (response.status === 204) return null
    return response.json()
  }

  const dashboardsResponse = await api('/dashboards/?limit=100')
  const dashboards = dashboardsResponse.results || dashboardsResponse
  const dashboard = dashboards.find((item) => item.name === DASHBOARD_NAME)
  if (!dashboard) {
    throw new Error(`No se encontró el dashboard existente "${DASHBOARD_NAME}".`)
  }

  const insightsResponse = await api('/insights/?limit=100')
  const insights = insightsResponse.results || insightsResponse
  const byName = new Map(insights.map((insight) => [insight.name, insight]))

  const legacyPageViews = byName.get('Páginas vistas – panel')
  if (legacyPageViews) {
    await api(`/insights/${legacyPageViews.id}/`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: legacyPageViews.name,
        description: 'Páginas vistas del panel agrupadas por ruta.',
        query: pageViewsQuery,
      }),
    })
    console.log('✓ Páginas vistas actualizado para usar $pageview')
  } else {
    desiredInsights.unshift({
      name: 'Páginas vistas – panel',
      description: 'Páginas vistas del panel agrupadas por ruta.',
      query: pageViewsQuery,
    })
  }

  let created = 0
  let existing = 0
  for (const insight of desiredInsights) {
    if (byName.has(insight.name)) {
      existing += 1
      console.log(`= Ya existe: ${insight.name}`)
      continue
    }
    await api('/insights/', {
      method: 'POST',
      body: JSON.stringify({ ...insight, dashboards: [dashboard.id] }),
    })
    created += 1
    console.log(`+ Creado: ${insight.name}`)
  }

  console.log(
    `\nSincronización completa: dashboard ${dashboard.id}, ${created} creados, ${existing} existentes.`,
  )
}

main().catch((error) => {
  console.error(`Error: ${error instanceof Error ? error.message : 'fallo desconocido'}`)
  process.exitCode = 1
})
