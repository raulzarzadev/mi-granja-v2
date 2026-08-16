import { NextRequest, NextResponse } from 'next/server'
import { dateKey } from '@/lib/ai/server'
import {
  type AiUsageUserProfile,
  buildAiUsageStatistics,
  createAiUsageDateKeys,
  normalizeAiUsageRecord,
} from '@/lib/ai/usage-statistics'
import { isAuthError, isAuthenticatedUserAdmin, verifyBillingAuth } from '@/lib/billing-auth'
import { getAdminFirestore } from '@/lib/firebase-admin'

const ALLOWED_PERIODS = new Set([7, 30, 90])

async function loadUserProfiles(
  firestore: FirebaseFirestore.Firestore,
  userIds: string[],
): Promise<AiUsageUserProfile[]> {
  const profiles: AiUsageUserProfile[] = []
  for (let offset = 0; offset < userIds.length; offset += 100) {
    const refs = userIds
      .slice(offset, offset + 100)
      .map((userId) => firestore.doc(`users/${userId}`))
    const snapshots = refs.length > 0 ? await firestore.getAll(...refs) : []
    for (const snapshot of snapshots) {
      const data = snapshot.data()
      profiles.push({
        id: snapshot.id,
        email: typeof data?.email === 'string' ? data.email : null,
        name: typeof data?.name === 'string' ? data.name : null,
      })
    }
  }
  return profiles
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyBillingAuth(request)
    if (isAuthError(auth)) return auth

    const firestore = getAdminFirestore()
    const userDoc = await firestore.doc(`users/${auth.uid}`).get()
    if (!isAuthenticatedUserAdmin(auth.email, userDoc.data()?.roles)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const requestedDays = Number(request.nextUrl.searchParams.get('days') || 30)
    const days = ALLOWED_PERIODS.has(requestedDays) ? requestedDays : 30
    const dateKeys = createAiUsageDateKeys(dateKey(), days)
    const usageSnapshot = await firestore
      .collection('aiUsage')
      .where('dateKey', '>=', dateKeys[0])
      .get()
    const records = usageSnapshot.docs
      .map((snapshot) => normalizeAiUsageRecord(snapshot.data()))
      .filter((record) => record !== null)
    const userIds = Array.from(new Set(records.map((record) => record.userId)))
    const profiles = await loadUserProfiles(firestore, userIds)
    const statistics = buildAiUsageStatistics({ records, profiles, dateKeys })

    return NextResponse.json({ days, ...statistics })
  } catch (error) {
    console.error('Error cargando estadísticas de IA:', error)
    return NextResponse.json(
      { error: 'No se pudieron cargar las estadísticas de IA' },
      { status: 500 },
    )
  }
}
