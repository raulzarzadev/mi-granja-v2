import {
  type BillingUsage,
  getTierById,
  getTierForAnimalCount,
  PAID_STATUSES,
  type PlanTierId,
  type SubscriptionStatus,
} from '@/types/billing'
import { getBillingTiers } from './billing-config'

/** Estados de animal que NO cuentan para el cobro */
const NON_BILLABLE_STATUSES = ['muerto', 'vendido']

/** Firestore limita los `in` a 30 valores */
const IN_CHUNK = 30

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

async function getOwnedFarmIds(
  firestore: FirebaseFirestore.Firestore,
  uid: string,
): Promise<string[]> {
  const farmsSnap = await firestore.collection('farms').where('ownerId', '==', uid).get()
  return farmsSnap.docs.filter((d) => !d.data().deletedAt).map((d) => d.id)
}

/**
 * Cuenta animales facturables del usuario: activos (ni muertos ni vendidos) en
 * cualquier granja de su propiedad, mas los legacy sin `farmId` creados por el.
 */
export async function countBillableAnimals(
  firestore: FirebaseFirestore.Firestore,
  uid: string,
  farmIds: string[],
): Promise<number> {
  const seen = new Set<string>()

  const addDocs = (snap: FirebaseFirestore.QuerySnapshot) => {
    for (const doc of snap.docs) {
      const status = doc.data().status as string | undefined
      if (status && NON_BILLABLE_STATUSES.includes(status)) continue
      seen.add(doc.id)
    }
  }

  for (const batch of chunk(farmIds, IN_CHUNK)) {
    const snap = await firestore
      .collection('animals')
      .where('farmId', 'in', batch)
      .select('status')
      .get()
    addDocs(snap)
  }

  // Animales legacy sin granja asignada
  const legacySnap = await firestore
    .collection('animals')
    .where('farmerId', '==', uid)
    .select('status', 'farmId')
    .get()
  for (const doc of legacySnap.docs) {
    const data = doc.data()
    if (data.farmId) continue // ya contado (o de una granja ajena)
    const status = data.status as string | undefined
    if (status && NON_BILLABLE_STATUSES.includes(status)) continue
    seen.add(doc.id)
  }

  return seen.size
}

async function countCollaborators(
  firestore: FirebaseFirestore.Firestore,
  farmIds: string[],
): Promise<number> {
  let total = 0
  for (const batch of chunk(farmIds, IN_CHUNK)) {
    const snap = await firestore
      .collection('farmInvitations')
      .where('farmId', 'in', batch)
      .where('status', 'in', ['pending', 'accepted'])
      .get()
    total += snap.size
  }
  return total
}

/** Tier vigente segun la suscripcion guardada (free si no hay pago al corriente) */
export function resolveActiveTierId(subData: FirebaseFirestore.DocumentData | null): PlanTierId {
  if (!subData) return 'free'
  const status = subData.status as SubscriptionStatus | undefined
  if (!status || !PAID_STATUSES.includes(status)) return 'free'
  const tierId = subData.tierId as PlanTierId | undefined
  return tierId ?? 'free'
}

/** Uso completo de billing de un usuario */
export async function buildBillingUsage(
  firestore: FirebaseFirestore.Firestore,
  uid: string,
): Promise<BillingUsage> {
  const farmIds = await getOwnedFarmIds(firestore, uid)

  const [animalCount, collaboratorCount, subDoc, tiers] = await Promise.all([
    countBillableAnimals(firestore, uid, farmIds),
    countCollaborators(firestore, farmIds),
    firestore.doc(`subscriptions/${uid}`).get(),
    getBillingTiers(firestore),
  ])

  const currentTierId = resolveActiveTierId(subDoc.exists ? (subDoc.data() ?? null) : null)
  const currentTier = getTierById(currentTierId, tiers)

  return {
    animalCount,
    farmCount: farmIds.length,
    collaboratorCount,
    currentTierId,
    requiredTierId: getTierForAnimalCount(animalCount, tiers).id,
    animalLimit: currentTier.maxAnimals,
    tiers,
  }
}
