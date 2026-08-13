'use client'

import React, { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { RootState } from '@/features/store'
import { isAvailableToSale } from '@/lib/animal-utils'
import { Animal, AnimalType, animal_icon, animals_types_labels } from '@/types/animals'
import { getTotalAmount, getTotalWeight } from './SaleCard'

const formatPrice = (centavos: number) =>
  `$${(centavos / 100).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

const formatWeight = (grams: number) =>
  `${(grams / 1000).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`

const monthLabel = (month: number, year: number) => {
  const d = new Date(year, month)
  return d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' })
}

const monthKeyLabel = (key: string) => {
  const [year, month] = key.split('-').map(Number)
  return monthLabel(month, year)
}

type MonthBucket = { month: number; year: number; key: string }

type MonthlySalesPoint = MonthBucket & {
  amount: number
  count: number
  kg: number
  animals: number
  pricePerKg: number | null
}

type MonthlyActivityPoint = MonthBucket & {
  births: number
  deaths: number
  pregnancies: number
  failedBreedings: number
}

type StatisticsPeriod = 6 | 12 | 24

const getRecentMonths = (numberOfMonths: number): MonthBucket[] => {
  const result: MonthBucket[] = []
  const now = new Date()
  for (let i = numberOfMonths - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({
      month: d.getMonth(),
      year: d.getFullYear(),
      key: `${d.getFullYear()}-${d.getMonth()}`,
    })
  }
  return result
}

const chartWidth = (points: number) => Math.max(640, points * 58)

const chartTooltipStyle = {
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  boxShadow: '0 8px 24px rgb(15 23 42 / 0.10)',
  fontSize: '12px',
}

const SalesLineChart: React.FC<{ data: MonthlySalesPoint[] }> = ({ data }) => (
  <div className="overflow-x-auto" aria-label="Ventas mensuales en kilos e ingresos">
    <div className="h-72" style={{ minWidth: chartWidth(data.length) }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 10, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="key" tickFormatter={monthKeyLabel} tick={{ fontSize: 11 }} />
          <YAxis
            yAxisId="kg"
            width={54}
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => `${Number(value).toLocaleString('es-MX')} kg`}
          />
          <YAxis
            yAxisId="amount"
            orientation="right"
            width={74}
            tick={{ fontSize: 11 }}
            tickFormatter={(value) =>
              `$${(Number(value) / 100).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`
            }
          />
          <Tooltip
            labelFormatter={(label) => monthKeyLabel(String(label))}
            formatter={(value, name) => [
              name === 'Ingresos' ? formatPrice(Number(value)) : formatWeight(Number(value) * 1000),
              name,
            ]}
            contentStyle={chartTooltipStyle}
          />
          <Legend iconType="plainline" />
          <Line
            yAxisId="kg"
            type="monotone"
            dataKey="kg"
            name="Kilos vendidos"
            stroke="#d97706"
            strokeWidth={3}
            dot={{ r: 4, fill: '#fff', strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="amount"
            type="monotone"
            dataKey="amount"
            name="Ingresos"
            stroke="#16a34a"
            strokeWidth={3}
            dot={{ r: 4, fill: '#fff', strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
)

const PriceLineChart: React.FC<{ data: MonthlySalesPoint[] }> = ({ data }) => (
  <div className="overflow-x-auto" aria-label="Precio promedio mensual por kilo">
    <div className="h-56" style={{ minWidth: chartWidth(data.length) }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="key" tickFormatter={monthKeyLabel} tick={{ fontSize: 11 }} />
          <YAxis
            width={72}
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => formatPrice(Number(value))}
          />
          <Tooltip
            labelFormatter={(label) => monthKeyLabel(String(label))}
            formatter={(value) => [formatPrice(Number(value)), 'Precio por kg']}
            contentStyle={chartTooltipStyle}
          />
          <Line
            type="monotone"
            dataKey="pricePerKg"
            name="Precio por kg"
            stroke="#7c3aed"
            strokeWidth={3}
            dot={{ r: 4, fill: '#fff', strokeWidth: 2 }}
            activeDot={{ r: 6 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
)

const ActivityLineChart: React.FC<{ data: MonthlyActivityPoint[] }> = ({ data }) => (
  <div
    className="overflow-x-auto"
    aria-label="Nacimientos, muertes, embarazos y montas fallidas por mes"
  >
    <div className="h-80" style={{ minWidth: chartWidth(data.length) }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="key" tickFormatter={monthKeyLabel} tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} width={38} tick={{ fontSize: 11 }} />
          <Tooltip
            labelFormatter={(label) => monthKeyLabel(String(label))}
            contentStyle={chartTooltipStyle}
          />
          <Legend iconType="plainline" />
          <Line
            type="monotone"
            dataKey="births"
            name="Nacimientos"
            stroke="#2563eb"
            strokeWidth={3}
          />
          <Line type="monotone" dataKey="deaths" name="Muertes" stroke="#dc2626" strokeWidth={3} />
          <Line
            type="monotone"
            dataKey="pregnancies"
            name="Embarazos"
            stroke="#db2777"
            strokeWidth={3}
          />
          <Line
            type="monotone"
            dataKey="failedBreedings"
            name="Montas fallidas"
            stroke="#d97706"
            strokeWidth={3}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
)

interface StatisticsTabProps {
  animals?: Animal[]
}

const StatisticsTab: React.FC<StatisticsTabProps> = ({ animals: animalsProp }) => {
  const [period, setPeriod] = useState<StatisticsPeriod>(6)
  const allAnimals = useSelector((state: RootState) => state.animals.animals)
  const allSales = useSelector((state: RootState) => state.sales.sales)
  const allBreedings = useSelector((state: RootState) => state.breeding.breedingRecords)

  const animals = animalsProp ?? allAnimals
  const isFiltered = animalsProp !== undefined
  const allowedIds = useMemo(() => new Set(animals.map((a) => a.id)), [animals])

  const sales = useMemo(
    () =>
      isFiltered
        ? allSales.filter((s) => s.animals?.some((sa) => allowedIds.has(sa.animalId)))
        : allSales,
    [allSales, allowedIds, isFiltered],
  )
  const breedings = useMemo(
    () =>
      isFiltered
        ? allBreedings.filter((b) => {
            if (allowedIds.has(b.maleId)) return true
            return b.femaleBreedingInfo.some((f) => allowedIds.has(f.femaleId))
          })
        : allBreedings,
    [allBreedings, allowedIds, isFiltered],
  )

  const months = useMemo(() => getRecentMonths(period), [period])

  // ── Ventas ──
  const salesStats = useMemo(() => {
    const completed = sales.filter((s) => s.status === 'completed')
    const totalAmount = completed.reduce((sum, s) => sum + getTotalAmount(s), 0)
    const totalKg = completed.reduce((sum, s) => sum + getTotalWeight(s), 0)
    const totalAnimals = completed.reduce((sum, s) => sum + (s.animals?.length || 0), 0)
    const avgPricePerKg = totalKg > 0 ? totalAmount / (totalKg / 1000) : 0

    const byMonth = new Map<
      string,
      { amount: number; count: number; kg: number; animals: number; pricePerKg: number | null }
    >()
    for (const m of months) {
      byMonth.set(m.key, { amount: 0, count: 0, kg: 0, animals: 0, pricePerKg: null })
    }
    for (const s of completed) {
      if (!s.date) continue
      const d = new Date(s.date)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      const entry = byMonth.get(key)
      if (entry) {
        entry.amount += getTotalAmount(s)
        entry.kg += getTotalWeight(s) / 1000
        entry.count++
        entry.animals += s.animals?.length || 0
      }
    }
    for (const entry of byMonth.values()) {
      entry.pricePerKg = entry.kg > 0 ? entry.amount / entry.kg : null
    }

    // Por especie (mira el animal vendido)
    const bySpecies = new Map<AnimalType, { amount: number; kg: number; animals: number }>()
    const animalById = new Map(allAnimals.map((a) => [a.id, a]))
    for (const s of completed) {
      const totalSaleKg = getTotalWeight(s) / 1000
      const totalSaleAmount = getTotalAmount(s)
      for (const sa of s.animals || []) {
        const animal = animalById.get(sa.animalId)
        const type = animal?.type
        if (!type) continue
        const wKg = (sa.weight || 0) / 1000
        const ratio = totalSaleKg > 0 ? wKg / totalSaleKg : 1 / (s.animals?.length || 1)
        const entry = bySpecies.get(type) || { amount: 0, kg: 0, animals: 0 }
        entry.amount += totalSaleAmount * ratio
        entry.kg += wKg
        entry.animals++
        bySpecies.set(type, entry)
      }
    }

    // Top compradores
    const byBuyer = new Map<string, { amount: number; count: number }>()
    for (const s of completed) {
      const buyer = (s.buyer || '').trim() || 'Sin nombre'
      const entry = byBuyer.get(buyer) || { amount: 0, count: 0 }
      entry.amount += getTotalAmount(s)
      entry.count++
      byBuyer.set(buyer, entry)
    }
    const topBuyers = [...byBuyer.entries()].sort((a, b) => b[1].amount - a[1].amount).slice(0, 5)

    return {
      totalAmount,
      totalKg,
      totalAnimals,
      avgPricePerKg,
      byMonth,
      bySpecies,
      topBuyers,
      count: completed.length,
    }
  }, [sales, months, allAnimals])

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

  // ── Actividad reproductiva ──
  const reproductiveStats = useMemo(() => {
    const pregnanciesByMonth = new Map<string, number>()
    const failedBreedingsByMonth = new Map<string, number>()
    for (const month of months) {
      pregnanciesByMonth.set(month.key, 0)
      failedBreedingsByMonth.set(month.key, 0)
    }

    for (const breeding of breedings) {
      for (const info of breeding.femaleBreedingInfo) {
        if (info.pregnancyConfirmedDate) {
          const date = new Date(info.pregnancyConfirmedDate)
          const key = `${date.getFullYear()}-${date.getMonth()}`
          const current = pregnanciesByMonth.get(key)
          if (current !== undefined) pregnanciesByMonth.set(key, current + 1)
        }

        const isFailed = info.outcome === 'open' || info.legacyStatus === 'EMPTY'
        const failedDate = info.diagnosedAt
          ? new Date(info.diagnosedAt)
          : isFailed && breeding.updatedAt
            ? new Date(breeding.updatedAt)
            : null
        if (isFailed && failedDate && !Number.isNaN(failedDate.getTime())) {
          const key = `${failedDate.getFullYear()}-${failedDate.getMonth()}`
          const current = failedBreedingsByMonth.get(key)
          if (current !== undefined) failedBreedingsByMonth.set(key, current + 1)
        }
      }
    }

    return { pregnanciesByMonth, failedBreedingsByMonth }
  }, [breedings, months])

  const monthlySalesData = useMemo<MonthlySalesPoint[]>(
    () =>
      months.map((month) => ({
        ...month,
        ...(salesStats.byMonth.get(month.key) || {
          amount: 0,
          count: 0,
          kg: 0,
          animals: 0,
          pricePerKg: null,
        }),
      })),
    [months, salesStats.byMonth],
  )

  const monthlyActivityData = useMemo<MonthlyActivityPoint[]>(
    () =>
      months.map((month) => ({
        ...month,
        births: birthStats.byMonth.get(month.key) || 0,
        deaths: deathStats.byMonth.get(month.key) || 0,
        pregnancies: reproductiveStats.pregnanciesByMonth.get(month.key) || 0,
        failedBreedings: reproductiveStats.failedBreedingsByMonth.get(month.key) || 0,
      })),
    [months, birthStats.byMonth, deathStats.byMonth, reproductiveStats],
  )

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

  const maxTypeWeight = Math.max(...[...weightStats.byType.values()].map((v) => v.totalWeight), 1)
  const maxSpeciesAmount = Math.max(...[...salesStats.bySpecies.values()].map((v) => v.amount), 1)
  const maxBuyerAmount = Math.max(...salesStats.topBuyers.map(([, v]) => v.amount), 1)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Estadísticas</h2>
          <p className="text-xs text-gray-500">
            Las gráficas se actualizan según el periodo elegido.
          </p>
        </div>
        <div
          className="inline-flex w-full rounded-lg border border-gray-200 bg-white p-1 sm:w-auto"
          aria-label="Periodo de las gráficas"
        >
          {(
            [
              [6, '6 meses'],
              [12, '1 año'],
              [24, '2 años'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setPeriod(value)}
              aria-pressed={period === value}
              className={`min-h-10 flex-1 rounded-md px-3 text-sm font-medium transition-colors sm:flex-none ${
                period === value
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">Animales activos</p>
          <p className="text-2xl font-bold text-gray-900">{weightStats.activeCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">Listos para venta</p>
          <p className="text-2xl font-bold text-gray-900">
            {animals.filter(isAvailableToSale).length}
          </p>
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

      {/* KPIs ventas */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Resumen de ventas</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <p className="text-xs text-gray-500">Animales vendidos</p>
            <p className="text-xl font-bold text-gray-900">{salesStats.totalAnimals}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Kg vendidos</p>
            <p className="text-xl font-bold text-gray-900">{formatWeight(salesStats.totalKg)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Ingresos</p>
            <p className="text-xl font-bold text-green-600">
              {formatPrice(salesStats.totalAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Precio promedio / kg</p>
            <p className="text-xl font-bold text-gray-900">
              {formatPrice(salesStats.avgPricePerKg)}
            </p>
          </div>
        </div>
      </div>

      {/* Ventas por mes — evolución de kg e ingresos */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-1">Evolución mensual de ventas</h3>
        <p className="text-xs text-gray-500 mb-3">
          Compara kilos vendidos e ingresos durante el periodo seleccionado.
        </p>
        <SalesLineChart data={monthlySalesData} />
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-1">
          Precio promedio de venta por kilo
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          Promedio ponderado mensual; los meses sin ventas no muestran un punto.
        </p>
        <PriceLineChart data={monthlySalesData} />
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-1">Actividad del hato por mes</h3>
        <p className="text-xs text-gray-500 mb-3">
          Nacimientos, muertes, embarazos confirmados y montas diagnosticadas sin gestación.
        </p>
        <ActivityLineChart data={monthlyActivityData} />
      </div>

      {/* Ventas por especie */}
      {salesStats.bySpecies.size > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Ventas por especie</h3>
          <div className="space-y-1.5">
            {[...salesStats.bySpecies.entries()]
              .sort((a, b) => b[1].amount - a[1].amount)
              .map(([type, data]) => (
                <div key={type} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-24 text-right shrink-0">
                    {animal_icon[type]} {animals_types_labels[type]}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
                    <div
                      className="bg-green-500 h-full rounded-full transition-all"
                      style={{ width: `${(data.amount / maxSpeciesAmount) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-700 w-24 shrink-0 text-right">
                    {formatPrice(data.amount)}
                  </span>
                  <span className="text-[10px] text-gray-400 w-24 shrink-0">
                    {data.animals} an. · {formatWeight(data.kg * 1000)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Top compradores */}
      {salesStats.topBuyers.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Top compradores</h3>
          <div className="space-y-1.5">
            {salesStats.topBuyers.map(([buyer, data]) => (
              <div key={buyer} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-32 text-right shrink-0 truncate">
                  {buyer}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all"
                    style={{ width: `${(data.amount / maxBuyerAmount) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-700 w-24 shrink-0 text-right">
                  {formatPrice(data.amount)}
                </span>
                <span className="text-[10px] text-gray-400 w-12 shrink-0">{data.count} v.</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
