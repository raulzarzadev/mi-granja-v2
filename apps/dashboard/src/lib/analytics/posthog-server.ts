import { type AnalyticsEvent, APP_DOMAIN, POSTHOG_DEFAULT_OPTIONS } from '@mi-granja/shared'

/** Envia eventos confiables del servidor sin bloquear el flujo principal. */
export async function captureServerEvent(
  distinctId: string,
  event: AnalyticsEvent,
  properties: Record<string, unknown> = {},
): Promise<void> {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!apiKey) return

  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || POSTHOG_DEFAULT_OPTIONS.api_host
  try {
    const response = await fetch(`${apiHost.replace(/\/$/, '')}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(3000),
      body: JSON.stringify({
        api_key: apiKey,
        event,
        properties: {
          distinct_id: distinctId,
          app_domain: APP_DOMAIN.PANEL,
          source: 'server',
          ...properties,
        },
      }),
    })
    if (!response.ok) {
      console.warn(`PostHog rechazo ${event}: ${response.status}`)
    }
  } catch (error) {
    console.warn(`No se pudo enviar ${event} a PostHog:`, error)
  }
}
