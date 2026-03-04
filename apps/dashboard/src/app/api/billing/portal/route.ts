import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, verifyBillingAuth } from '@/lib/billing-auth'
import { getStripe } from '@/lib/stripe'
import { getAdminFirestore } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyBillingAuth(request)
    if (isAuthError(auth)) return auth

    const { returnUrl } = await request.json()
    if (!returnUrl) {
      return NextResponse.json({ error: 'returnUrl es requerido' }, { status: 400 })
    }

    const firestore = getAdminFirestore()
    const userDoc = await firestore.doc(`users/${auth.uid}`).get()
    const customerId = userDoc.data()?.stripeCustomerId as string | undefined

    if (!customerId) {
      return NextResponse.json(
        { error: 'No se encontró una suscripción activa' },
        { status: 404 },
      )
    }

    const stripe = getStripe()
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Error creando portal session:', error)
    return NextResponse.json(
      { error: 'Error al abrir el portal de facturación' },
      { status: 500 },
    )
  }
}
