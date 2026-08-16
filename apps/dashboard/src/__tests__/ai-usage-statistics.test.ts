import {
  buildAiUsageStatistics,
  createAiUsageDateKeys,
  normalizeAiUsageRecord,
} from '@/lib/ai/usage-statistics'

describe('AI usage statistics', () => {
  it('creates an inclusive sequence of date keys', () => {
    expect(createAiUsageDateKeys('2026-08-16', 3)).toEqual([
      '2026-08-14',
      '2026-08-15',
      '2026-08-16',
    ])
  })

  it('aggregates totals, daily activity, providers and users', () => {
    const records = [
      normalizeAiUsageRecord({
        userId: 'user-1',
        dateKey: '2026-08-15',
        count: 2,
        totalTokens: 120,
        totalCost: 0.02,
        providerCounts: { openai: 2 },
        modelCounts: { 'openai:gpt-5.6-luna': 2 },
      }),
      normalizeAiUsageRecord({
        userId: 'user-2',
        dateKey: '2026-08-16',
        count: 3,
        totalTokens: 240,
      }),
    ].filter((record) => record !== null)

    const statistics = buildAiUsageStatistics({
      records,
      profiles: [
        { id: 'user-1', name: 'Ana', email: 'ana@example.com' },
        { id: 'user-2', email: 'luis@example.com' },
      ],
      dateKeys: createAiUsageDateKeys('2026-08-16', 3),
    })

    expect(statistics.totals).toEqual({
      queries: 5,
      activeUsers: 2,
      totalTokens: 360,
      reportedCost: 0.02,
      queriesPerUser: 2.5,
    })
    expect(statistics.daily.map(({ date, queries, users }) => ({ date, queries, users }))).toEqual([
      { date: '2026-08-14', queries: 0, users: 0 },
      { date: '2026-08-15', queries: 2, users: 1 },
      { date: '2026-08-16', queries: 3, users: 1 },
    ])
    expect(statistics.providers).toEqual([
      { name: 'No registrado', queries: 3 },
      { name: 'openai', queries: 2 },
    ])
    expect(statistics.models).toEqual([
      { name: 'No registrado', queries: 3 },
      { name: 'openai:gpt-5.6-luna', queries: 2 },
    ])
    expect(statistics.users[0]).toMatchObject({
      userId: 'user-2',
      name: 'luis@example.com',
      queries: 3,
    })
  })

  it('ignores malformed and out-of-period records', () => {
    expect(normalizeAiUsageRecord({ count: 1 })).toBeNull()
    const record = normalizeAiUsageRecord({
      userId: 'user-1',
      dateKey: '2026-07-01',
      count: 5,
    })
    const statistics = buildAiUsageStatistics({
      records: record ? [record] : [],
      profiles: [],
      dateKeys: ['2026-08-16'],
    })
    expect(statistics.totals.queries).toBe(0)
  })
})
