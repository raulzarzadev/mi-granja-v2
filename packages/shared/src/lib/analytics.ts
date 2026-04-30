/**
 * Shared analytics vocabulary for Mi Granja.
 * Both landing (Astro) and dashboard (Next.js) import from here so event
 * names and property keys never drift between domains.
 */

export const APP_DOMAIN = {
  LANDING: 'landing',
  PANEL: 'panel',
} as const
export type AppDomain = (typeof APP_DOMAIN)[keyof typeof APP_DOMAIN]

export const ANALYTICS_EVENTS = {
  // Landing
  page_viewed: 'page_viewed',
  cta_clicked: 'cta_clicked',
  signup_started: 'signup_started',
  signup_completed: 'signup_completed',
  login_clicked: 'login_clicked',
  demo_requested: 'demo_requested',
  pricing_viewed: 'pricing_viewed',

  // Auth
  login_completed: 'login_completed',
  logout: 'logout',

  // Animals
  animal_created: 'animal_created',
  animal_updated: 'animal_updated',
  animal_deleted: 'animal_deleted',
  animal_viewed: 'animal_viewed',

  // Reproduction
  reproduction_event_created: 'reproduction_event_created',
  reproduction_event_updated: 'reproduction_event_updated',
  gestation_tracked: 'gestation_tracked',

  // Reports / data
  report_generated: 'report_generated',
  export_requested: 'export_requested',

  // AI
  ai_query_sent: 'ai_query_sent',
  ai_response_received: 'ai_response_received',

  // Onboarding
  onboarding_step_completed: 'onboarding_step_completed',
  onboarding_completed: 'onboarding_completed',
} as const
export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS]

// URL param used as a cross-domain bridge for distinct_id.
// Cookies on `.migranja.app` already cover this when both subdomains share root,
// but we also pass it via URL on outbound links as a defensive fallback
// (different browsers/ITP, custom domains, sandboxed previews, etc.).
export const PH_DID_PARAM = 'ph_did'

export interface PosthogInitOptions {
  api_host: string
  person_profiles: 'always' | 'identified_only'
  cross_subdomain_cookie: boolean
  persistence: 'localStorage+cookie'
  defaults: '2025-05-24'
  capture_pageview: boolean
  capture_pageleave: boolean
}

export const POSTHOG_DEFAULT_OPTIONS: PosthogInitOptions = {
  api_host: 'https://us.i.posthog.com',
  person_profiles: 'identified_only',
  cross_subdomain_cookie: true,
  persistence: 'localStorage+cookie',
  defaults: '2025-05-24',
  capture_pageview: false, // we fire page_viewed manually with consistent name
  capture_pageleave: true,
}

/** Append distinct_id to outbound URLs that cross domain (landing → panel). */
export function appendDistinctIdToUrl(url: string, distinctId: string | null | undefined): string {
  if (!distinctId) return url
  try {
    const u = new URL(url, typeof window !== 'undefined' ? window.location.href : 'https://x.test')
    u.searchParams.set(PH_DID_PARAM, distinctId)
    return u.toString()
  } catch {
    return url
  }
}

/** Read distinct_id from URL (the receiving domain calls this on init). */
export function readDistinctIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  return params.get(PH_DID_PARAM)
}
