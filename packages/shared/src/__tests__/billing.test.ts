import {
  animalsRemaining,
  type BillingUsage,
  canAddAnimals,
  getPriceForAnimalCount,
  getTierForAnimalCount,
  isOverLimit,
  PLAN_TIERS,
  planTypeForTier,
} from '../types/billing'

const usage = (animalCount: number, animalLimit: number | null): BillingUsage => ({
  animalCount,
  farmCount: 1,
  collaboratorCount: 0,
  currentTierId: 'free',
  requiredTierId: getTierForAnimalCount(animalCount).id,
  animalLimit,
  tiers: PLAN_TIERS,
})

describe('getTierForAnimalCount', () => {
  it.each([
    [0, 'free'],
    [10, 'free'],
    [11, 'inicial'],
    [50, 'inicial'],
    [51, 'basico'],
    [100, 'basico'],
    [101, 'pro'],
    [500, 'pro'],
    [501, 'rancho'],
    [1000, 'rancho'],
    [1001, 'empresarial'],
    [25000, 'empresarial'],
  ])('%i animales -> tier %s', (count, tierId) => {
    expect(getTierForAnimalCount(count).id).toBe(tierId)
  })

  it('trata valores invalidos o negativos como 0', () => {
    expect(getTierForAnimalCount(-5).id).toBe('free')
    expect(getTierForAnimalCount(Number.NaN).id).toBe('free')
  })
})

describe('getPriceForAnimalCount', () => {
  it('devuelve el precio del tier', () => {
    expect(getPriceForAnimalCount(5)).toBe(0)
    expect(getPriceForAnimalCount(30)).toBe(2.5)
    expect(getPriceForAnimalCount(80)).toBe(5)
    expect(getPriceForAnimalCount(300)).toBe(20)
    expect(getPriceForAnimalCount(700)).toBe(40)
  })

  it('devuelve null (a convenir) arriba de 1000', () => {
    expect(getPriceForAnimalCount(1500)).toBeNull()
  })
})

describe('tiers', () => {
  it('cubren el rango sin huecos ni traslapes', () => {
    for (let i = 1; i < PLAN_TIERS.length; i++) {
      const prev = PLAN_TIERS[i - 1]
      expect(prev.maxAnimals).not.toBeNull()
      expect(PLAN_TIERS[i].minAnimals).toBe((prev.maxAnimals as number) + 1)
    }
    expect(PLAN_TIERS[PLAN_TIERS.length - 1].maxAnimals).toBeNull()
  })
})

describe('planTypeForTier', () => {
  it('free -> free, cualquier tier de pago -> pro', () => {
    expect(planTypeForTier('free')).toBe('free')
    expect(planTypeForTier('inicial')).toBe('pro')
    expect(planTypeForTier('empresarial')).toBe('pro')
  })
})

describe('limites de uso', () => {
  it('canAddAnimals respeta el limite del tier contratado', () => {
    expect(canAddAnimals(usage(9, 10))).toBe(true)
    expect(canAddAnimals(usage(10, 10))).toBe(false)
    expect(canAddAnimals(usage(8, 10), 2)).toBe(true)
    expect(canAddAnimals(usage(8, 10), 3)).toBe(false)
  })

  it('limite null = ilimitado', () => {
    expect(canAddAnimals(usage(99999, null), 500)).toBe(true)
    expect(animalsRemaining(usage(99999, null))).toBeNull()
    expect(isOverLimit(usage(99999, null))).toBe(false)
  })

  it('detecta inventario por encima de lo contratado', () => {
    expect(isOverLimit(usage(11, 10))).toBe(true)
    expect(isOverLimit(usage(10, 10))).toBe(false)
    expect(animalsRemaining(usage(11, 10))).toBe(0)
    expect(animalsRemaining(usage(4, 10))).toBe(6)
  })
})
