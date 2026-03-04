import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, verifyBillingAuth } from '@/lib/billing-auth'
import { getAdminFirestore } from '@/lib/firebase-admin'
import { computeActualLimits, type PlanType } from '@/types/billing'

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

export async function GET(request: NextRequest) {
  try {
    const result = await verifyAdmin(request)
    if ('error' in result) return result.error
    const { firestore } = result

    // Obtener todas las suscripciones
    const subsSnap = await firestore.collection('subscriptions').get()

    let activeSubscriptions = 0
    let pastDueSubscriptions = 0
    let canceledSubscriptions = 0
    let mrr = 0

    const subscriptions = []
    const usersWithSub = new Set<string>()

    for (const doc of subsSnap.docs) {
      const data = doc.data()
      const userId = data.userId ?? doc.id

      usersWithSub.add(userId)

      if (data.status === 'active') {
        activeSubscriptions++
        mrr += data.monthlyAmount ?? 0
      } else if (data.status === 'past_due') {
        pastDueSubscriptions++
      } else if (data.status === 'canceled' || data.status === 'suspended') {
        canceledSubscriptions++
      }

      // Obtener email del usuario
      const subUserDoc = await firestore.doc(`users/${userId}`).get()
      const subUserData = subUserDoc.data()

      // Contar granjas y colaboradores reales
      const counts = await getUserCounts(firestore, userId)
      const limits = computeActualLimits(data.planType ?? 'free', {
        farmQuantity: data.farmQuantity ?? 0,
        collaboratorQuantity: data.collaboratorQuantity ?? 0,
      })

      subscriptions.push({
        userId,
        email: subUserData?.email ?? '?',
        planType: data.planType ?? 'free',
        status: data.status ?? 'none',
        monthlyAmount: data.monthlyAmount ?? 0,
        farmQuantity: data.farmQuantity ?? 0,
        collaboratorQuantity: data.collaboratorQuantity ?? 0,
        actualFarmCount: counts.actualFarmCount,
        actualCollaboratorCount: counts.actualCollaboratorCount,
        maxFarms: limits.maxFarms,
        maxCollaborators: limits.maxCollaboratorsPerFarm,
      })
    }

    // Incluir usuarios sin suscripción (plan free)
    const usersSnap = await firestore.collection('users').get()
    for (const userDoc of usersSnap.docs) {
      if (usersWithSub.has(userDoc.id)) continue

      const userData = userDoc.data()
      const counts = await getUserCounts(firestore, userDoc.id)
      const limits = computeActualLimits('free', null)

      subscriptions.push({
        userId: userDoc.id,
        email: userData?.email ?? '?',
        planType: 'free',
        status: 'none',
        monthlyAmount: 0,
        farmQuantity: 0,
        collaboratorQuantity: 0,
        actualFarmCount: counts.actualFarmCount,
        actualCollaboratorCount: counts.actualCollaboratorCount,
        maxFarms: limits.maxFarms,
        maxCollaborators: limits.maxCollaboratorsPerFarm,
      })
    }

    return NextResponse.json({
      stats: {
        totalSubscriptions: subsSnap.size,
        activeSubscriptions,
        pastDueSubscriptions,
        canceledSubscriptions,
        mrr,
      },
      subscriptions,
    })
  } catch (error) {
    console.error('Error en admin billing:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await verifyAdmin(request)
    if ('error' in result) return result.error
    const { firestore } = result

    const body = await request.json()
    const { userId, planType, farmQuantity, collaboratorQuantity } = body as {
      userId: string
      planType: PlanType
      farmQuantity: number
      collaboratorQuantity: number
    }

    if (!userId || !planType) {
      return NextResponse.json(
        { error: 'userId y planType son requeridos' },
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

    if (planType === 'pro') {
      // Crear o actualizar suscripción manual
      await firestore.doc(`subscriptions/${userId}`).set(
        {
          userId,
          planType: 'pro',
          status: 'active',
          provider: 'manual',
          interval: 'month',
          farmQuantity: farmQuantity ?? 0,
          collaboratorQuantity: collaboratorQuantity ?? 0,
          monthlyAmount: 0, // Asignación manual sin cobro
          cancelAtPeriodEnd: false,
          updatedAt: now,
          createdAt: now,
        },
        { merge: true },
      )
    } else {
      // Plan free: eliminar o marcar como none
      const subDoc = await firestore.doc(`subscriptions/${userId}`).get()
      if (subDoc.exists) {
        await firestore.doc(`subscriptions/${userId}`).update({
          planType: 'free',
          status: 'none',
          farmQuantity: 0,
          collaboratorQuantity: 0,
          monthlyAmount: 0,
          provider: 'manual',
          updatedAt: now,
        })
      }
    }

    // Denormalizar en el documento del usuario
    await firestore.doc(`users/${userId}`).update({
      planType,
      subscriptionStatus: planType === 'pro' ? 'active' : 'none',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error asignando plan:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}
