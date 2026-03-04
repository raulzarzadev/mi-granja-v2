import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { getAdminFirestore } from '@/lib/firebase-admin'
import { GRACE_PERIOD_DAYS } from '@/types/billing'
import type Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const stripe = getStripe()
  const firestore = getAdminFirestore()

  // Verificar signature del webhook
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Idempotencia: verificar si ya procesamos este evento
  const eventRef = firestore.doc(`stripe_events/${event.id}`)
  const eventDoc = await eventRef.get()
  if (eventDoc.exists) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, firestore, stripe)
        break

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice, firestore)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, firestore)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, firestore)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, firestore)
        break

      default:
        console.log(`Evento Stripe no manejado: ${event.type}`)
    }

    // Marcar evento como procesado
    await eventRef.set({
      id: event.id,
      type: event.type,
      processedAt: new Date(),
    })

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error(`Error procesando webhook ${event.type}:`, error)
    return NextResponse.json(
      { error: 'Error procesando evento' },
      { status: 500 },
    )
  }
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  firestore: FirebaseFirestore.Firestore,
  stripe: Stripe,
) {
  const userId = session.metadata?.firebaseUserId
  if (!userId || !session.subscription) return

  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription.id

  // Obtener detalles de la suscripción
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  // Mapear items
  let farmItemId: string | undefined
  let collaboratorItemId: string | undefined
  let farmQuantity = 0
  let collaboratorQuantity = 0

  for (const item of subscription.items.data) {
    const priceId = item.price.id
    if (
      priceId === process.env.STRIPE_FARM_PRICE_ID ||
      priceId === process.env.STRIPE_FARM_ANNUAL_PRICE_ID
    ) {
      farmItemId = item.id
      farmQuantity = item.quantity ?? 0
    } else if (
      priceId === process.env.STRIPE_COLLABORATOR_PRICE_ID ||
      priceId === process.env.STRIPE_COLLABORATOR_ANNUAL_PRICE_ID
    ) {
      collaboratorItemId = item.id
      collaboratorQuantity = item.quantity ?? 0
    }
  }

  const interval = subscription.items.data[0]?.price.recurring?.interval === 'year'
    ? 'year'
    : 'month'

  const now = new Date()

  // Crear documento de suscripción
  await firestore.doc(`subscriptions/${userId}`).set({
    userId,
    stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
    stripeSubscriptionId: subscriptionId,
    status: 'active',
    planType: 'pro',
    interval,
    provider: 'stripe',
    farmQuantity,
    collaboratorQuantity,
    stripeFarmItemId: farmItemId,
    stripeCollaboratorItemId: collaboratorItemId,
    currentPeriodStart: new Date(subscription.start_date * 1000),
    currentPeriodEnd: computePeriodEnd(subscription.start_date, interval),
    monthlyAmount: calculateMonthlyAmount(subscription),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    createdAt: now,
    updatedAt: now,
  })

  // Actualizar usuario con campos desnormalizados
  await firestore.doc(`users/${userId}`).update({
    stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
    subscriptionStatus: 'active',
    planType: 'pro',
  })
}

async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  firestore: FirebaseFirestore.Firestore,
) {
  const userId = await getUserIdFromCustomer(invoice.customer, firestore)
  if (!userId) return

  // Crear registro de factura
  await firestore.collection('invoices').add({
    userId,
    stripeInvoiceId: invoice.id,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    status: 'paid',
    description: invoice.description ?? `Factura ${invoice.number}`,
    invoiceUrl: invoice.hosted_invoice_url,
    invoicePdf: invoice.invoice_pdf,
    periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
    periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
    createdAt: new Date(),
  })

  // Actualizar status a active (por si estaba en past_due)
  await firestore.doc(`subscriptions/${userId}`).update({
    status: 'active',
    gracePeriodEnd: null,
    updatedAt: new Date(),
  })

  await firestore.doc(`users/${userId}`).update({
    subscriptionStatus: 'active',
  })
}

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  firestore: FirebaseFirestore.Firestore,
) {
  const userId = await getUserIdFromCustomer(invoice.customer, firestore)
  if (!userId) return

  const gracePeriodEnd = new Date()
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS)

  await firestore.doc(`subscriptions/${userId}`).update({
    status: 'past_due',
    gracePeriodEnd,
    updatedAt: new Date(),
  })

  await firestore.doc(`users/${userId}`).update({
    subscriptionStatus: 'past_due',
  })
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  firestore: FirebaseFirestore.Firestore,
) {
  const userId = subscription.metadata?.firebaseUserId
  if (!userId) return

  let farmQuantity = 0
  let collaboratorQuantity = 0

  for (const item of subscription.items.data) {
    const priceId = item.price.id
    if (
      priceId === process.env.STRIPE_FARM_PRICE_ID ||
      priceId === process.env.STRIPE_FARM_ANNUAL_PRICE_ID
    ) {
      farmQuantity = item.quantity ?? 0
    } else if (
      priceId === process.env.STRIPE_COLLABORATOR_PRICE_ID ||
      priceId === process.env.STRIPE_COLLABORATOR_ANNUAL_PRICE_ID
    ) {
      collaboratorQuantity = item.quantity ?? 0
    }
  }

  const status = mapStripeStatus(subscription.status)

  const interval = subscription.items.data[0]?.price.recurring?.interval === 'year'
    ? 'year'
    : 'month'

  await firestore.doc(`subscriptions/${userId}`).update({
    status,
    farmQuantity,
    collaboratorQuantity,
    currentPeriodStart: new Date(subscription.start_date * 1000),
    currentPeriodEnd: computePeriodEnd(subscription.start_date, interval),
    monthlyAmount: calculateMonthlyAmount(subscription),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    updatedAt: new Date(),
  })

  await firestore.doc(`users/${userId}`).update({
    subscriptionStatus: status,
  })
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  firestore: FirebaseFirestore.Firestore,
) {
  const userId = subscription.metadata?.firebaseUserId
  if (!userId) return

  await firestore.doc(`subscriptions/${userId}`).update({
    status: 'canceled',
    canceledAt: new Date(),
    updatedAt: new Date(),
  })

  await firestore.doc(`users/${userId}`).update({
    subscriptionStatus: 'canceled',
    planType: 'free',
  })
}

// --- Helpers ---

async function getUserIdFromCustomer(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
  firestore: FirebaseFirestore.Firestore,
): Promise<string | null> {
  const customerId = typeof customer === 'string' ? customer : customer?.id
  if (!customerId) return null

  const usersSnap = await firestore
    .collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get()

  return usersSnap.empty ? null : usersSnap.docs[0].id
}

function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): string {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'active'
    case 'past_due':
      return 'past_due'
    case 'canceled':
    case 'unpaid':
      return 'canceled'
    default:
      return 'none'
  }
}

function computePeriodEnd(startTimestamp: number, interval: string): Date {
  const start = new Date(startTimestamp * 1000)
  if (interval === 'year') {
    start.setFullYear(start.getFullYear() + 1)
  } else {
    start.setMonth(start.getMonth() + 1)
  }
  return start
}

function calculateMonthlyAmount(subscription: Stripe.Subscription): number {
  let total = 0
  for (const item of subscription.items.data) {
    const unitAmount = item.price.unit_amount ?? 0
    const quantity = item.quantity ?? 0
    if (item.price.recurring?.interval === 'year') {
      total += Math.round((unitAmount * quantity) / 12)
    } else {
      total += unitAmount * quantity
    }
  }
  return total
}
