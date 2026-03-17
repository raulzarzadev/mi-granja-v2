'use client'

import React, { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/features/store'
import { AnimalType, animal_icon, animals_types_labels } from '@/types/animals'
import { getTotalAmount, getTotalWeight } from './SaleCard'

const formatPrice = (centavos: number) =>
  `$${(centavos / 100).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

const formatWeight = (grams: number) =>
  `${(grams / 1000).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`

const monthLabel = (month: number, year: number) => {
  const d = new Date(year, month)
  return d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' })
}

type MonthBucket = { month: number; year: number; key: string }

const getLast6Months = (): MonthBucket[] => {
  const result: MonthBucket[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({
      month: d.getMonth(),
      year: d.getFullYear(),
      key: `${d.getFullYear()}-${d.getMonth()}`,
    })
  }
  return result
}

const Bar: React.FC<{ value: number; max: number; label: string; color?: string }> = ({
  value,
  max,
  label,
  color = 'bg-green-500',
}) => {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-16 text-right shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
        <div
          className={`${color} h-full rounded-full transition-all`}
          style={{ width: `${Math.max(pct, 1)}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-700 w-12 shrink-0">{value}</span>
    </div>
  )
}

const StatisticsTab: React.FC = () => {
  const animals = useSelector((state: RootState) => state.animals.animals)
  const sales = useSelector((state: RootState) => state.sales.sales)
  const breedings = useSelector((state: RootState) => state.breeding.breedingRecords)

  const months = useMemo(() => getLast6Months(), [])

  // ── Ventas ──
  const salesStats = useMemo(() => {
    const completed = sales.filter((s) => s.status === 'completed')
    const totalAmount = completed.reduce((sum, s) => sum + getTotalAmount(s), 0)
    const totalKg = completed.reduce((sum, s) => sum + getTotalWeight(s), 0)

    const byMonth = new Map<string, { amount: number; count: number }>()
    for (const m of months) byMonth.set(m.key, { amount: 0, count: 0 })
    for (const s of completed) {
      if (!s.date) continue
      const d = new Date(s.date)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      const entry = byMonth.get(key)
      if (entry) {
        entry.amount += getTotalAmount(s)
        entry.count++
      }
    }

    return { totalAmount, totalKg, byMonth, count: completed.length }
  }, [sales, months])

  // ── Nacimientos ──
  const birthStats = useMemo(() => {
    const byMonth = new Map<string, number>()
    for (const m of months) byMonth.set(m.key, 0)

    let totalBirths = 0
    for (const b of breedings) {
      for (const f of b.femaleBreedingInfo) {
        if (f.actualBirthDate) {
          const d = new Date(f.actualBirthDate)
          const key = `${d.getFullYear()}-${d.getMonth()}`
          totalBirths++
          const val = byMonth.get(key)
          if (val !== undefined) byMonth.set(key, val + 1)
        }
      }
    }

    // Tasa supervivencia: crías activas / total nacidas
    const offspringIds = new Set<string>()
    for (const b of breedings) {
      for (const f of b.femaleBreedingInfo) {
        if (f.offspring) {
          for (const id of f.offspring) offspringIds.add(id)
        }
      }
    }
    const alive = animals.filter(
      (a) => offspringIds.has(a.id) && (a.status ?? 'activo') === 'activo',
    ).length
    const survivalRate = offspringIds.size > 0 ? (alive / offspringIds.size) * 100 : 0

    return { byMonth, totalBirths, survivalRate }
  }, [breedings, animals, months])

  // ── Muertes ──
  const deathStats = useMemo(() => {
    const byMonth = new Map<string, number>()
    for (const m of months) byMonth.set(m.key, 0)

    const dead = animals.filter((a) => a.status === 'muerto')
    for (const a of dead) {
      if (a.statusAt) {
        const d = new Date(a.statusAt)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        const val = byMonth.get(key)
        if (val !== undefined) byMonth.set(key, val + 1)
      }
    }

    return { byMonth, total: dead.length }
  }, [animals, months])

  // ── Producción / Peso ──
  const weightStats = useMemo(() => {
    const active = animals.filter((a) => (a.status ?? 'activo') === 'activo')
    const byType = new Map<AnimalType, { totalWeight: number; count: number }>()

    let totalWeight = 0
    for (const a of active) {
      const w = typeof a.weight === 'number' ? a.weight : Number(a.weight) || 0
      if (w > 0) {
        totalWeight += w
        const entry = byType.get(a.type) || { totalWeight: 0, count: 0 }
        entry.totalWeight += w
        entry.count++
        byType.set(a.type, entry)
      }
    }

    return { totalWeight, byType, activeCount: active.length }
  }, [animals])

  const maxSalesMonth = Math.max(...[...salesStats.byMonth.values()].map((v) => v.amount), 1)
  const maxBirthMonth = Math.max(...[...birthStats.byMonth.values()], 1)
  const maxDeathMonth = Math.max(...[...deathStats.byMonth.values()], 1)
  const maxTypeWeight = Math.max(...[...weightStats.byType.values()].map((v) => v.totalWeight), 1)

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Estadísticas</h2>

      {/* Resumen rápido */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">Animales activos</p>
          <p className="text-2xl font-bold text-gray-900">{weightStats.activeCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">Ventas completadas</p>
          <p className="text-2xl font-bold text-gray-900">{salesStats.count}</p>
          <p className="text-xs text-green-600 font-medium">
            {formatPrice(salesStats.totalAmount)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">Nacimientos</p>
          <p className="text-2xl font-bold text-gray-900">{birthStats.totalBirths}</p>
          <p className="text-xs text-blue-600 font-medium">
            {birthStats.survivalRate.toFixed(0)}% supervivencia
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">Muertes</p>
          <p className="text-2xl font-bold text-gray-900">{deathStats.total}</p>
        </div>
      </div>

      {/* Ventas por mes */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-1">Ventas por mes</h3>
        <p className="text-xs text-gray-400 mb-3">
          Total: {formatPrice(salesStats.totalAmount)} · {formatWeight(salesStats.totalKg)} vendidos
        </p>
        <div className="space-y-1.5">
          {months.map((m) => {
            const data = salesStats.byMonth.get(m.key) || { amount: 0, count: 0 }
            return (
              <div key={m.key} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-16 text-right shrink-0">
                  {monthLabel(m.month, m.year)}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
                  <div
                    className="bg-green-500 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max((data.amount / maxSalesMonth) * 100, data.amount > 0 ? 2 : 0)}%`,
                    }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-700 w-24 shrink-0 text-right">
                  {data.amount > 0 ? formatPrice(data.amount) : '—'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Nacimientos y muertes por mes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Nacimientos por mes</h3>
          <div className="space-y-1.5">
            {months.map((m) => (
              <Bar
                key={m.key}
                value={birthStats.byMonth.get(m.key) || 0}
                max={maxBirthMonth}
                label={monthLabel(m.month, m.year)}
                color="bg-blue-500"
              />
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Muertes por mes</h3>
          <div className="space-y-1.5">
            {months.map((m) => (
              <Bar
                key={m.key}
                value={deathStats.byMonth.get(m.key) || 0}
                max={maxDeathMonth}
                label={monthLabel(m.month, m.year)}
                color="bg-red-400"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Peso por especie */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-1">Peso del hato por especie</h3>
        <p className="text-xs text-gray-400 mb-3">
          Peso total: {formatWeight(weightStats.totalWeight)}
        </p>
        <div className="space-y-1.5">
          {[...weightStats.byType.entries()]
            .sort((a, b) => b[1].totalWeight - a[1].totalWeight)
            .map(([type, data]) => (
              <div key={type} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-24 text-right shrink-0">
                  {animal_icon[type]} {animals_types_labels[type]}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all"
                    style={{ width: `${(data.totalWeight / maxTypeWeight) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-700 w-24 shrink-0 text-right">
                  {formatWeight(data.totalWeight)}
                </span>
                <span className="text-[10px] text-gray-400 w-20 shrink-0">
                  prom: {formatWeight(data.totalWeight / data.count)}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

export default StatisticsTab
