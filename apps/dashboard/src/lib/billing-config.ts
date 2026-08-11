import { PLAN_TIER_IDS, PLAN_TIERS, type PlanTier, type PlanTierId } from '@/types/billing'

export const BILLING_CONFIG_DOCUMENT = 'settings/billing'

interface StoredPlanTier {
  id?: unknown
  label?: unknown
  maxAnimals?: unknown
  priceUsd?: unknown
  stripePriceId?: unknown
  isVisible?: unknown
}

function tierDescription(minAnimals: number, maxAnimals: number | null): string {
  if (maxAnimals === null) return `Mas de ${minAnimals - 1} animales — precio a convenir`
  if (minAnimals === 0) return `Hasta ${maxAnimals} animales`
  return `De ${minAnimals} a ${maxAnimals} animales`
}

export function mergeBillingTiers(value: unknown): PlanTier[] {
  const storedTiers = Array.isArray(value) ? (value as StoredPlanTier[]) : []
  const storedById = new Map(
    storedTiers
      .filter((tier) => typeof tier.id === 'string')
      .map((tier) => [tier.id as PlanTierId, tier]),
  )

  let minAnimals = 0
  return PLAN_TIERS.map((defaultTier, index) => {
    const stored = storedById.get(defaultTier.id)
    const isLast = index === PLAN_TIERS.length - 1
    const maxAnimals = isLast
      ? null
      : typeof stored?.maxAnimals === 'number'
        ? stored.maxAnimals
        : defaultTier.maxAnimals
    const priceUsd =
      defaultTier.id === 'free'
        ? 0
        : typeof stored?.priceUsd === 'number' || stored?.priceUsd === null
          ? stored.priceUsd
          : defaultTier.priceUsd
    const tier: PlanTier = {
      ...defaultTier,
      label:
        typeof stored?.label === 'string' && stored.label.trim()
          ? stored.label.trim()
          : defaultTier.label,
      minAnimals,
      maxAnimals,
      priceUsd,
      isVisible: typeof stored?.isVisible === 'boolean' ? stored.isVisible : defaultTier.isVisible,
      stripePriceId:
        typeof stored?.stripePriceId === 'string' && stored.stripePriceId.trim()
          ? stored.stripePriceId.trim()
          : defaultTier.stripePriceEnv
            ? (process.env[defaultTier.stripePriceEnv] ?? null)
            : null,
      description: tierDescription(minAnimals, maxAnimals),
    }
    if (maxAnimals !== null) minAnimals = maxAnimals + 1
    return tier
  })
}

export function validateBillingTiers(
  value: unknown,
): { tiers: PlanTier[]; error?: never } | { tiers?: never; error: string } {
  if (!Array.isArray(value) || value.length !== PLAN_TIER_IDS.length) {
    return { error: `Se requieren exactamente ${PLAN_TIER_IDS.length} planes` }
  }

  const tiersById = new Map(
    (value as StoredPlanTier[])
      .filter((tier) => typeof tier.id === 'string')
      .map((tier) => [tier.id as PlanTierId, tier]),
  )
  if (PLAN_TIER_IDS.some((id) => !tiersById.has(id))) {
    return { error: 'La lista de planes esta incompleta' }
  }

  let minAnimals = 0
  const tiers: PlanTier[] = []
  for (let index = 0; index < PLAN_TIERS.length; index += 1) {
    const defaultTier = PLAN_TIERS[index]
    const input = tiersById.get(defaultTier.id)!
    const label = typeof input.label === 'string' ? input.label.trim() : ''
    if (!label || label.length > 40) {
      return { error: `El nombre de ${defaultTier.label} debe tener entre 1 y 40 caracteres` }
    }

    const isLast = index === PLAN_TIERS.length - 1
    const maxAnimals = isLast ? null : Number(input.maxAnimals)
    if (maxAnimals !== null && (!Number.isInteger(maxAnimals) || maxAnimals < minAnimals)) {
      return {
        error: `El limite de ${label} debe ser un entero mayor o igual a ${minAnimals}`,
      }
    }

    const rawPrice = input.priceUsd
    const priceUsd = defaultTier.id === 'free' ? 0 : rawPrice === null ? null : Number(rawPrice)
    if (
      defaultTier.id !== 'free' &&
      priceUsd !== null &&
      (!Number.isFinite(priceUsd) || priceUsd < 0)
    ) {
      return { error: `El precio de ${label} debe ser un numero positivo o quedar a convenir` }
    }

    const stripePriceId =
      typeof input.stripePriceId === 'string' && input.stripePriceId.trim()
        ? input.stripePriceId.trim()
        : null
    if (stripePriceId && !stripePriceId.startsWith('price_')) {
      return { error: `El Price ID de Stripe para ${label} debe comenzar con price_` }
    }

    tiers.push({
      ...defaultTier,
      label,
      minAnimals,
      maxAnimals,
      priceUsd,
      isVisible: typeof input.isVisible === 'boolean' ? input.isVisible : defaultTier.isVisible,
      stripePriceId,
      description: tierDescription(minAnimals, maxAnimals),
    })
    if (maxAnimals !== null) minAnimals = maxAnimals + 1
  }

  return { tiers }
}

export async function getBillingTiers(firestore: FirebaseFirestore.Firestore): Promise<PlanTier[]> {
  const configDoc = await firestore.doc(BILLING_CONFIG_DOCUMENT).get()
  return mergeBillingTiers(configDoc.data()?.tiers)
}

export function serializeBillingTiers(tiers: PlanTier[]) {
  return tiers.map(({ id, label, maxAnimals, priceUsd, stripePriceId, isVisible }) => ({
    id,
    label,
    maxAnimals,
    priceUsd,
    stripePriceId: stripePriceId ?? null,
    isVisible,
  }))
}
