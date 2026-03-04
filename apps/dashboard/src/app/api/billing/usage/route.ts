import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, verifyBillingAuth } from '@/lib/billing-auth'
import { getAdminFirestore } from '@/lib/firebase-admin'
import { computeActualLimits, type BillingUsage } from '@/types/billing'

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyBillingAuth(request)
    if (isAuthError(auth)) return auth

    const firestore = getAdminFirestore()

    // Contar granjas del usuario (como dueño)
    const farmsSnap = await firestore
      .collection('farms')
      .where('ownerId', '==', auth.uid)
      .get()
    const farmCount = farmsSnap.size

    // Contar colaboradores activos en todas las granjas del usuario
    let collaboratorCount = 0
    for (const farmDoc of farmsSnap.docs) {
      const farmData = farmDoc.data()
      const collabs = (farmData.collaborators ?? []) as { isActive?: boolean }[]
      collaboratorCount += collabs.filter((c) => c.isActive !== false).length
    }

    // Determinar límites basados en plan y cantidades reales de la suscripción
    const subDoc = await firestore.doc(`subscriptions/${auth.uid}`).get()
    const subData = subDoc.exists ? subDoc.data() : null
    const planType = subData?.planType ?? 'free'
    const limits = computeActualLimits(planType, subData ? {
      farmQuantity: subData.farmQuantity ?? 0,
      collaboratorQuantity: subData.collaboratorQuantity ?? 0,
    } : null)

    const usage: BillingUsage = {
      farmCount,
      collaboratorCount,
      limits,
    }

    return NextResponse.json(usage)
  } catch (error) {
    console.error('Error obteniendo uso:', error)
    return NextResponse.json(
      { error: 'Error al obtener datos de uso' },
      { status: 500 },
    )
  }
}
