/** @jest-environment node */
import { NextRequest, NextResponse } from 'next/server'
import { GET } from '@/app/api/billing/ai-usage/route'
import { getDailyAiUsage } from '@/lib/ai/server'
import { verifyBillingAuth } from '@/lib/billing-auth'

jest.mock('@/lib/ai/server', () => ({ getDailyAiUsage: jest.fn() }))
jest.mock('@/lib/billing-auth', () => ({
  verifyBillingAuth: jest.fn(),
  isAuthError: (value: unknown) => value instanceof NextResponse,
  resolveEffectiveUid: (auth: { uid: string }) => auth.uid,
}))
beforeEach(() => jest.clearAllMocks())
it('expone consumo y saldo visibles sin revelar costos internos', async () => {
  jest.mocked(verifyBillingAuth).mockResolvedValue({ uid: 'user', email: 'user@example.com' })
  jest.mocked(getDailyAiUsage).mockResolvedValue({
    mode: 'credits',
    limit: 5,
    used: 1.25,
    remaining: 3.75,
    creditBalanceUsd: 3.75,
    resetsAt: '2026-12-13T01:21:12.000Z',
    renewalCancelled: false,
    totalCost: 0.25,
    totalTokens: 500,
    allowed: true,
  })
  const response = await GET(new NextRequest('http://localhost/api/billing/ai-usage'))
  expect(await response.json()).toEqual({
    mode: 'credits',
    limit: 5,
    used: 1.25,
    remaining: 3.75,
    balanceUsd: 3.75,
    resetsAt: '2026-12-13T01:21:12.000Z',
    renewalCancelled: false,
  })
  expect(response.headers.get('cache-control')).toContain('no-store')
  expect(getDailyAiUsage).toHaveBeenCalledWith('user')
})
it('rechaza consultas sin sesión', async () => {
  jest
    .mocked(verifyBillingAuth)
    .mockResolvedValue(NextResponse.json({ error: 'No autenticado' }, { status: 401 }))
  const response = await GET(new NextRequest('http://localhost/api/billing/ai-usage'))
  expect(response.status).toBe(401)
  expect(getDailyAiUsage).not.toHaveBeenCalled()
})
