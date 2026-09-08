import { ANALYTICS_EVENTS, POSTHOG_DEFAULT_OPTIONS } from '../lib/analytics'

describe('analytics configuration', () => {
  it('uses standard PostHog navigation and observability events', () => {
    expect(POSTHOG_DEFAULT_OPTIONS.capture_pageview).toBe('history_change')
    expect(POSTHOG_DEFAULT_OPTIONS.capture_pageleave).toBe('if_capture_pageview')
    expect(POSTHOG_DEFAULT_OPTIONS.capture_performance).toBe(true)
    expect(POSTHOG_DEFAULT_OPTIONS.capture_exceptions).toBe(true)
  })

  it('keeps key product and billing events in the shared vocabulary', () => {
    expect(ANALYTICS_EVENTS).toMatchObject({
      farm_created: 'farm_created',
      record_created: 'record_created',
      reminder_created: 'reminder_created',
      new_record_opened: 'new_record_opened',
      new_record_submitted: 'new_record_submitted',
      new_record_completed: 'new_record_completed',
      new_record_failed: 'new_record_failed',
      new_record_undone: 'new_record_undone',
      checkout_started: 'checkout_started',
      subscription_activated: 'subscription_activated',
      subscription_ended: 'subscription_ended',
    })
  })
})
