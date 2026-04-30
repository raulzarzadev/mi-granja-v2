'use client'

import { ANALYTICS_EVENTS } from '@mi-granja/shared'
import { track } from './posthog'

/**
 * Typed wrappers around `track()`. Call sites import these instead of
 * passing free-form event names so renames stay safe.
 */

export const trackLoginCompleted = (method: 'email' | 'google' | 'custom_token' | string) =>
  track(ANALYTICS_EVENTS.login_completed, { method })

export const trackLogout = () => track(ANALYTICS_EVENTS.logout)

export const trackAnimalCreated = (props: { species?: string; breed?: string }) =>
  track(ANALYTICS_EVENTS.animal_created, props)

export const trackAnimalUpdated = (props: { field_changed?: string; fields_changed?: string[] }) =>
  track(ANALYTICS_EVENTS.animal_updated, props)

export const trackAnimalDeleted = (props?: { species?: string }) =>
  track(ANALYTICS_EVENTS.animal_deleted, props)

export const trackAnimalViewed = (props: { species?: string }) =>
  track(ANALYTICS_EVENTS.animal_viewed, props)

export const trackReproductionEventCreated = (props: { type: string; species?: string }) =>
  track(ANALYTICS_EVENTS.reproduction_event_created, props)

export const trackReproductionEventUpdated = (props: { type?: string }) =>
  track(ANALYTICS_EVENTS.reproduction_event_updated, props)

export const trackGestationTracked = (props?: { species?: string }) =>
  track(ANALYTICS_EVENTS.gestation_tracked, props)

export const trackReportGenerated = (props: { report_type: string; format: string }) =>
  track(ANALYTICS_EVENTS.report_generated, props)

export const trackExportRequested = (props: { data_type: string }) =>
  track(ANALYTICS_EVENTS.export_requested, props)

export const trackAiQuerySent = (props: { query_type: string; model?: string }) =>
  track(ANALYTICS_EVENTS.ai_query_sent, props)

export const trackAiResponseReceived = (props: { latency_ms: number; tokens_used?: number }) =>
  track(ANALYTICS_EVENTS.ai_response_received, props)

export const trackOnboardingStepCompleted = (props: { step_name: string; step_number: number }) =>
  track(ANALYTICS_EVENTS.onboarding_step_completed, props)

export const trackOnboardingCompleted = () => track(ANALYTICS_EVENTS.onboarding_completed)

export const trackPageViewed = (page_name: string) =>
  track(ANALYTICS_EVENTS.page_viewed, { page_name })
