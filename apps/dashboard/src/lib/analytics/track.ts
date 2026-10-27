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

export const trackFarmCreated = (props?: {
  activity_type?: string
  country?: string
  purposes?: string[]
  species?: string[]
  crop_types?: string[]
  other_activity?: string
}) => track(ANALYTICS_EVENTS.farm_created, props)

export const trackRecordCreated = (props: { record_type: string; category?: string }) =>
  track(ANALYTICS_EVENTS.record_created, props)

type NewRecordAnalyticsProps = { record_type: string; animal_count?: number }

export const trackNewRecordOpened = (draft_count: number) =>
  track(ANALYTICS_EVENTS.new_record_opened, { draft_count })

export const trackNewRecordTypeSelected = (record_type: string) =>
  track(ANALYTICS_EVENTS.new_record_type_selected, { record_type })

export const trackNewRecordDraftSaved = (props: NewRecordAnalyticsProps) =>
  track(ANALYTICS_EVENTS.new_record_draft_saved, props)

export const trackNewRecordDraftRestored = (record_type: string) =>
  track(ANALYTICS_EVENTS.new_record_draft_restored, { record_type })

export const trackNewRecordSubmitted = (props: NewRecordAnalyticsProps) =>
  track(ANALYTICS_EVENTS.new_record_submitted, props)

export const trackNewRecordCompleted = (props: NewRecordAnalyticsProps) =>
  track(ANALYTICS_EVENTS.new_record_completed, props)

export const trackNewRecordFailed = (props: NewRecordAnalyticsProps) =>
  track(ANALYTICS_EVENTS.new_record_failed, props)

export const trackNewRecordUndone = (props: NewRecordAnalyticsProps) =>
  track(ANALYTICS_EVENTS.new_record_undone, props)

export const trackReminderCreated = (props: {
  reminder_type: string
  priority: string
  animal_count: number
}) => track(ANALYTICS_EVENTS.reminder_created, props)

export const trackReminderCompleted = (props: { scope: 'reminder' | 'animal' }) =>
  track(ANALYTICS_EVENTS.reminder_completed, props)

export const trackInvitationSent = () => track(ANALYTICS_EVENTS.invitation_sent)

export const trackInvitationAccepted = () => track(ANALYTICS_EVENTS.invitation_accepted)

export const trackPushNotificationsEnabled = () =>
  track(ANALYTICS_EVENTS.push_notifications_enabled)

export const trackCheckoutStarted = (tierId: string) =>
  track(ANALYTICS_EVENTS.checkout_started, { tier_id: tierId })

export const trackBillingPortalOpened = () => track(ANALYTICS_EVENTS.billing_portal_opened)

export const trackAnimalCreated = (props: { species?: string; breed?: string }) =>
  track(ANALYTICS_EVENTS.animal_created, props)

export const trackAnimalUpdated = (props: { field_changed?: string; fields_changed?: string[] }) =>
  track(ANALYTICS_EVENTS.animal_updated, props)

export const trackAnimalDeleted = (props?: { species?: string }) =>
  track(ANALYTICS_EVENTS.animal_deleted, props)

export const trackAnimalViewed = (props: { species?: string }) =>
  track(ANALYTICS_EVENTS.animal_viewed, props)

export const trackAnimalStageChanged = (props: { target: string; animal_count: number }) =>
  track(ANALYTICS_EVENTS.animal_stage_changed, props)

export const trackAnimalsBulkUpdated = (props: {
  fields_changed: string[]
  animal_count: number
}) => track(ANALYTICS_EVENTS.animals_bulk_updated, props)

export const trackSaleCompleted = (props: { animal_count: number; price_type?: string }) =>
  track(ANALYTICS_EVENTS.sale_completed, props)

export const trackSaleReverted = (props: { animal_count: number }) =>
  track(ANALYTICS_EVENTS.sale_reverted, props)

export const trackReproductionEventCreated = (props: { type: string; species?: string }) =>
  track(ANALYTICS_EVENTS.reproduction_event_created, props)

export const trackReproductionEventUpdated = (props: { type?: string }) =>
  track(ANALYTICS_EVENTS.reproduction_event_updated, props)

export const trackGestationTracked = (props?: { species?: string }) =>
  track(ANALYTICS_EVENTS.gestation_tracked, props)

export const trackBirthReverted = () => track(ANALYTICS_EVENTS.birth_reverted)

export const trackExportRequested = (props: { data_type: string }) =>
  track(ANALYTICS_EVENTS.export_requested, props)

export const trackBackupRestored = (props: {
  mode: 'merge' | 'replace'
  success: boolean
  error_count: number
}) => track(ANALYTICS_EVENTS.backup_restored, props)

export const trackOnboardingStepCompleted = (props: { step_name: string; step_number: number }) =>
  track(ANALYTICS_EVENTS.onboarding_step_completed, props)

export const trackOnboardingCompleted = (props: { action: 'show_guide' | 'start' | 'dismiss' }) =>
  track(ANALYTICS_EVENTS.onboarding_completed, props)

export const trackOnboardingCardDismissed = () => track(ANALYTICS_EVENTS.onboarding_card_dismissed)

export const trackGuideOpened = (props: { source: string }) =>
  track(ANALYTICS_EVENTS.guide_opened, props)
