import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, verifyBillingAuth } from '@/lib/billing-auth'
import { getStripe, STRIPE_PRICES } from '@/lib/stripe'
import { getAdminFirestore } from '@/lib/firebase-admin'

/**
 * POST /api/billing/confirm
 * Confirma una sesión de checkout completada y actualiza Firestore.
 * Útil cuando el webhook aún no ha llegado (ej: desarrollo local sin stripe listen).
 */
export async function POST(request: NextRequest) {
  console.log('🔵 POST /api/billing/confirm llamado')
  try {
    const auth = await verifyBillingAuth(request)
    if (isAuthError(auth)) {
      console.error('🔴 Confirm: auth failed')
      return auth
    }
    console.log('🟢 Confirm: auth OK, uid:', auth.uid)

    const { sessionId } = await request.json()
    if (!sessionId) {
      console.error('🔴 Confirm: sessionId faltante')
      return NextResponse.json({ error: 'sessionId requerido' }, { status: 400 })
    }
    console.log('🟢 Confirm: sessionId:', sessionId)

    const stripe = getStripe()
    const firestore = getAdminFirestore()

    // Recuperar sesión de Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.status !== 'complete') {
      return NextResponse.json({ error: 'La sesión no está completada' }, { status: 400 })
    }

    // Verificar que el checkout pertenece a este usuario
    if (session.metadata?.firebaseUserId !== auth.uid) {
      return NextResponse.json({ error: 'Sesión no pertenece a este usuario' }, { status: 403 })
    }

    // Verificar si ya fue procesado
    const subDoc = await firestore.doc(`subscriptions/${auth.uid}`).get()
    if (subDoc.exists && subDoc.data()?.status === 'active') {
      return NextResponse.json({ status: 'already_active' })
    }

    // Obtener suscripción
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id

    if (!subscriptionId) {
      return NextResponse.json({ error: 'No se encontró suscripción' }, { status: 400 })
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    // Mapear items
    let farmQuantity = 0
    let collaboratorQuantity = 0
    let farmItemId: string | undefined
    let collaboratorItemId: string | undefined

    for (const item of subscription.items.data) {
      const priceId = item.price.id
      if (
        priceId === STRIPE_PRICES.farmMonthly ||
        priceId === STRIPE_PRICES.farmAnnual
      ) {
        farmItemId = item.id
        farmQuantity = item.quantity ?? 0
      } else if (
        priceId === STRIPE_PRICES.collaboratorMonthly ||
        priceId === STRIPE_PRICES.collaboratorAnnual
      ) {
        collaboratorItemId = item.id
        collaboratorQuantity = item.quantity ?? 0
      }
    }

    const interval =
      subscription.items.data[0]?.price.recurring?.interval === 'year'
        ? 'year'
        : 'month'

    const now = new Date()
    const periodEnd = new Date(subscription.start_date * 1000)
    if (interval === 'year') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1)
    }

    // Guardar suscripción
    await firestore.doc(`subscriptions/${auth.uid}`).set({
      userId: auth.uid,
      stripeCustomerId:
        typeof session.customer === 'string' ? session.customer : session.customer?.id,
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
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      createdAt: now,
      updatedAt: now,
    })

    // Actualizar usuario
    await firestore.doc(`users/${auth.uid}`).update({
      stripeCustomerId:
        typeof session.customer === 'string' ? session.customer : session.customer?.id,
      subscriptionStatus: 'active',
      planType: 'pro',
    })

    return NextResponse.json({ status: 'activated' })
  } catch (error) {
    console.error('Error confirmando checkout:', error)
    return NextResponse.json(
      { error: 'Error confirmando pago' },
      { status: 500 },
    )
  }
}
