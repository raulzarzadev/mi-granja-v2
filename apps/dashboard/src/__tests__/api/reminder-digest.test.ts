jest.mock('@/lib/firebase-admin', () => ({
  getAdminFirestore: jest.fn(),
}))

jest.mock('@/lib/fcm-admin', () => ({
  sendPushToUser: jest.fn(),
}))

jest.mock('@/lib/brevo', () => ({
  sendBrevoEmail: jest.fn(),
}))

import { runReminderDigest } from '@/app/api/cron/reminders/digest/route'

const NOW = new Date('2026-06-07T16:00:00.000Z')

interface TestDbOptions {
  reminders: Record<string, unknown>[]
  users?: Record<string, Record<string, unknown> | undefined>
  prefs?: Record<string, Record<string, unknown> | undefined>
}

function makeReminder(overrides: Record<string, unknown> = {}) {
  return {
    farmerId: 'user-1',
    title: 'Vacunar lote norte',
    description: '',
    dueDate: NOW,
    completed: false,
    priority: 'medium',
    type: 'medical',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

function makeDb({ reminders, users = {}, prefs = {} }: TestDbOptions) {
  const batchUpdate = jest.fn()
  const batchCommit = jest.fn().mockResolvedValue(undefined)
  const collection = jest.fn((name: string) => {
    if (name === 'reminders') {
      const queryApi = {
        where: jest.fn(() => queryApi),
        get: jest.fn().mockResolvedValue({
          docs: reminders.map((data, index) => ({
            id: `reminder-${index + 1}`,
            data: () => data,
          })),
        }),
        doc: jest.fn((id: string) => ({ id })),
      }
      return queryApi
    }

    return {
      where: jest.fn(),
      get: jest.fn(),
      doc: jest.fn((id: string) => ({
        id,
        get: jest.fn().mockResolvedValue({
          data: () => (name === 'users' ? users[id] : prefs[id]),
        }),
      })),
    }
  })

  return {
    db: {
      collection,
      batch: jest.fn(() => ({
        update: batchUpdate,
        commit: batchCommit,
      })),
    },
    batchUpdate,
    batchCommit,
  }
}

describe('runReminderDigest', () => {
  it('sends an email for a reminder due today', async () => {
    const sendEmail = jest.fn().mockResolvedValue({ ok: true, status: 201 })
    const sendPush = jest.fn().mockResolvedValue({ success: 0, failure: 0 })
    const { db, batchUpdate } = makeDb({
      reminders: [makeReminder()],
      users: { 'user-1': { email: 'ana@example.com', farmName: 'Rancho Ana' } },
    })

    const result = await runReminderDigest({
      db: db as any,
      now: NOW,
      appUrl: 'https://dashboard.migranja.app',
      sendEmail,
      sendPush,
    })

    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendEmail.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        to: 'ana@example.com',
        tags: ['reminder-digest'],
      }),
    )
    expect(batchUpdate).toHaveBeenCalledTimes(1)
    expect(result.emailsAttempted).toBe(1)
    expect(result.emailsSent).toBe(1)
    expect(result.remindersFlagged).toBe(1)
  })

  it('does not send for upcoming-only recipients', async () => {
    const sendEmail = jest.fn()
    const sendPush = jest.fn()
    const { db } = makeDb({
      reminders: [makeReminder({ dueDate: new Date('2026-06-09T16:00:00.000Z') })],
      users: { 'user-1': { email: 'ana@example.com' } },
    })

    const result = await runReminderDigest({
      db: db as any,
      now: NOW,
      appUrl: 'https://dashboard.migranja.app',
      debug: true,
      sendEmail,
      sendPush,
    })

    expect(sendEmail).not.toHaveBeenCalled()
    expect(sendPush).not.toHaveBeenCalled()
    expect(result.skipped.upcomingOnly).toBe(1)
    expect(result.eligibleRecipients).toBe(0)
    expect(result.recipients?.[0]).toEqual(
      expect.objectContaining({
        emailSkipReason: 'upcoming_only',
      }),
    )
  })

  it('skips email when preferences disable it', async () => {
    const sendEmail = jest.fn()
    const { db } = makeDb({
      reminders: [makeReminder()],
      users: { 'user-1': { email: 'ana@example.com' } },
      prefs: { 'user-1': { emailEnabled: false } },
    })

    const result = await runReminderDigest({
      db: db as any,
      now: NOW,
      appUrl: 'https://dashboard.migranja.app',
      debug: true,
      sendEmail,
    })

    expect(sendEmail).not.toHaveBeenCalled()
    expect(result.skipped.emailDisabled).toBe(1)
    expect(result.recipients?.[0]).toEqual(
      expect.objectContaining({
        emailAction: 'skipped',
        emailSkipReason: 'email_disabled',
      }),
    )
  })

  it('counts Brevo failures without failing the whole digest', async () => {
    const sendEmail = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      errorCode: 'unauthorized',
    })
    const { db } = makeDb({
      reminders: [makeReminder()],
      users: { 'user-1': { email: 'ana@example.com' } },
    })

    const result = await runReminderDigest({
      db: db as any,
      now: NOW,
      appUrl: 'https://dashboard.migranja.app',
      debug: true,
      sendEmail,
    })

    expect(result.ok).toBe(true)
    expect(result.emailsAttempted).toBe(1)
    expect(result.emailsFailed).toBe(1)
    expect(result.recipients?.[0]).toEqual(
      expect.objectContaining({
        emailAction: 'failed',
        emailErrorCode: 'unauthorized',
        emailStatus: 401,
      }),
    )
  })

  it('dryRun reports eligible email without sending or updating reminders', async () => {
    const sendEmail = jest.fn()
    const sendPush = jest.fn()
    const { db, batchUpdate } = makeDb({
      reminders: [makeReminder()],
      users: { 'user-1': { email: 'ana@example.com' } },
      prefs: { 'user-1': { pushEnabled: true, fcmTokens: ['token-1'] } },
    })

    const result = await runReminderDigest({
      db: db as any,
      now: NOW,
      appUrl: 'https://dashboard.migranja.app',
      dryRun: true,
      debug: true,
      sendEmail,
      sendPush,
    })

    expect(sendEmail).not.toHaveBeenCalled()
    expect(sendPush).not.toHaveBeenCalled()
    expect(batchUpdate).not.toHaveBeenCalled()
    expect(result.remindersFlagged).toBe(0)
    expect(result.recipients?.[0]).toEqual(
      expect.objectContaining({
        emailAction: 'would_send',
        pushAction: 'would_send',
      }),
    )
  })
})
