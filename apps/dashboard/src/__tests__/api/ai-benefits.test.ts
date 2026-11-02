/** @jest-environment node */
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/billing/ai-benefits/route'
import { getAiBillingPolicy } from '@/lib/ai/billing-policy'

jest.mock('@/lib/billing-auth', () => ({
  verifyBillingAuth: async () => ({ uid: 'user' }),
  isAuthError: () => false,
}))
jest.mock('@/lib/ai/billing-policy', () => ({ getAiBillingPolicy: jest.fn() }))
it('expone los límites visibles y excluye el presupuesto interno', async () => {
  jest.mocked(getAiBillingPolicy).mockResolvedValue({
    freeDailyQueries: 3,
    paidTierId: 'pro',
    monthlyCreditUsd: 5,
    monthlyInternalUsd: 1,
  })
  const response = await GET(new NextRequest('http://localhost/api/billing/ai-benefits'))
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({
    freeDailyQueries: 3,
    paidTierId: 'pro',
    monthlyCreditUsd: 5,
    ranchoMultiplier: 4,
    empresarialMultiplier: 20,
  })
})
