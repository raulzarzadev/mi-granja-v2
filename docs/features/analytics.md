# Analytics (PostHog)

Event vocabulary lives in `packages/shared/src/lib/analytics.ts` (`ANALYTICS_EVENTS`). Landing and dashboard import from there so names never drift.

## Where events are sent

| Layer | File | Use for |
|---|---|---|
| Client (dashboard) | `apps/dashboard/src/lib/analytics/track.ts` | Typed wrappers (`trackX`). Call sites never pass raw event names. |
| Server (dashboard) | `apps/dashboard/src/lib/analytics/posthog-server.ts` → `captureServerEvent(uid, event, props)` | Events that must survive ad blockers: signup, AI, subscriptions. Non-blocking, 3s timeout. |
| Landing | `apps/landing/src/components/PostHogAnalytics.astro` | `data-ph-event` / `data-ph-*` attributes on elements. |

Identity: `PostHogProvider.tsx` identifies with the Firebase uid, sets person props (plan, farm_count, animal_count, species_managed) and the `farm` group. Server events use the same uid as `distinct_id`.

Automatic (no code): `$pageview`, `$pageleave`, autocapture, `$exception`, heatmaps, dead clicks, web vitals, session replay.

## Event catalog

| Area | Events | Source |
|---|---|---|
| Landing | `cta_clicked`, `signup_started`, `login_clicked`, `pricing_viewed`, `page_viewed`, `scroll_depth`, `faq_opened` | landing |
| Auth | `signup_completed` (`method`: email/google), `login_completed`, `logout` | server / client |
| Onboarding | `onboarding_step_completed` (first farm), `onboarding_completed` (`action`), `guide_opened` (`source`), `onboarding_card_dismissed` | client |
| Animals | `animal_created`, `animal_updated`, `animal_deleted`, `animal_viewed`, `animal_stage_changed` (`target`, `animal_count`), `animals_bulk_updated` | client |
| Sales | `sale_completed`, `sale_reverted` | client |
| Reproduction | `reproduction_event_created/updated`, `gestation_tracked`, `birth_reverted` | client |
| Records | `record_created`, `new_record_*` (opened, type_selected, draft_saved/restored, submitted, completed, failed, undone) | client |
| Reminders | `reminder_created`, `reminder_completed` (`scope`), `push_notifications_enabled` | client |
| Collaboration | `invitation_sent`, `invitation_accepted` | client |
| Data | `export_requested`, `backup_restored` (`mode`, `success`) | client |
| AI | `ai_query_sent`, `ai_response_received` (`latency_ms`, `tokens_used`, `model`, `provider`), `ai_query_failed`, `ai_limit_reached`, `ai_action_confirmed` (`action_type`) | server |
| Billing | `checkout_started`, `billing_portal_opened` (client); `subscription_activated/ended/plan_changed` (server: Stripe webhook and admin, `source: 'admin'`) | mixed |

## Adding an event

1. Add the name to `ANALYTICS_EVENTS` in shared.
2. Client: add a typed wrapper in `track.ts`. Server: call `captureServerEvent`.
3. Fire it **after** the action succeeds, never before.
4. If it matters for a dashboard, add an insight to `scripts/posthog-sync.mjs` and run `pnpm posthog:sync` (needs `.env.posthog.local` with `POSTHOG_PERSONAL_API_KEY` and `POSTHOG_PROJECT_ID`). The script only creates missing insights. It does not update existing ones.

Never send PII in event properties (emails, names, free text). Person props handle identity.
