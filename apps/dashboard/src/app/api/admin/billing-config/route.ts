import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, isAuthenticatedUserAdmin, verifyBillingAuth } from '@/lib/billing-auth'
import {
  BILLING_CONFIG_DOCUMENT,
  getBillingTiers,
  serializeBillingTiers,
  validateBillingTiers,
} from '@/lib/billing-config'
import { getAdminFirestore } from '@/lib/firebase-admin'

async function getAdminContext(request: NextRequest) {
  const auth = await verifyBillingAuth(request)
  if (isAuthError(auth)) return { error: auth }

  const firestore = getAdminFirestore()
  const userDoc = await firestore.doc(`users/${auth.uid}`).get()
  const isAdmin = isAuthenticatedUserAdmin(auth.email, userDoc.data()?.roles)
  if (!isAdmin) {
    return { error: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }) }
  }
  return { auth, firestore }
}

export async function GET(request: NextRequest) {
  try {
    const context = await getAdminContext(request)
    if ('error' in context) return context.error

    const tiers = await getBillingTiers(context.firestore)
    return NextResponse.json({ tiers })
  } catch (error) {
    console.error('Error cargando configuracion de billing:', error)
    return NextResponse.json({ error: 'No se pudo cargar la configuracion' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const context = await getAdminContext(request)
    if ('error' in context) return context.error

    const body = await request.json()
    const validated = validateBillingTiers(body.tiers)
    if (!validated.tiers) {
      return NextResponse.json({ error: validated.error }, { status: 400 })
    }

    const currentTiers = await getBillingTiers(context.firestore)
    const hasMismatchedStripePrice = validated.tiers.find((tier) => {
      if (tier.id === 'free' || tier.id === 'empresarial') return false
      const currentTier = currentTiers.find((current) => current.id === tier.id)
      if (!currentTier || currentTier.priceUsd === tier.priceUsd) return false
      return currentTier.stripePriceId === tier.stripePriceId
    })
    if (hasMismatchedStripePrice) {
      return NextResponse.json(
        {
          error: `Actualiza el Price ID de Stripe para ${hasMismatchedStripePrice.label} antes de cambiar su precio`,
        },
        { status: 400 },
      )
    }

    const now = new Date().toISOString()
    await context.firestore.doc(BILLING_CONFIG_DOCUMENT).set(
      {
        tiers: serializeBillingTiers(validated.tiers),
        updatedAt: now,
        updatedBy: context.auth.uid,
        updatedByEmail: context.auth.email,
      },
      { merge: true },
    )

    return NextResponse.json({ tiers: validated.tiers, updatedAt: now })
  } catch (error) {
    console.error('Error guardando configuracion de billing:', error)
    return NextResponse.json({ error: 'No se pudo guardar la configuracion' }, { status: 500 })
  }
}
