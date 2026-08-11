import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, resolveEffectiveUid, verifyBillingAuth } from '@/lib/billing-auth'
import { getAdminFirestore } from '@/lib/firebase-admin'
import {
  type BillingSubscription,
  PAID_STATUSES,
  type PlanTierId,
  planTypeForTier,
} from '@/types/billing'

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyBillingAuth(request)
    if (isAuthError(auth)) return auth

    const uid = resolveEffectiveUid(auth, request)
    const firestore = getAdminFirestore()

    // Obtener suscripcion de Firestore
    const subDoc = await firestore.doc(`subscriptions/${uid}`).get()

    if (!subDoc.exists) {
      return NextResponse.json({
        subscription: null,
        planType: 'free',
        status: 'none',
        tierId: 'free',
      })
    }

    const storedSubscription = { id: subDoc.id, ...subDoc.data() } as BillingSubscription
    const tierId = (storedSubscription.tierId ?? 'free') as PlanTierId
    const planType = PAID_STATUSES.includes(storedSubscription.status)
      ? planTypeForTier(tierId)
      : 'free'
    const subscription = { ...storedSubscription, tierId, planType }

    return NextResponse.json({
      subscription,
      planType,
      status: subscription.status,
      tierId,
    })
  } catch (error) {
    console.error('Error obteniendo suscripcion:', error)
    return NextResponse.json({ error: 'Error al obtener datos de suscripcion' }, { status: 500 })
  }
}
