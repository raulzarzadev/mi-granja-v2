import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, verifyBillingAuth } from '@/lib/billing-auth'
import { getAdminFirestore } from '@/lib/firebase-admin'
import type { BillingSubscription } from '@/types/billing'

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyBillingAuth(request)
    if (isAuthError(auth)) return auth

    const firestore = getAdminFirestore()

    // Obtener suscripción
    const subDoc = await firestore.doc(`subscriptions/${auth.uid}`).get()

    if (!subDoc.exists) {
      return NextResponse.json({
        subscription: null,
        planType: 'free',
        status: 'none',
      })
    }

    const subscription = { id: subDoc.id, ...subDoc.data() } as BillingSubscription

    // Obtener facturas recientes
    const invoicesSnap = await firestore
      .collection('invoices')
      .where('userId', '==', auth.uid)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get()

    const invoices = invoicesSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json({
      subscription,
      invoices,
      planType: subscription.planType,
      status: subscription.status,
    })
  } catch (error) {
    console.error('Error obteniendo suscripción:', error)
    return NextResponse.json(
      { error: 'Error al obtener datos de suscripción' },
      { status: 500 },
    )
  }
}
