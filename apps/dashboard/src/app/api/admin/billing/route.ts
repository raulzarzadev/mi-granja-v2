import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, verifyBillingAuth } from '@/lib/billing-auth'
import { getAdminFirestore } from '@/lib/firebase-admin'
import { computeUsedPlaces } from '@/types/billing'

async function verifyAdmin(request: NextRequest) {
  const auth = await verifyBillingAuth(request)
  if (isAuthError(auth)) return { error: auth }

  const firestore = getAdminFirestore()
  const userDoc = await firestore.doc(`users/${auth.uid}`).get()
  const userData = userDoc.data()
  const isAdmin =
    userData?.roles?.includes('admin') ||
    auth.email === 'zarza@migranja.app'

  if (!isAdmin) {
    return { error: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }) }
  }

  return { auth, firestore }
}

async function getUserCounts(firestore: FirebaseFirestore.Firestore, userId: string) {
  const farmsSnap = await firestore
    .collection('farms')
    .where('ownerId', '==', userId)
    .get()
  const actualFarmCount = farmsSnap.size

  let actualCollaboratorCount = 0
  for (const farmDoc of farmsSnap.docs) {
    const farmData = farmDoc.data()
    const collabs = (farmData.collaborators ?? []) as { isActive?: boolean }[]
    actualCollaboratorCount += collabs.filter((c) => c.isActive !== false).length
  }

  return { actualFarmCount, actualCollaboratorCount }
}

/** GET /api/admin/billing — datos de un usuario especifico */
export async function GET(request: NextRequest) {
  try {
    const result = await verifyAdmin(request)
    if ('error' in result) return result.error
    const { firestore } = result

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId requerido' }, { status: 400 })
    }

    const subDoc = await firestore.doc(`subscriptions/${userId}`).get()
    const subData = subDoc.exists ? subDoc.data() : null
    const places = subData?.places ?? 0
    const counts = await getUserCounts(firestore, userId)
    const usedPlaces = computeUsedPlaces(counts.actualFarmCount, counts.actualCollaboratorCount)

    return NextResponse.json({
      places,
      planType: subData?.planType ?? 'free',
      actualFarmCount: counts.actualFarmCount,
      actualCollaboratorCount: counts.actualCollaboratorCount,
      usedPlaces,
    })
  } catch (error) {
    console.error('Error en admin billing:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}

/** POST /api/admin/billing — asignar lugares a un usuario */
export async function POST(request: NextRequest) {
  try {
    const result = await verifyAdmin(request)
    if ('error' in result) return result.error
    const { firestore } = result

    const body = await request.json()
    const { userId, places } = body as {
      userId: string
      places: number
    }

    if (!userId || places === undefined) {
      return NextResponse.json(
        { error: 'userId y places son requeridos' },
        { status: 400 },
      )
    }

    // Verificar que el usuario existe
    const userDoc = await firestore.doc(`users/${userId}`).get()
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 },
      )
    }

    const now = new Date().toISOString()
    const planType = places > 0 ? 'pro' : 'free'
    const status = places > 0 ? 'active' : 'none'

    if (places > 0) {
      await firestore.doc(`subscriptions/${userId}`).set(
        {
          userId,
          planType: 'pro',
          status: 'active',
          places,
          updatedAt: now,
          createdAt: now,
        },
        { merge: true },
      )
    } else {
      const subDoc = await firestore.doc(`subscriptions/${userId}`).get()
      if (subDoc.exists) {
        await firestore.doc(`subscriptions/${userId}`).update({
          planType: 'free',
          status: 'none',
          places: 0,
          updatedAt: now,
        })
      }
    }

    // Denormalizar en el documento del usuario
    await firestore.doc(`users/${userId}`).update({
      planType,
      subscriptionStatus: status,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error asignando lugares:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}
