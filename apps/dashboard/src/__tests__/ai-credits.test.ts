/** @jest-environment node */
import { actualProviderCostUsd, grantPaidAiCredits } from '@/lib/ai/credits'
import { consumeDailyAiUse, getDailyAiUsage, reserveAiUse } from '@/lib/ai/server'
import { getAdminFirestore } from '@/lib/firebase-admin'

jest.mock('@/lib/firebase-admin', () => ({ getAdminFirestore: jest.fn() }))
jest.mock('@/lib/billing-auth', () => ({ verifyBillingAuth: jest.fn(), isAuthError: jest.fn() }))
jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { increment: (value: number) => ({ increment: value }) },
  Timestamp: { now: () => 'now' },
}))
let data: Map<string, any>
function database() {
  data = new Map()
  const doc = (path: string): any => ({
    path,
    get: async () => snapshot(path),
    collection: (name: string) => ({ doc: (id: string) => doc(`${path}/${name}/${id}`) }),
  })
  const snapshot = (path: string) => ({ exists: data.has(path), data: () => data.get(path) })
  const set = (path: string, value: any, merge = false) => {
    const next = merge ? { ...data.get(path) } : {}
    for (const [key, field] of Object.entries(value))
      next[key] =
        field && typeof field === 'object' && 'increment' in field
          ? (Number(next[key]) || 0) + (field as any).increment
          : field
    data.set(path, next)
  }
  let queue = Promise.resolve()
  const db = {
    doc,
    runTransaction: (fn: any) => {
      const result = queue.then(async () => {
        const writes: Array<() => void> = []
        const value = await fn({
          get: (ref: any) => ref.get(),
          set: (ref: any, value: any, options: any) =>
            writes.push(() => set(ref.path, value, options?.merge)),
          update: (ref: any, value: any) => writes.push(() => set(ref.path, value, true)),
        })
        writes.forEach((write) => {
          write()
        })
        return value
      })
      queue = result.catch(() => undefined)
      return result
    },
  }
  jest.mocked(getAdminFirestore).mockReturnValue(db as never)
}
beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-11-02T18:00:00Z'))
  database()
})
afterEach(() => jest.useRealTimers())
const payment = {
  userId: 'u',
  tierId: 'pro',
  subscriptionId: 'sub',
  invoiceId: 'inv',
  periodStart: 1793577600,
  periodEnd: 1796169600,
}
const activate = async () => {
  data.set('subscriptions/u', { tierId: 'pro', status: 'active', stripeSubscriptionId: 'sub' })
  await grantPaidAiCredits(payment)
}
it('no regala por plan asignado sin factura y reserva solo tres consultas gratis concurrentes', async () => {
  data.set('subscriptions/u', { tierId: 'pro', status: 'trialing' })
  expect((await getDailyAiUsage('u')).mode).toBe('daily')
  const attempts = await Promise.allSettled(Array.from({ length: 5 }, () => reserveAiUse('u')))
  expect(attempts.filter((value) => value.status === 'fulfilled')).toHaveLength(3)
  expect(attempts.filter((value) => value.status === 'rejected')).toHaveLength(2)
})
it('el pago abona una vez por ciclo y descuenta créditos cinco a uno sin duplicar consumos', async () => {
  await activate()
  expect((await getDailyAiUsage('u')).creditBalanceUsd).toBe(5)
  const id = await reserveAiUse('u')
  await expect(reserveAiUse('u')).rejects.toThrow('en curso')
  const usage = await consumeDailyAiUse('u', { cost: 0.2, total_tokens: 100 }, undefined, id)
  expect(usage.creditBalanceUsd).toBeCloseTo(4)
  await consumeDailyAiUse('u', { cost: 0.2, total_tokens: 100 }, undefined, id)
  await grantPaidAiCredits({ ...payment, invoiceId: 'same-cycle-other-invoice' })
  expect((await getDailyAiUsage('u')).creditBalanceUsd).toBeCloseTo(4)
})
it('bloquea nuevas consultas al agotar el presupuesto y no vuelve a regalar por un webhook repetido', async () => {
  await activate()
  const id = await reserveAiUse('u')
  await consumeDailyAiUse('u', { cost: 1, total_tokens: 100 }, undefined, id)
  await expect(reserveAiUse('u')).rejects.toThrow('agotaron')
  await grantPaidAiCredits(payment)
  expect((await getDailyAiUsage('u')).creditBalanceUsd).toBe(0)
})
it('no trata un costo BYOK no informado como gratis', async () => {
  expect(
    actualProviderCostUsd({
      is_byok: true,
      cost: 0,
      cost_details: { upstream_inference_cost: 0.1 },
    }),
  ).toBeCloseTo(0.1)
  expect(actualProviderCostUsd({ is_byok: true, cost: 0 })).toBeUndefined()
  await activate()
  const id = await reserveAiUse('u')
  await consumeDailyAiUse('u', { is_byok: true, cost: 0 }, undefined, id)
  await expect(reserveAiUse('u')).rejects.toThrow('no están disponibles')
})
it('usa la política editable de admin en lugar de fijar importes en código', async () => {
  data.set('settings/aiBilling', {
    policy: { freeDailyQueries: 2, paidTierId: 'pro', monthlyCreditUsd: 10, monthlyInternalUsd: 2 },
  })
  await activate()
  expect((await getDailyAiUsage('u')).creditBalanceUsd).toBe(10)
  const id = await reserveAiUse('u')
  await consumeDailyAiUse('u', { cost: 0.5 }, undefined, id)
  expect((await getDailyAiUsage('u')).creditBalanceUsd).toBeCloseTo(7.5)
})

it('renueva con el nuevo ciclo pagado y un webhook antiguo no reinicia el saldo', async () => {
  await activate()
  const first = await reserveAiUse('u')
  await consumeDailyAiUse('u', { cost: 0.8 }, undefined, first)
  jest.setSystemTime(new Date('2026-12-02T18:00:00Z'))
  await grantPaidAiCredits({
    ...payment,
    invoiceId: 'december',
    periodStart: 1796169600,
    periodEnd: 1798848000,
  })
  expect((await getDailyAiUsage('u')).creditBalanceUsd).toBe(5)
  const second = await reserveAiUse('u')
  await consumeDailyAiUse('u', { cost: 0.1 }, undefined, second)
  await grantPaidAiCredits(payment)
  expect((await getDailyAiUsage('u')).creditBalanceUsd).toBeCloseTo(4.5)
})

it.each([
  ['rancho', 20, 4],
  ['empresarial', 100, 20],
])('multiplica el regalo de %s sin cambiar la proporción de consumo', async (tierId, creditUsd, internalUsd) => {
  data.set('subscriptions/u', { tierId, status: 'active', stripeSubscriptionId: 'sub' })
  await grantPaidAiCredits({ ...payment, tierId: String(tierId) })
  expect((await getDailyAiUsage('u')).creditBalanceUsd).toBe(creditUsd)
  expect(data.get('aiCreditWallets/u').internalAllowanceUsd).toBe(internalUsd)
})

it('informa el próximo reinicio diario a medianoche de Mazatlán', async () => {
  const usage = await getDailyAiUsage('u')
  expect(usage.mode).toBe('daily')
  expect(usage.resetsAt).toBe('2026-11-03T07:00:00.000Z')
})

it('informa fin del ciclo acreditado y distingue renovación cancelada', async () => {
  await activate()
  data.set('subscriptions/u', { ...data.get('subscriptions/u'), cancelAtPeriodEnd: true })
  const usage = await getDailyAiUsage('u')
  expect(usage.resetsAt).toBe(new Date(payment.periodEnd * 1000).toISOString())
  expect(usage.renewalCancelled).toBe(true)
})
