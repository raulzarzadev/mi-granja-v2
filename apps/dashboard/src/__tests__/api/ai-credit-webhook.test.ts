/** @jest-environment node */
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/billing/webhook/route'
import { grantPaidAiCredits } from '@/lib/ai/credits'
import { getStripe } from '@/lib/stripe'

jest.mock('@/lib/ai/credits', () => ({ grantPaidAiCredits: jest.fn() }))
jest.mock('@/lib/ai/billing-policy', () => ({
  getAiBillingPolicy: async () => ({ paidTierId: 'pro' }),
}))
jest.mock('@/lib/billing-config', () => ({ getBillingTiers: async () => [] }))
jest.mock('@/lib/analytics/posthog-server', () => ({ captureServerEvent: jest.fn() }))
jest.mock('@/lib/firebase-admin', () => ({
  getAdminFirestore: () => ({
    doc: () => ({ get: async () => ({ data: () => undefined }), set: async () => undefined }),
  }),
}))
jest.mock('@/lib/stripe', () => ({
  getStripe: jest.fn(),
  mapStripeStatus: (value: string) => value,
  getTierByStripePriceId: (id: string) => (id === 'price_pro' ? { id: 'pro' } : { id: 'free' }),
}))
const subscription = {
  id: 'sub',
  metadata: { userId: 'user' },
  status: 'active',
  items: {
    data: [
      {
        price: { id: 'price_pro', recurring: { interval: 'month', interval_count: 1 } },
        current_period_end: 1800000000,
      },
    ],
  },
  customer: 'customer',
  cancel_at_period_end: false,
}
const invoice = {
  id: 'invoice',
  parent: { subscription_details: { subscription: 'sub' } },
  status: 'paid',
  amount_paid: 2000,
  billing_reason: 'subscription_cycle',
  lines: {
    data: [
      {
        amount: 2000,
        pricing: { price_details: { price: 'price_pro' } },
        period: { start: 1793577600, end: 1796169600 },
      },
    ],
  },
}
async function call(type: string, object: any) {
  process.env.STRIPE_WEBHOOK_SECRET = 'test-secret'
  jest.mocked(getStripe).mockReturnValue({
    webhooks: { constructEvent: () => ({ id: 'event', type, data: { object } }) },
    subscriptions: { retrieve: async () => subscription },
  } as any)
  return POST(
    new NextRequest('http://localhost/api/billing/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'test' },
      body: '{}',
    }),
  )
}
beforeEach(() => jest.clearAllMocks())
it('solo abona después de la factura mensual pagada del plan configurado', async () => {
  expect((await call('invoice.paid', invoice)).status).toBe(200)
  expect(grantPaidAiCredits).toHaveBeenCalledWith({
    userId: 'user',
    tierId: 'pro',
    subscriptionId: 'sub',
    invoiceId: 'invoice',
    periodStart: 1793577600,
    periodEnd: 1796169600,
  })
})
it.each([
  { ...invoice, amount_paid: 0 },
  { ...invoice, status: 'open' },
  { ...invoice, billing_reason: 'subscription_update' },
])('no abona facturas gratuitas, no pagadas o prorrateos', async (object) => {
  expect((await call('invoice.paid', object)).status).toBe(200)
  expect(grantPaidAiCredits).not.toHaveBeenCalled()
})
it('no abona al activar la suscripción sin acreditar su pago', async () => {
  expect((await call('customer.subscription.created', subscription)).status).toBe(200)
  expect(grantPaidAiCredits).not.toHaveBeenCalled()
})
