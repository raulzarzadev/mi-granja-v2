'use client'

import {
  ANALYTICS_EVENTS,
  type AnalyticsEvent,
  APP_DOMAIN,
  PH_DID_PARAM,
  POSTHOG_DEFAULT_OPTIONS,
  readDistinctIdFromUrl,
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
    // cross_subdomain_cookie: true sets cookies on the current eTLD+1.
    // Works for migranja.app ↔ panel.migranja.app. Fails on Vercel preview
    // URLs (*.vercel.app is on the public suffix list); the ?ph_did= URL
    // fallback below stitches identity for that case.
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
    // Switch the dashboard's distinct_id to the landing's id; subsequent
    // posthog.identify(userId) will then merge anon-landing → known-user.
    const incoming = readDistinctIdFromUrl()
    if (incoming) {
      const current = posthog.get_distinct_id()
      if (current && current !== incoming) {
        posthog.identify(incoming)
      }
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

export function identifyUser(userId: string, personProperties?: Record<string, unknown>) {
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
