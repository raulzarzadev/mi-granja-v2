const defaultDashboardUrl = import.meta.env.DEV
  ? 'http://dashboard.localhost:1355'
  : 'https://panel.migranja.app'

export const DASHBOARD_URL = (
  import.meta.env.PUBLIC_DASHBOARD_URL || defaultDashboardUrl
).replace(/\/+$/, '')

export const DASHBOARD_AUTH_URL = `${DASHBOARD_URL}/auth`
