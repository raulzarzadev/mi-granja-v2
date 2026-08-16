export interface AiUsageRecord {
  userId: string
  dateKey: string
  count: number
  totalTokens: number
  totalCost: number
  providerCounts: Record<string, number>
  modelCounts: Record<string, number>
}

export interface AiUsageUserProfile {
  id: string
  email?: string | null
  name?: string | null
}

export interface AiUsageStatistics {
  totals: {
    queries: number
    activeUsers: number
    totalTokens: number
    reportedCost: number
    queriesPerUser: number
  }
  daily: Array<{ date: string; queries: number; users: number; tokens: number }>
  providers: Array<{ name: string; queries: number }>
  models: Array<{ name: string; queries: number }>
  users: Array<{
    userId: string
    name: string
    email: string
    queries: number
    totalTokens: number
    reportedCost: number
    lastUsedAt: string
  }>
}

function numberValue(value: unknown): number {
  const numeric = Number(value || 0)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0
}

export function normalizeAiUsageRecord(value: unknown): AiUsageRecord | null {
  if (!value || typeof value !== 'object') return null
  const stored = value as Record<string, unknown>
  if (typeof stored.userId !== 'string' || typeof stored.dateKey !== 'string') return null
  return {
    userId: stored.userId,
    dateKey: stored.dateKey,
    count: numberValue(stored.count),
    totalTokens: numberValue(stored.totalTokens),
    totalCost: numberValue(stored.totalCost),
    providerCounts: normalizeCountMap(stored.providerCounts),
    modelCounts: normalizeCountMap(stored.modelCounts),
  }
}

function normalizeCountMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {}
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, count]) => [key, numberValue(count)] as const)
      .filter(([, count]) => count > 0),
  )
}

export function createAiUsageDateKeys(endDateKey: string, days: number): string[] {
  const end = new Date(`${endDateKey}T12:00:00.000Z`)
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(end)
    date.setUTCDate(end.getUTCDate() - (days - index - 1))
    return date.toISOString().slice(0, 10)
  })
}

export function buildAiUsageStatistics({
  records,
  profiles,
  dateKeys,
}: {
  records: AiUsageRecord[]
  profiles: AiUsageUserProfile[]
  dateKeys: string[]
}): AiUsageStatistics {
  const includedDates = new Set(dateKeys)
  const filteredRecords = records.filter((record) => includedDates.has(record.dateKey))
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]))
  const dailyByDate = new Map(
    dateKeys.map((date) => [date, { date, queries: 0, users: new Set<string>(), tokens: 0 }]),
  )
  const users = new Map<
    string,
    { queries: number; totalTokens: number; reportedCost: number; lastUsedAt: string }
  >()
  const providerCounts = new Map<string, number>()
  const modelCounts = new Map<string, number>()
  let queries = 0
  let totalTokens = 0
  let reportedCost = 0

  for (const record of filteredRecords) {
    queries += record.count
    totalTokens += record.totalTokens
    reportedCost += record.totalCost
    const daily = dailyByDate.get(record.dateKey)
    if (daily) {
      daily.queries += record.count
      daily.tokens += record.totalTokens
      daily.users.add(record.userId)
    }
    const currentUser = users.get(record.userId) ?? {
      queries: 0,
      totalTokens: 0,
      reportedCost: 0,
      lastUsedAt: '',
    }
    currentUser.queries += record.count
    currentUser.totalTokens += record.totalTokens
    currentUser.reportedCost += record.totalCost
    if (record.dateKey > currentUser.lastUsedAt) currentUser.lastUsedAt = record.dateKey
    users.set(record.userId, currentUser)

    const identifiedProviderQueries = Object.values(record.providerCounts).reduce(
      (total, count) => total + count,
      0,
    )
    if (identifiedProviderQueries < record.count) {
      providerCounts.set(
        'No registrado',
        (providerCounts.get('No registrado') ?? 0) + record.count - identifiedProviderQueries,
      )
    }
    for (const [provider, count] of Object.entries(record.providerCounts)) {
      providerCounts.set(provider, (providerCounts.get(provider) ?? 0) + count)
    }
    const identifiedModelQueries = Object.values(record.modelCounts).reduce(
      (total, count) => total + count,
      0,
    )
    if (identifiedModelQueries < record.count) {
      modelCounts.set(
        'No registrado',
        (modelCounts.get('No registrado') ?? 0) + record.count - identifiedModelQueries,
      )
    }
    for (const [model, count] of Object.entries(record.modelCounts)) {
      modelCounts.set(model, (modelCounts.get(model) ?? 0) + count)
    }
  }

  return {
    totals: {
      queries,
      activeUsers: users.size,
      totalTokens,
      reportedCost,
      queriesPerUser: users.size > 0 ? queries / users.size : 0,
    },
    daily: Array.from(dailyByDate.values()).map((daily) => ({
      date: daily.date,
      queries: daily.queries,
      users: daily.users.size,
      tokens: daily.tokens,
    })),
    providers: sortCountMap(providerCounts),
    models: sortCountMap(modelCounts),
    users: Array.from(users.entries())
      .map(([userId, usage]) => {
        const profile = profileById.get(userId)
        return {
          userId,
          name: profile?.name?.trim() || profile?.email?.trim() || 'Usuario sin nombre',
          email: profile?.email?.trim() || '',
          ...usage,
        }
      })
      .sort((a, b) => b.queries - a.queries || b.lastUsedAt.localeCompare(a.lastUsedAt)),
  }
}

function sortCountMap(counts: Map<string, number>) {
  return Array.from(counts, ([name, queries]) => ({ name, queries })).sort(
    (a, b) => b.queries - a.queries || a.name.localeCompare(b.name),
  )
}
