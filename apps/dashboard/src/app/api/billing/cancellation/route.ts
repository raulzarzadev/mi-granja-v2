import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, verifyBillingAuth } from '@/lib/billing-auth'
import { getAdminFirestore } from '@/lib/firebase-admin'
import { getStripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyBillingAuth(request)
    if (isAuthError(auth)) return auth

    if (request.headers.has('x-impersonate-uid')) {
      return NextResponse.json(
        { error: 'No puedes cancelar una suscripción mientras impersonas a un usuario' },
        { status: 403 },
      )
    }

    const { cancelAtPeriodEnd } = (await request.json()) as { cancelAtPeriodEnd?: unknown }
    if (typeof cancelAtPeriodEnd !== 'boolean') {
      return NextResponse.json({ error: 'La acción de cancelación no es válida' }, { status: 400 })
    }

    const subscriptionDoc = await getAdminFirestore().doc(`subscriptions/${auth.uid}`).get()
    const stripeSubscriptionId = subscriptionDoc.data()?.stripeSubscriptionId as string | undefined
    if (!stripeSubscriptionId) {
      return NextResponse.json({ error: 'No existe una suscripción activa' }, { status: 404 })
    }

    const currentSubscription = await getStripe().subscriptions.retrieve(stripeSubscriptionId)
    if (currentSubscription.metadata.userId && currentSubscription.metadata.userId !== auth.uid) {
      return NextResponse.json(
        { error: 'La suscripción no pertenece a esta cuenta' },
        { status: 403 },
      )
    }
    if (currentSubscription.status === 'canceled') {
      return NextResponse.json({ error: 'La suscripción ya terminó' }, { status: 409 })
    }

    const subscription = await getStripe().subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: cancelAtPeriodEnd,
    })
    const currentPeriodEnd = subscription.items.data[0]?.current_period_end

    return NextResponse.json({
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
    })
  } catch (error) {
    console.error('Error actualizando la cancelación de Stripe:', error)
    return NextResponse.json(
      { error: 'No se pudo actualizar la cancelación de la suscripción' },
      { status: 500 },
    )
  }
}
