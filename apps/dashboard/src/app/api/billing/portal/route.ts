import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, verifyBillingAuth } from '@/lib/billing-auth'
import { getAdminFirestore } from '@/lib/firebase-admin'
import { getStripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyBillingAuth(request)
    if (isAuthError(auth)) return auth

    const subscription = await getAdminFirestore().doc(`subscriptions/${auth.uid}`).get()
    const customerId = subscription.data()?.stripeCustomerId as string | undefined
    if (!customerId) {
      return NextResponse.json(
        { error: 'La cuenta no tiene un cliente de Stripe' },
        { status: 404 },
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      locale: 'es',
      return_url: `${appUrl}/plan`,
    })
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Error creando sesion del portal:', error)
    return NextResponse.json(
      { error: 'No se pudo abrir el portal de facturacion' },
      { status: 500 },
    )
  }
}
