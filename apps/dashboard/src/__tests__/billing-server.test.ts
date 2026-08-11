import { resolveActiveTierId } from '@/lib/billing-usage'
import { mapStripeStatus } from '@/lib/stripe'

describe('resolveActiveTierId', () => {
  it('concede el tier guardado solo para estados pagados', () => {
    expect(resolveActiveTierId({ status: 'active', tierId: 'pro' })).toBe('pro')
    expect(resolveActiveTierId({ status: 'trialing', tierId: 'inicial' })).toBe('inicial')
    expect(resolveActiveTierId({ status: 'past_due', tierId: 'rancho' })).toBe('rancho')
  })

  it('revierte a free cuando no hay acceso pagado', () => {
    expect(resolveActiveTierId(null)).toBe('free')
    expect(resolveActiveTierId({ status: 'canceled', tierId: 'pro' })).toBe('free')
    expect(resolveActiveTierId({ status: 'incomplete', tierId: 'pro' })).toBe('free')
  })
})

describe('mapStripeStatus', () => {
  it.each([
    ['active', 'active'],
    ['trialing', 'trialing'],
    ['past_due', 'past_due'],
    ['unpaid', 'past_due'],
    ['canceled', 'canceled'],
    ['paused', 'canceled'],
    ['incomplete', 'incomplete'],
    ['incomplete_expired', 'incomplete'],
  ] as const)('%s -> %s', (stripeStatus, expected) => {
    expect(mapStripeStatus(stripeStatus)).toBe(expected)
  })
})
