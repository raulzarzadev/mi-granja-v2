'use client'

import {
  APP_DOMAIN,
  ANALYTICS_EVENTS,
  type AnalyticsEvent,
  POSTHOG_DEFAULT_OPTIONS,
  readDistinctIdFromUrl,
  PH_DID_PARAM,
} from '@mi-granja/shared'
import posthog, { type PostHog } from 'posthog-js'

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || POSTHOG_DEFAULT_OPTIONS.api_host
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0'

let initialized = false

export function getPosthog(): PostHog | null {
  if (typeof window === 'undefined') return null
  if (!KEY) return null
  if (!initialized) {
    posthog.init(KEY, {
      ...POSTHOG_DEFAULT_OPTIONS,
      api_host: HOST,
    })
    posthog.register({
      app_domain: APP_DOMAIN.PANEL,
      app_version: APP_VERSION,
    })
    // Cross-domain bridge: if landing forwarded a distinct_id, adopt it
    // before the user identifies (so the funnel stitches together).
    const incoming = readDistinctIdFromUrl()
    if (incoming) {
      const current = posthog.get_distinct_id()
      if (current && current !== incoming) {
        // anon → forwarded anon: alias so server-side person merges
        posthog.alias(incoming, current)
      }
      // Strip the param so it doesn't pollute internal navigation.
      try {
        const url = new URL(window.location.href)
        url.searchParams.delete(PH_DID_PARAM)
        window.history.replaceState({}, '', url.toString())
      } catch {
        // ignore
      }
    }
    initialized = true
  }
  return posthog
}

export function track(event: AnalyticsEvent, properties?: Record<string, unknown>) {
  const ph = getPosthog()
  if (!ph) return
  ph.capture(event, properties)
}

export function identifyUser(
  userId: string,
  personProperties?: Record<string, unknown>,
) {
  const ph = getPosthog()
  if (!ph) return
  ph.identify(userId, personProperties)
}

export function resetIdentity() {
  const ph = getPosthog()
  if (!ph) return
  ph.reset()
}

export { ANALYTICS_EVENTS }
