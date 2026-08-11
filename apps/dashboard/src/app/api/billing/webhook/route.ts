import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { ANALYTICS_EVENTS } from '@mi-granja/shared'
import { captureServerEvent } from '@/lib/analytics/posthog-server'
import { getBillingTiers } from '@/lib/billing-config'
import { getAdminFirestore } from '@/lib/firebase-admin'
import { getStripe, getTierByStripePriceId, mapStripeStatus } from '@/lib/stripe'
import { PAID_STATUSES, type PlanTierId, planTypeForTier } from '@/types/billing'

export const runtime = 'nodejs'

function objectId(value: string | { id: string } | null): string | null {
  if (!value) return null
  return typeof value === 'string' ? value : value.id
}

async function syncSubscription(subscription: Stripe.Subscription, fallbackUserId?: string) {
  const firestore = getAdminFirestore()
  const priceId = subscription.items.data[0]?.price.id ?? null
  const tiers = await getBillingTiers(firestore)
  const tier = getTierByStripePriceId(priceId, tiers)
  const userId = subscription.metadata.userId || fallbackUserId
  if (!userId) throw new Error(`Suscripcion ${subscription.id} sin userId`)

  const tierId: PlanTierId = tier?.id ?? 'free'
  const status = mapStripeStatus(subscription.status)
  const planType = PAID_STATUSES.includes(status) ? planTypeForTier(tierId) : 'free'
  const currentPeriodEnd = subscription.items.data[0]?.current_period_end
  const now = new Date().toISOString()
  const subscriptionRef = firestore.doc(`subscriptions/${userId}`)
  const currentDoc = await subscriptionRef.get()
  const currentData = currentDoc.data()
  const createdAt = currentData?.createdAt ?? now
  const previousStatus = currentData?.status
  const previousTierId = currentData?.tierId

  await Promise.all([
    subscriptionRef.set(
      {
        userId,
        status,
        planType,
        tierId,
        stripeCustomerId: objectId(subscription.customer),
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        updatedAt: now,
        createdAt,
      },
      { merge: true },
    ),
    firestore
      .doc(`users/${userId}`)
      .set({ planType, subscriptionStatus: status, billingTierId: tierId }, { merge: true }),
  ])

  const wasPaid = previousStatus ? PAID_STATUSES.includes(previousStatus) : false
  const isPaid = PAID_STATUSES.includes(status)
  if (!wasPaid && isPaid) {
    await captureServerEvent(userId, ANALYTICS_EVENTS.subscription_activated, {
      tier_id: tierId,
      status,
    })
  } else if (wasPaid && !isPaid) {
    await captureServerEvent(userId, ANALYTICS_EVENTS.subscription_ended, {
      tier_id: tierId,
      status,
    })
  } else if (isPaid && previousTierId && previousTierId !== tierId) {
    await captureServerEvent(userId, ANALYTICS_EVENTS.subscription_plan_changed, {
      previous_tier_id: previousTierId,
      tier_id: tierId,
      status,
    })
  }
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!signature || !secret) {
    return NextResponse.json({ error: 'Webhook no configurado' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret)
  } catch (error) {
    console.error('Firma de webhook invalida:', error)
    return NextResponse.json({ error: 'Firma invalida' }, { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const subscriptionId = objectId(session.subscription)
      if (subscriptionId) {
        const subscription = await getStripe().subscriptions.retrieve(subscriptionId)
        await syncSubscription(
          subscription,
          session.client_reference_id ?? session.metadata?.userId,
        )
      }
    }

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      await syncSubscription(event.data.object)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error(`Error procesando webhook ${event.id}:`, error)
    return NextResponse.json({ error: 'Error procesando webhook' }, { status: 500 })
  }
}
