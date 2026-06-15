import { computeUsageMetrics } from '../lib/usageMetrics'

const NOW = new Date('2026-06-15T12:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000)

describe('computeUsageMetrics', () => {
  it('returns zeros for empty input', () => {
    const m = computeUsageMetrics({}, NOW)
    expect(m.totalUsers).toBe(0)
    expect(m.activity).toEqual({ active7: 0, active30: 0, dormant: 0, never: 0 })
    expect(m.depth.avgAnimals).toBe(0)
    expect(m.rows).toEqual([])
    expect(m.growth.monthly).toHaveLength(6)
  })

  it('buckets activity by most recent write across collections', () => {
    const users = [
      { id: 'u1', email: 'a@x.com', createdAt: daysAgo(100) },
      { id: 'u2', email: 'b@x.com', createdAt: daysAgo(100) },
      { id: 'u3', email: 'c@x.com', createdAt: daysAgo(100) },
      { id: 'u4', email: 'd@x.com', createdAt: daysAgo(100) }, // sin actividad
    ]
    const animals = [
      { farmerId: 'u1', createdAt: daysAgo(2) }, // activo 7
      { farmerId: 'u2', createdAt: daysAgo(20) }, // activo 30
      { farmerId: 'u3', createdAt: daysAgo(60) }, // dormido
    ]
    const m = computeUsageMetrics({ users, animals }, NOW)
    expect(m.activity.active7).toBe(1)
    expect(m.activity.active30).toBe(2) // incluye activos 7
    expect(m.activity.dormant).toBe(1)
    expect(m.activity.never).toBe(1)
  })

  it('uses the latest of updatedAt/createdAt and across collections', () => {
    const users = [{ id: 'u1', email: 'a@x.com', createdAt: daysAgo(100) }]
    const m = computeUsageMetrics(
      {
        users,
        animals: [{ farmerId: 'u1', createdAt: daysAgo(40), updatedAt: daysAgo(40) }],
        sales: [{ farmerId: 'u1', createdAt: daysAgo(3) }], // más reciente
      },
      NOW,
    )
    expect(m.rows[0].daysSinceActivity).toBe(3)
    expect(m.activity.active7).toBe(1)
  })

  it('computes depth and adoption', () => {
    const users = [
      { id: 'u1', email: 'a@x.com', createdAt: daysAgo(10) },
      { id: 'u2', email: 'b@x.com', createdAt: daysAgo(10) },
    ]
    const animals = [
      ...Array.from({ length: 20 }, () => ({ farmerId: 'u1', createdAt: daysAgo(1) })),
      { farmerId: 'u2', createdAt: daysAgo(1) },
    ]
    const m = computeUsageMetrics(
      {
        users,
        animals,
        breedings: [{ farmerId: 'u1', createdAt: daysAgo(1) }],
        farms: [{ ownerId: 'u1', collaborators: [{ id: 'c1' }], createdAt: daysAgo(1) }],
      },
      NOW,
    )
    expect(m.depth.maxAnimals).toBe(20)
    expect(m.depth.powerUsers).toBe(1) // u1 con 20
    expect(m.depth.withAnimals).toBe(2)
    expect(m.depth.avgAnimals).toBe(10.5) // 21 / 2
    expect(m.adoption.breedings).toBe(1)
    expect(m.adoption.collaborators).toBe(1)
    expect(m.adoption.sales).toBe(0)
  })

  it('counts signups in the current month bucket and last30', () => {
    const users = [
      { id: 'u1', email: 'a@x.com', createdAt: daysAgo(5) },
      { id: 'u2', email: 'b@x.com', createdAt: daysAgo(10) },
      { id: 'u3', email: 'c@x.com', createdAt: daysAgo(200) },
    ]
    const m = computeUsageMetrics({ users }, NOW)
    expect(m.growth.last30).toBe(2)
    const current = m.growth.monthly[m.growth.monthly.length - 1]
    expect(current.month).toBe('2026-06')
    expect(current.signups).toBe(2)
  })
})
