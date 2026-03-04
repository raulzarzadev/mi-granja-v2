import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, verifyBillingAuth } from '@/lib/billing-auth'
import { getStripe, STRIPE_PRICES } from '@/lib/stripe'
import { getAdminFirestore } from '@/lib/firebase-admin'
import type { BillingInterval } from '@/types/billing'

interface CheckoutRequest {
  extraFarms: number
  extraCollaborators: number
  interval: BillingInterval
  successUrl: string
  cancelUrl: string
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyBillingAuth(request)
    if (isAuthError(auth)) return auth

    const body: CheckoutRequest = await request.json()
    const { extraFarms, extraCollaborators, interval, successUrl, cancelUrl } = body

    if (extraFarms < 1 && extraCollaborators < 1) {
      return NextResponse.json(
        { error: 'Se requiere al menos una granja o colaborador adicional' },
        { status: 400 },
      )
    }

    const stripe = getStripe()
    const firestore = getAdminFirestore()

    // Buscar o crear customer de Stripe
    const userDoc = await firestore.doc(`users/${auth.uid}`).get()
    const userData = userDoc.data()
    let customerId = userData?.stripeCustomerId as string | undefined

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: auth.email,
        metadata: { firebaseUserId: auth.uid },
      })
      customerId = customer.id
      await firestore.doc(`users/${auth.uid}`).update({ stripeCustomerId: customerId })
    }

    // Construir line items
    const lineItems: { price: string; quantity: number }[] = []

    if (extraFarms > 0) {
      const priceId =
        interval === 'year' ? STRIPE_PRICES.farmAnnual : STRIPE_PRICES.farmMonthly
      lineItems.push({ price: priceId, quantity: extraFarms })
    }

    if (extraCollaborators > 0) {
      const priceId =
        interval === 'year'
          ? STRIPE_PRICES.collaboratorAnnual
          : STRIPE_PRICES.collaboratorMonthly
      lineItems.push({ price: priceId, quantity: extraCollaborators })
    }

    // Crear sesión de Checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: lineItems,
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        firebaseUserId: auth.uid,
        extraFarms: String(extraFarms),
        extraCollaborators: String(extraCollaborators),
      },
      subscription_data: {
        metadata: {
          firebaseUserId: auth.uid,
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Error creando sesión de checkout:', error)
    return NextResponse.json(
      { error: 'Error al crear sesión de pago' },
      { status: 500 },
    )
  }
}
