import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, verifyBillingAuth } from '@/lib/billing-auth'
import { getAdminFirestore } from '@/lib/firebase-admin'
import type { BillingSubscription } from '@/types/billing'

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyBillingAuth(request)
    if (isAuthError(auth)) return auth

    const firestore = getAdminFirestore()

    // Obtener suscripcion de Firestore
    const subDoc = await firestore.doc(`subscriptions/${auth.uid}`).get()

    if (!subDoc.exists) {
      return NextResponse.json({
        subscription: null,
        planType: 'free',
        status: 'none',
      })
    }

    const subscription = { id: subDoc.id, ...subDoc.data() } as BillingSubscription

    return NextResponse.json({
      subscription,
      planType: subscription.planType,
      status: subscription.status,
    })
  } catch (error) {
    console.error('Error obteniendo suscripcion:', error)
    return NextResponse.json(
      { error: 'Error al obtener datos de suscripcion' },
      { status: 500 },
    )
  }
}
