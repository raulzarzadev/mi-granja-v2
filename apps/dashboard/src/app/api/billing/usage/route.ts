import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, resolveEffectiveUid, verifyBillingAuth } from '@/lib/billing-auth'
import { getAdminFirestore } from '@/lib/firebase-admin'
import { type BillingUsage, computeUsedPlaces } from '@/types/billing'

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyBillingAuth(request)
    if (isAuthError(auth)) return auth

    const uid = resolveEffectiveUid(auth, request)
    const firestore = getAdminFirestore()

    // Contar granjas del usuario (como dueno), excluyendo soft-deleted
    const farmsSnap = await firestore.collection('farms').where('ownerId', '==', uid).get()
    const activeFarms = farmsSnap.docs.filter((d) => !d.data().deletedAt)
    const farmCount = activeFarms.length

    // Contar colaboradores via invitaciones (pending o accepted) en granjas propias
    const activeFarmIds = activeFarms.map((d) => d.id)
    let collaboratorCount = 0

    if (activeFarmIds.length > 0) {
      for (let i = 0; i < activeFarmIds.length; i += 30) {
        const batch = activeFarmIds.slice(i, i + 30)
        const invSnap = await firestore
          .collection('farmInvitations')
          .where('farmId', 'in', batch)
          .where('status', 'in', ['pending', 'accepted'])
          .get()
        collaboratorCount += invSnap.size
      }
    }

    // Obtener lugares asignados
    const subDoc = await firestore.doc(`subscriptions/${uid}`).get()
    const subData = subDoc.exists ? subDoc.data() : null
    // Free = 1 lugar (granja gratis). Pro = lugares asignados por admin
    const assignedPlaces = subData?.places ?? 0
    const totalPlaces = assignedPlaces > 0 ? assignedPlaces : 1

    const usage: BillingUsage = {
      farmCount,
      collaboratorCount,
      totalPlaces,
      usedPlaces: computeUsedPlaces(farmCount, collaboratorCount),
    }

    return NextResponse.json(usage)
  } catch (error) {
    console.error('Error obteniendo uso:', error)
    return NextResponse.json({ error: 'Error al obtener datos de uso' }, { status: 500 })
  }
}
