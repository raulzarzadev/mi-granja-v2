import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, isAuthenticatedUserAdmin, verifyBillingAuth } from '@/lib/billing-auth'
import { getBillingTiers } from '@/lib/billing-config'
import { buildBillingUsage } from '@/lib/billing-usage'
import { getAdminFirestore } from '@/lib/firebase-admin'
import { getTierById, PLAN_TIER_IDS, type PlanTierId, planTypeForTier } from '@/types/billing'

async function verifyAdmin(request: NextRequest) {
  const auth = await verifyBillingAuth(request)
  if (isAuthError(auth)) return { error: auth }

  const firestore = getAdminFirestore()
  const userDoc = await firestore.doc(`users/${auth.uid}`).get()
  const userData = userDoc.data()
  const isAdmin = isAuthenticatedUserAdmin(auth.email, userData?.roles)

  if (!isAdmin) {
    return { error: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }) }
  }

  return { auth, firestore }
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
    const usage = await buildBillingUsage(firestore, userId)

    return NextResponse.json({
      tierId: usage.currentTierId,
      planType: subData?.planType ?? 'free',
      status: subData?.status ?? 'none',
      animalCount: usage.animalCount,
      requiredTierId: usage.requiredTierId,
      animalLimit: usage.animalLimit,
      actualFarmCount: usage.farmCount,
      actualCollaboratorCount: usage.collaboratorCount,
    })
  } catch (error) {
    console.error('Error en admin billing:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/** POST /api/admin/billing — asignar manualmente un tier a un usuario */
export async function POST(request: NextRequest) {
  try {
    const result = await verifyAdmin(request)
    if ('error' in result) return result.error
    const { firestore } = result

    const body = await request.json()
    const { userId, tierId } = body as {
      userId: string
      tierId: PlanTierId
    }

    if (!userId || !PLAN_TIER_IDS.includes(tierId)) {
      return NextResponse.json({ error: 'userId y tierId valido son requeridos' }, { status: 400 })
    }

    // Verificar que el usuario existe
    const userDoc = await firestore.doc(`users/${userId}`).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const now = new Date().toISOString()
    const planType = planTypeForTier(tierId)
    const status = tierId === 'free' ? 'none' : 'active'
    const tier = getTierById(tierId, await getBillingTiers(firestore))

    if (tierId !== 'free') {
      await firestore.doc(`subscriptions/${userId}`).set(
        {
          userId,
          planType,
          status,
          tierId,
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
          tierId: 'free',
          updatedAt: now,
        })
      }
    }

    // Denormalizar en el documento del usuario
    await firestore.doc(`users/${userId}`).update({
      planType,
      subscriptionStatus: status,
      billingTierId: tierId,
    })

    return NextResponse.json({ success: true, tier, status })
  } catch (error) {
    console.error('Error asignando tier:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
