/**
 * Métricas de uso derivadas de los datos existentes en Firestore.
 * Función pura: recibe las colecciones ya cargadas y la fecha "ahora",
 * sin tocar la app de usuario ni añadir tracking nuevo.
 *
 * "Actividad" = el documento más reciente (updatedAt || createdAt) que el
 * usuario haya escrito en cualquier colección. No detecta logins/lecturas.
 */

const DAY_MS = 24 * 60 * 60 * 1000

/** Normaliza Timestamp de Firestore | Date | string | número a Date (o null). */
function toDate(raw: any): Date | null {
  if (!raw) return null
  const d = typeof raw?.toDate === 'function' ? raw.toDate() : new Date(raw)
  return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null
}

function latest(...dates: (Date | null)[]): Date | null {
  let max: Date | null = null
  for (const d of dates) {
    if (d && (!max || d.getTime() > max.getTime())) max = d
  }
  return max
}

export interface UsageMetricsInput {
  users?: any[]
  animals?: any[]
  farms?: any[]
  breedings?: any[]
  reminders?: any[]
  sales?: any[]
}

export interface UsageUserRow {
  id: string
  email: string
  lastActivity: Date | null
  daysSinceActivity: number | null
  animals: number
  farms: number
  breedings: number
  sales: number
  reminders: number
}

export interface UsageMetrics {
  totalUsers: number
  activity: {
    active7: number
    active30: number
    dormant: number // con actividad pero >30 días
    never: number // sin ninguna actividad además del registro
  }
  growth: {
    /** Últimos 6 meses, ascendente. month = 'YYYY-MM'. */
    monthly: { month: string; signups: number }[]
    last30: number
  }
  depth: {
    avgAnimals: number
    avgFarms: number
    maxAnimals: number
    withAnimals: number // usuarios con >=1 animal
    powerUsers: number // usuarios con >=20 animales
  }
  adoption: {
    breedings: number // usuarios con >=1 reproducción
    sales: number
    reminders: number
    collaborators: number // usuarios con >=1 colaborador en alguna granja
  }
  /** Filas por usuario ordenadas por última actividad desc. */
  rows: UsageUserRow[]
}

const POWER_USER_ANIMALS = 20

export function computeUsageMetrics(input: UsageMetricsInput, now: Date): UsageMetrics {
  const { users = [], animals = [], farms = [], breedings = [], reminders = [], sales = [] } = input

  // Índices por farmerId / ownerId
  const countBy = (arr: any[], key: string) => {
    const m = new Map<string, number>()
    for (const it of arr) {
      const id = it[key]
      if (id) m.set(id, (m.get(id) || 0) + 1)
    }
    return m
  }
  const latestBy = (arr: any[], key: string) => {
    const m = new Map<string, Date | null>()
    for (const it of arr) {
      const id = it[key]
      if (!id) continue
      const d = latest(toDate(it.updatedAt), toDate(it.createdAt))
      m.set(id, latest(m.get(id) ?? null, d))
    }
    return m
  }

  const animalsByUser = countBy(animals, 'farmerId')
  const breedingsByUser = countBy(breedings, 'farmerId')
  const salesByUser = countBy(sales, 'farmerId')
  const remindersByUser = countBy(reminders, 'farmerId')
  const farmsByUser = countBy(farms, 'ownerId')

  const animalsLatest = latestBy(animals, 'farmerId')
  const breedingsLatest = latestBy(breedings, 'farmerId')
  const salesLatest = latestBy(sales, 'farmerId')
  const remindersLatest = latestBy(reminders, 'farmerId')
  const farmsLatest = latestBy(farms, 'ownerId')

  // Usuarios con al menos 1 colaborador en alguna de sus granjas
  const usersWithCollaborators = new Set<string>()
  for (const f of farms) {
    if (Array.isArray(f.collaborators) && f.collaborators.length > 0 && f.ownerId) {
      usersWithCollaborators.add(f.ownerId)
    }
  }

  let active7 = 0
  let active30 = 0
  let dormant = 0
  let never = 0
  let sumAnimals = 0
  let sumFarms = 0
  let maxAnimals = 0
  let withAnimals = 0
  let powerUsers = 0
  let adoptBreedings = 0
  let adoptSales = 0
  let adoptReminders = 0
  let last30Signups = 0

  const monthBuckets = new Map<string, number>()
  // Inicializa últimos 6 meses en 0 (ascendente)
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthBuckets.set(key, 0)
  }

  const rows: UsageUserRow[] = users.map((u: any) => {
    const id = u.id
    const aCount = animalsByUser.get(id) || 0
    const fCount = farmsByUser.get(id) || 0
    const bCount = breedingsByUser.get(id) || 0
    const sCount = salesByUser.get(id) || 0
    const rCount = remindersByUser.get(id) || 0

    const lastActivity = latest(
      animalsLatest.get(id) ?? null,
      breedingsLatest.get(id) ?? null,
      salesLatest.get(id) ?? null,
      remindersLatest.get(id) ?? null,
      farmsLatest.get(id) ?? null,
    )

    const daysSinceActivity = lastActivity
      ? Math.floor((now.getTime() - lastActivity.getTime()) / DAY_MS)
      : null

    // Actividad
    if (daysSinceActivity === null) {
      never++
    } else if (daysSinceActivity <= 7) {
      active7++
      active30++
    } else if (daysSinceActivity <= 30) {
      active30++
    } else {
      dormant++
    }

    // Profundidad
    sumAnimals += aCount
    sumFarms += fCount
    if (aCount > maxAnimals) maxAnimals = aCount
    if (aCount >= 1) withAnimals++
    if (aCount >= POWER_USER_ANIMALS) powerUsers++

    // Adopción
    if (bCount >= 1) adoptBreedings++
    if (sCount >= 1) adoptSales++
    if (rCount >= 1) adoptReminders++

    // Crecimiento
    const created = toDate(u.createdAt)
    if (created) {
      if (now.getTime() - created.getTime() <= 30 * DAY_MS) last30Signups++
      const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`
      if (monthBuckets.has(key)) monthBuckets.set(key, (monthBuckets.get(key) || 0) + 1)
    }

    return {
      id,
      email: u.email || id,
      lastActivity,
      daysSinceActivity,
      animals: aCount,
      farms: fCount,
      breedings: bCount,
      sales: sCount,
      reminders: rCount,
    }
  })

  rows.sort((a, b) => {
    const ta = a.lastActivity?.getTime() ?? 0
    const tb = b.lastActivity?.getTime() ?? 0
    return tb - ta
  })

  const total = users.length
  const round1 = (n: number) => Math.round(n * 10) / 10

  return {
    totalUsers: total,
    activity: { active7, active30, dormant, never },
    growth: {
      monthly: Array.from(monthBuckets.entries()).map(([month, signups]) => ({
        month,
        signups,
      })),
      last30: last30Signups,
    },
    depth: {
      avgAnimals: total ? round1(sumAnimals / total) : 0,
      avgFarms: total ? round1(sumFarms / total) : 0,
      maxAnimals,
      withAnimals,
      powerUsers,
    },
    adoption: {
      breedings: adoptBreedings,
      sales: adoptSales,
      reminders: adoptReminders,
      collaborators: usersWithCollaborators.size,
    },
    rows,
  }
}
