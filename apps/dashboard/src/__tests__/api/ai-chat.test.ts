/** @jest-environment node */
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/ai/chat/route'
import { runOperationalChat } from '@/lib/ai/chat-service'
import {
  consumeDailyAiUse,
  getDailyAiUsage,
  requireAiAuth,
  resolveFarmPermissions,
} from '@/lib/ai/server'

jest.mock('@/lib/ai/chat-service', () => ({ runOperationalChat: jest.fn() }))
jest.mock('@/lib/analytics/posthog-server', () => ({ captureServerEvent: jest.fn() }))
jest.mock('@/lib/ai/server', () => ({
  requireAiAuth: jest.fn(),
  resolveFarmPermissions: jest.fn(),
  getDailyAiUsage: jest.fn(),
  consumeDailyAiUse: jest.fn(),
  totalAiTokens: () => 0,
  hasPermission: (permissions: any[], module: string, action: string) =>
    permissions.some((p) => p.module === module && p.actions.includes(action)),
  forbidden: () => new Response('{}', { status: 403 }),
}))
const request = (body: unknown) =>
  new NextRequest('http://localhost/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(requireAiAuth).mockResolvedValue({ uid: 'user', email: 'user@example.com' })
  jest.mocked(resolveFarmPermissions).mockResolvedValue({
    farmName: 'Granja',
    timeZone: 'America/Mazatlan',
    permissions: [{ module: 'animals', actions: ['read', 'create'] }],
  })
  jest.mocked(getDailyAiUsage).mockResolvedValue({ used: 0, remaining: 3, limit: 3 })
  jest
    .mocked(consumeDailyAiUse)
    .mockResolvedValue({ used: 1, remaining: 2, limit: 3, allowed: true })
  jest.mocked(runOperationalChat).mockResolvedValue({
    parsed: { kind: 'message', message: 'Consulta' },
    provider: 'openai',
    model: 'test',
    usage: { total_tokens: 10 },
    knowledge: { generatedAt: 'now', timeZone: 'America/Mazatlan' },
  } as any)
})
it.each([
  null,
  [],
  {},
  { farmId: '../bad', message: 'Hola', conversationId: 'chat' },
  { farmId: 'farm', message: 'Hola' },
])('rejects malformed or unscoped input without reading farm data: %p', async (body) => {
  expect((await POST(request(body))).status).toBe(400)
  expect(runOperationalChat).not.toHaveBeenCalled()
})
it('rejects unauthorized farms before model access', async () => {
  jest.mocked(resolveFarmPermissions).mockResolvedValue(null)
  expect(
    (await POST(request({ farmId: 'farm', message: 'Hola', conversationId: 'chat' }))).status,
  ).toBe(403)
  expect(runOperationalChat).not.toHaveBeenCalled()
})
it('returns the persisted proposal without exposing an executable raw action', async () => {
  jest.mocked(runOperationalChat).mockResolvedValue({
    parsed: { kind: 'proposed_action', message: 'Revisa', action: { secret: 'raw' } },
    proposal: { id: 'proposal', revision: 1 },
    provider: 'openai',
    model: 'test',
    usage: { total_tokens: 10 },
    knowledge: { generatedAt: 'now', timeZone: 'America/Mazatlan' },
  } as any)
  const response = await POST(
    request({
      farmId: 'farm',
      message: 'Registrar',
      conversationId: 'chat',
      timeZone: 'Europe/Madrid',
      history: [{ role: 'assistant', text: 'Listo', proposalId: 'p' }],
    }),
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({
    kind: 'proposed_action',
    proposal: { id: 'proposal' },
  })
  expect(runOperationalChat).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: 'user',
      farmId: 'farm',
      conversationId: 'chat',
      timeZone: 'America/Mazatlan',
      history: [{ role: 'assistant', text: 'Listo', proposalId: 'p' }],
    }),
  )
})
it('does not expose provider or database errors', async () => {
  jest.mocked(runOperationalChat).mockRejectedValue(new Error('private provider credentials'))
  const log = jest.spyOn(console, 'error').mockImplementation(() => {})
  const response = await POST(request({ farmId: 'farm', message: 'Hola', conversationId: 'chat' }))
  expect(response.status).toBe(500)
  expect(JSON.stringify(await response.json())).not.toContain('private')
  log.mockRestore()
})
