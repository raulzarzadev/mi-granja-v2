/** @jest-environment node */
import { NextRequest } from 'next/server'
import { POST as confirmAction } from '@/app/api/ai/confirm-action/route'
import { POST as verifyCode } from '@/app/api/auth/verify-code/route'
import { POST as sendEmail } from '@/app/api/send/route'
import { listConversationProposals } from '@/lib/ai/proposals'
import { requireAiAuth, resolveFarmPermissions } from '@/lib/ai/server'
import { verifyBillingAuth } from '@/lib/billing-auth'
import { sendBrevoEmail } from '@/lib/brevo'
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin'
import { consumeRequestLimit } from '@/lib/request-limits'

jest.mock('@/lib/firebase-admin', () => ({ getAdminAuth: jest.fn(), getAdminFirestore: jest.fn() }))
jest.mock('@/lib/billing-auth', () => ({
  verifyBillingAuth: jest.fn(),
  isAuthError: () => false,
  isAuthenticatedUserAdmin: (_email: string, roles: string[]) => roles?.includes('admin'),
}))
jest.mock('@/lib/ai/proposals', () => ({
  AiProposalError: class extends Error {},
  confirmAiProposal: jest.fn(),
  getAiProposal: jest.fn(),
  reviseAiProposal: jest.fn(),
  cancelAiProposal: jest.fn(),
  listConversationProposals: jest.fn(),
}))
jest.mock('@/lib/brevo', () => ({ sendBrevoEmail: jest.fn() }))
jest.mock('@/lib/ai/server', () => ({
  requireAiAuth: jest.fn(),
  resolveFarmPermissions: jest.fn(),
  forbidden: () => new Response('{}', { status: 403 }),
  hasPermission: (permissions: any[], module: string, action: string) =>
    permissions.some((p) => p.module === module && p.actions.includes(action)),
}))

// Serial transactions model the atomic contract; route tests deliberately launch overlapping requests.
function database(initial: Record<string, any> = {}) {
  const records = new Map(Object.entries(initial))
  const snapshot = (path: string) => ({
    exists: records.has(path),
    data: () => (records.has(path) ? { ...records.get(path) } : undefined),
  })
  const doc = (path: string): any => ({
    path,
    get: async () => snapshot(path),
    set: async (data: any, options?: any) => {
      records.set(path, options?.merge ? { ...records.get(path), ...data } : data)
    },
  })
  let queue = Promise.resolve()
  const db = {
    doc,
    collection: (name: string) => ({ doc: (id: string) => doc(`${name}/${id}`) }),
    runTransaction: (callback: any) => {
      const result = queue.then(() =>
        callback({
          get: async (ref: any) => snapshot(ref.path),
          set: (ref: any, data: any) => records.set(ref.path, data),
          update: (ref: any, data: any) =>
            records.set(ref.path, { ...records.get(ref.path), ...data }),
          delete: (ref: any) => records.delete(ref.path),
        }),
      )
      queue = result.then(
        () => undefined,
        () => undefined,
      )
      return result
    },
  }
  jest.mocked(getAdminFirestore).mockReturnValue(db as any)
  return { db, records }
}
const request = (body: object) =>
  new NextRequest('http://localhost/api/test', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
const auth = { uid: 'user-1', email: 'user@example.com' }
const action = {
  type: 'create_animal',
  summary: 'Crear animal',
  payload: { animalNumber: '001', type: 'vaca', stage: 'reproductor', gender: 'hembra' },
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(verifyBillingAuth).mockResolvedValue(auth)
  jest.mocked(requireAiAuth).mockResolvedValue(auth)
  jest.mocked(resolveFarmPermissions).mockResolvedValue({
    farmName: 'Rancho',
    permissions: [{ module: 'animals', actions: ['create'] }],
  })
})

it('a valid login code produces only one token under concurrent requests', async () => {
  database({
    'authCodes/user@example.com': { code: '123456', attempts: 0, expiresAt: Date.now() + 60000 },
  })
  const createCustomToken = jest.fn().mockResolvedValue('token')
  jest
    .mocked(getAdminAuth)
    .mockReturnValue({ getUserByEmail: async () => ({ uid: auth.uid }), createCustomToken } as any)
  const responses = await Promise.all(
    Array.from({ length: 8 }, () => verifyCode(request({ email: auth.email, code: '123456' }))),
  )
  expect(responses.filter((r) => r.status === 200)).toHaveLength(1)
  expect(createCustomToken).toHaveBeenCalledTimes(1)
})

it('parallel wrong guesses cannot lose attempt increments or accept a code after exhaustion', async () => {
  const { records } = database({
    'authCodes/user@example.com': { code: '123456', attempts: 0, expiresAt: Date.now() + 60000 },
  })
  await Promise.all(
    Array.from({ length: 8 }, () => verifyCode(request({ email: auth.email, code: '000000' }))),
  )
  expect(records.get('authCodes/user@example.com').attempts).toBe(5)
  expect((await verifyCode(request({ email: auth.email, code: '123456' }))).status).toBe(400)
  expect(getAdminAuth).not.toHaveBeenCalled()
})

it('rate limits are shared across concurrent requests and survive code consumption', async () => {
  const { db, records } = database()
  const options = { maximum: 5, windowMs: 3600000, intervalMs: 60000 }
  const now = Date.now()
  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      consumeRequestLimit(db as any, 'auth-code:email', options, now),
    ),
  )
  expect(results.filter((value) => value === 0)).toHaveLength(1)
  records.delete('authCodes/email')
  expect(
    await consumeRequestLimit(db as any, 'auth-code:email', options, now + 1000),
  ).toBeGreaterThan(0)
  for (let i = 1; i < 5; i++)
    expect(await consumeRequestLimit(db as any, 'auth-code:email', options, now + i * 60000)).toBe(
      0,
    )
  expect(
    await consumeRequestLimit(db as any, 'auth-code:email', options, now + 5 * 60000),
  ).toBeGreaterThan(0)
  expect(await consumeRequestLimit(db as any, 'auth-code:email', options, now + 3600000)).toBe(0)
})

it('rejects legacy action payloads instead of executing the retired executor', async () => {
  const response = await confirmAction(request({ farmId: 'farm-1', actionId: 'action-1', action }))
  expect(response.status).toBe(410)
})

it('does not accept an action substituted into a proposal confirmation', async () => {
  const response = await confirmAction(
    request({
      farmId: 'farm-1',
      proposalId: 'proposal-1',
      revision: 1,
      operation: 'confirm',
      action,
    }),
  )
  expect(response.status).toBe(400)
})

it('rejects arbitrary email from a normal account before contacting Brevo', async () => {
  database({ 'users/user-1': { roles: [] } })
  expect(
    (await sendEmail(request({ to: 'victim@example.com', subject: 'Spam', html: 'Spam' }))).status,
  ).toBe(403)
  expect(sendBrevoEmail).not.toHaveBeenCalled()
  expect(fetch).not.toHaveBeenCalled()
})

it('rejects recipient/content injection into a transactional request', async () => {
  database()
  const response = await sendEmail(
    request({
      purpose: 'pro-request',
      granjas: 1,
      colaboradores: 2,
      to: 'victim@example.com',
      html: 'Spam',
    }),
  )
  expect(response.status).toBe(400)
  expect(sendBrevoEmail).not.toHaveBeenCalled()
})

it('sends Pro requests only to the configured owner and authenticated user', async () => {
  database()
  jest.mocked(sendBrevoEmail).mockResolvedValue({ ok: true })
  expect(
    (await sendEmail(request({ purpose: 'pro-request', granjas: 1, colaboradores: 2 }))).status,
  ).toBe(200)
  expect(jest.mocked(sendBrevoEmail).mock.calls.map(([mail]) => mail.to)).toEqual([
    'raulzarza.dev@gmail.com',
    auth.email,
  ])
})

it('rejects sending invitations for an inaccessible farm', async () => {
  database({ 'farmInvitations/inv-1': { farmId: 'other-farm', status: 'pending' } })
  jest.mocked(resolveFarmPermissions).mockResolvedValue(null)
  expect((await sendEmail(request({ purpose: 'invitation', invitationId: 'inv-1' }))).status).toBe(
    403,
  )
  expect(sendBrevoEmail).not.toHaveBeenCalled()
})

it('sends an authorized invitation only to its stored recipient', async () => {
  database({
    'farmInvitations/inv-1': {
      farmId: 'farm-1',
      status: 'pending',
      email: 'guest@example.com',
      token: 'invitation-token',
      role: 'viewer',
      expiresAt: { toMillis: () => Date.now() + 60000 },
    },
  })
  jest.mocked(resolveFarmPermissions).mockResolvedValue({
    farmName: '<script>bad</script>',
    permissions: [{ module: 'invitations', actions: ['create'] }],
  })
  jest.mocked(sendBrevoEmail).mockResolvedValue({ ok: true })
  expect((await sendEmail(request({ purpose: 'invitation', invitationId: 'inv-1' }))).status).toBe(
    200,
  )
  expect(sendBrevoEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'guest@example.com' }))
  const html = jest.mocked(sendBrevoEmail).mock.calls[0][0].html
  expect(html).toContain('invitation-token')
  expect(html).not.toContain('<script>bad</script>')
})

it('rejects expired invitations even for a farm administrator', async () => {
  database({
    'farmInvitations/inv-1': {
      farmId: 'farm-1',
      status: 'pending',
      email: 'guest@example.com',
      token: 'token',
      expiresAt: { toMillis: () => Date.now() - 1000 },
    },
  })
  jest.mocked(resolveFarmPermissions).mockResolvedValue({
    farmName: 'Rancho',
    permissions: [{ module: 'collaborators', actions: ['create'] }],
  })
  expect((await sendEmail(request({ purpose: 'invitation', invitationId: 'inv-1' }))).status).toBe(
    409,
  )
  expect(sendBrevoEmail).not.toHaveBeenCalled()
})

it('recupera propuestas solo con identidad verificada y acceso a la granja', async () => {
  jest.mocked(requireAiAuth).mockResolvedValue({ uid: 'verified-user', email: 'user@example.com' })
  jest.mocked(resolveFarmPermissions).mockResolvedValue({
    farmName: 'Granja',
    permissions: [{ module: 'animals', actions: ['read', 'create'] }],
  })
  jest.mocked(listConversationProposals).mockResolvedValue([])
  const request = () =>
    new NextRequest('http://localhost/api/ai/confirm-action', {
      method: 'POST',
      body: JSON.stringify({
        operation: 'list',
        farmId: 'farm',
        conversationId: 'chat',
        userId: 'attacker',
      }),
    })
  expect((await confirmAction(request())).status).toBe(200)
  expect(listConversationProposals).toHaveBeenCalledWith(
    expect.objectContaining({ userId: 'verified-user', farmId: 'farm', conversationId: 'chat' }),
  )
  jest.mocked(listConversationProposals).mockClear()
  jest.mocked(resolveFarmPermissions).mockResolvedValue(null)
  expect((await confirmAction(request())).status).toBe(403)
  expect(listConversationProposals).not.toHaveBeenCalled()
})
