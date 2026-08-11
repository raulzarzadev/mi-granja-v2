import { mergeBillingTiers, validateBillingTiers } from '@/lib/billing-config'
import { PLAN_TIERS } from '@/types/billing'

describe('billing config', () => {
  it('usa los planes por defecto cuando no hay configuracion', () => {
    const tiers = mergeBillingTiers(undefined)
    expect(tiers.map((tier) => tier.id)).toEqual(PLAN_TIERS.map((tier) => tier.id))
    expect(tiers[2].maxAnimals).toBe(100)
    expect(tiers.every((tier) => tier.isVisible)).toBe(true)
  })

  it('conserva la visibilidad configurada de cada plan', () => {
    const input = PLAN_TIERS.map((tier) => ({ ...tier, isVisible: tier.id === 'pro' }))

    const merged = mergeBillingTiers(input)
    const validated = validateBillingTiers(input)

    expect(merged.find((tier) => tier.id === 'pro')?.isVisible).toBe(true)
    expect(merged.find((tier) => tier.id === 'basico')?.isVisible).toBe(false)
    expect(validated.tiers?.find((tier) => tier.id === 'pro')?.isVisible).toBe(true)
    expect(validated.tiers?.find((tier) => tier.id === 'basico')?.isVisible).toBe(false)
  })

  it('recalcula rangos consecutivos al cambiar limites', () => {
    const input = PLAN_TIERS.map((tier) => ({ ...tier }))
    input[0].maxAnimals = 20
    input[1].maxAnimals = 75

    const result = validateBillingTiers(input)
    expect(result.error).toBeUndefined()
    expect(result.tiers?.[1].minAnimals).toBe(21)
    expect(result.tiers?.[2].minAnimals).toBe(76)
  })

  it('rechaza limites que se regresan sobre el inicio del rango', () => {
    const input = PLAN_TIERS.map((tier) => ({ ...tier }))
    input[0].maxAnimals = 50
    input[1].maxAnimals = 20

    const result = validateBillingTiers(input)
    expect(result.error).toMatch(/limite/i)
  })

  it('rechaza Price IDs invalidos', () => {
    const input = PLAN_TIERS.map((tier) => ({ ...tier }))
    input[1].stripePriceId = 'invalid-id'

    const result = validateBillingTiers(input)
    expect(result.error).toMatch(/price_/i)
  })
})
