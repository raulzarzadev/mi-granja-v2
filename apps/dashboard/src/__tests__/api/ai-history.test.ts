/** @jest-environment node */
import { NextRequest, NextResponse } from 'next/server'
import { GET } from '@/app/api/admin/ai-history/route'
import { chatHistoryCollection } from '@/lib/ai/chat-history'
import { isAuthenticatedUserAdmin, verifyBillingAuth } from '@/lib/billing-auth'

jest.mock('@/lib/ai/chat-history', () => ({ chatHistoryCollection: jest.fn() }))
jest.mock('@/lib/firebase-admin', () => ({
  getAdminFirestore: () => ({
    doc: () => ({ get: async () => ({ data: () => ({ roles: [] }) }) }),
  }),
}))
jest.mock('@/lib/billing-auth', () => ({
  verifyBillingAuth: jest.fn(),
  isAuthError: (value: unknown) => value instanceof Response,
  isAuthenticatedUserAdmin: jest.fn(),
}))
const get = (params = 'userId=user') =>
  GET(new NextRequest(`http://localhost/api/admin/ai-history?${params}`))
const query = { limit: jest.fn(), startAfter: jest.fn(), get: jest.fn() }
const collection = { orderBy: jest.fn(), doc: jest.fn() }
beforeEach(() => {
  jest.clearAllMocks()
  jest
    .mocked(verifyBillingAuth)
    .mockResolvedValue({ uid: 'admin', email: 'admin@example.com' } as any)
  jest.mocked(isAuthenticatedUserAdmin).mockReturnValue(true)
  jest.mocked(chatHistoryCollection).mockReturnValue(collection as any)
  collection.orderBy.mockReturnValue(query)
  query.limit.mockReturnValue(query)
  query.startAfter.mockReturnValue(query)
  query.get.mockResolvedValue({ docs: [] })
})
it('requires authentication before reading history', async () => {
  jest.mocked(verifyBillingAuth).mockResolvedValue(NextResponse.json({}, { status: 401 }))
  expect((await get()).status).toBe(401)
  expect(chatHistoryCollection).not.toHaveBeenCalled()
})
it('denies ordinary users even when they request their own history', async () => {
  jest.mocked(isAuthenticatedUserAdmin).mockReturnValue(false)
  expect((await get()).status).toBe(403)
  expect(chatHistoryCollection).not.toHaveBeenCalled()
})
it.each([
  '',
  'userId=..',
  'userId=a%2Fb',
  'userId=user&cursor=..',
  'userId=user&cursor=',
])('validates document paths: %s', async (params) => {
  expect((await get(params)).status).toBe(400)
  expect(chatHistoryCollection).not.toHaveBeenCalled()
})
it('returns bounded pages and only explicitly allowed fields', async () => {
  query.get.mockResolvedValue({
    docs: Array.from({ length: 26 }, (_, id) => ({
      id: `${id}`,
      data: () => ({
        question: 'Hola',
        answer: 'Respuesta',
        status: 'completed',
        farmId: 'farm',
        farmName: 'Granja',
        conversationId: 'chat',
        createdAt: { toDate: () => new Date('2026-11-14T12:00:00Z') },
        secret: 'private',
      }),
    })),
  })
  const response = await get()
  const payload = await response.json()
  expect(payload.items).toHaveLength(25)
  expect(payload.nextCursor).toBe('24')
  expect(payload.items[0]).not.toHaveProperty('secret')
  expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  expect(collection.orderBy).toHaveBeenCalledWith('createdAt', 'desc')
  expect(query.limit).toHaveBeenCalledWith(26)
})
it('resolves cursors inside the requested user collection', async () => {
  const cursor = { exists: true }
  collection.doc.mockReturnValue({ get: async () => cursor })
  expect((await get('userId=target&cursor=page')).status).toBe(200)
  expect(chatHistoryCollection).toHaveBeenCalledWith('target')
  expect(query.startAfter).toHaveBeenCalledWith(cursor)
})
it('rejects missing cursors', async () => {
  collection.doc.mockReturnValue({ get: async () => ({ exists: false }) })
  expect((await get('userId=target&cursor=missing')).status).toBe(400)
})
