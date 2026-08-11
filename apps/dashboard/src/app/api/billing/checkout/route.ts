import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, verifyBillingAuth } from '@/lib/billing-auth'
import { getBillingTiers } from '@/lib/billing-config'
import { getAdminFirestore } from '@/lib/firebase-admin'
import { getStripe, getStripePriceId } from '@/lib/stripe'
import {
  getTierById,
  PAID_STATUSES,
  PLAN_TIER_IDS,
  type PlanTierId,
  type SubscriptionStatus,
} from '@/types/billing'

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyBillingAuth(request)
    if (isAuthError(auth)) return auth

    const { tierId } = (await request.json()) as { tierId?: PlanTierId }
    if (
      !tierId ||
      !PLAN_TIER_IDS.includes(tierId) ||
      tierId === 'free' ||
      tierId === 'empresarial'
    ) {
      return NextResponse.json({ error: 'Selecciona un tier de pago valido' }, { status: 400 })
    }

    const firestore = getAdminFirestore()
    const tiers = await getBillingTiers(firestore)
    const tier = getTierById(tierId, tiers)
    if (!tier.isVisible) {
      return NextResponse.json(
        { error: 'Este plan no está disponible actualmente' },
        { status: 400 },
      )
    }
    const priceId = getStripePriceId(tierId, tiers)
    if (!priceId) {
      return NextResponse.json(
        { error: `El precio de ${tier.label} aun no esta configurado` },
        { status: 503 },
      )
    }

    const subscriptionDoc = await firestore.doc(`subscriptions/${auth.uid}`).get()
    const subscriptionData = subscriptionDoc.data()
    const customerId = subscriptionData?.stripeCustomerId as string | undefined
    const status = subscriptionData?.status as SubscriptionStatus | undefined
    if (subscriptionData?.stripeSubscriptionId && status && PAID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: 'Administra el cambio de tier desde el portal de facturacion' },
        { status: 409 },
      )
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      locale: 'es',
      ...(customerId ? { customer: customerId } : { customer_email: auth.email }),
      client_reference_id: auth.uid,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${appUrl}/plan?checkout=success`,
      cancel_url: `${appUrl}/plan?checkout=canceled`,
      metadata: { userId: auth.uid, tierId },
      subscription_data: { metadata: { userId: auth.uid, tierId } },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Error creando Checkout Session:', error)
    return NextResponse.json({ error: 'No se pudo iniciar el checkout' }, { status: 500 })
  }
}
