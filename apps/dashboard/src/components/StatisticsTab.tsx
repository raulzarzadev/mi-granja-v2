'use client'

import {
  calculateFemaleProductivityRanking,
  FemaleProductivityResult,
} from '@mi-granja/shared/lib/female-productivity'
import React, { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { RootState } from '@/features/store'
import { isAvailableToSale } from '@/lib/animal-utils'
import { toDate } from '@/lib/dates'
import { isDateInMonthBuckets } from '@/lib/statistics-period'
import { Animal, AnimalType, animal_icon, animals_types_labels } from '@/types/animals'
import DataTable, { type ColumnDef } from './DataTable'
import ModalAnimalDetails from './ModalAnimalDetails'
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

const toLogChartScale = (value: number) => (value > 0 ? Math.log10(value) + 1 : 0)
const getAnimalAgeInMonths = (animal?: Animal) => {
  if (!animal?.birthDate) return null
  const birthDate = toDate(animal.birthDate)
  const today = new Date()
  let months =
    (today.getFullYear() - birthDate.getFullYear()) * 12 + today.getMonth() - birthDate.getMonth()
  if (today.getDate() < birthDate.getDate()) months -= 1
  return Math.max(0, months)
}
const formatAnimalAgeInMonths = (months: number | null) => {
  if (months === null) return '—'
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  if (years === 0) return `${remainingMonths}m`
  return remainingMonths === 0 ? `${years}a` : `${years}a ${remainingMonths}m`
}
const normalizeProductivitySearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/^#/, '')
    .toLocaleLowerCase('es-MX')
const productivityItemMatches = (
  item: FemaleProductivityResult,
  query: string,
  animalById: Map<string, Animal>,
) => {
  if (!query) return true
  const animal = animalById.get(item.femaleId)
  return [item.animalNumber, animal?.name, animal?.breed].some((value) =>
    value ? normalizeProductivitySearch(String(value)).includes(query) : false,
  )
}

const FemaleProductivitySection: React.FC<{
  ranking: FemaleProductivityResult[]
  animals: Animal[]
}> = ({ ranking, animals }) => {
  const species = useMemo(() => [...new Set(ranking.map((item) => item.species))].sort(), [ranking])
  const [selectedSpecies, setSelectedSpecies] = useState<AnimalType | 'all'>('all')
  const [selectedBin, setSelectedBin] = useState<number | null>(null)
  const [tableSearch, setTableSearch] = useState('')
  const animalById = useMemo(() => new Map(animals.map((animal) => [animal.id, animal])), [animals])
  const speciesFiltered = useMemo(
    () =>
      selectedSpecies === 'all'
        ? ranking
        : ranking.filter((item) => item.species === selectedSpecies),
    [ranking, selectedSpecies],
  )
  const distribution = useMemo(() => {
    const binWidth = 0.1
    const binCount = 20
    const bins = Array.from({ length: binCount }, (_, index) => ({
      index,
      score: Number(((index + 0.5) * binWidth).toFixed(2)),
      label:
        index === 0
          ? '0–0.09'
          : `${(index * binWidth).toFixed(1)}–${((index + 1) * binWidth - 0.01).toFixed(2)}`,
      items: [] as FemaleProductivityResult[],
    }))
    for (const item of speciesFiltered) {
      bins[Math.min(binCount - 1, Math.floor(item.score / binWidth))].items.push(item)
    }

    return bins.map((bin, index) => {
      const smooth = bins.reduce((total, neighbor, neighborIndex) => {
        const distance = (index - neighborIndex) / 1.15
        return total + neighbor.items.length * Math.exp(-0.5 * distance ** 2)
      }, 0)
      const count = bin.items.length
      return {
        ...bin,
        count,
        countScale: toLogChartScale(count),
        smooth,
        smoothScale: toLogChartScale(smooth),
      }
    })
  }, [speciesFiltered])
  const selectedTarget =
    selectedSpecies === 'all'
      ? null
      : speciesFiltered[0]?.targetPerYear ||
        ranking.find((item) => item.species === selectedSpecies)?.targetPerYear
  const selectedGroup = selectedBin === null ? null : distribution[selectedBin]
  const normalizedSearch = normalizeProductivitySearch(tableSearch)
  const searchResultCount = useMemo(
    () =>
      normalizedSearch
        ? speciesFiltered.filter((item) =>
            productivityItemMatches(item, normalizedSearch, animalById),
          ).length
        : null,
    [speciesFiltered, normalizedSearch, animalById],
  )
  const groupedAnimals = useMemo(
    () =>
      [...(selectedGroup?.items || [])].filter((item) =>
        productivityItemMatches(item, normalizedSearch, animalById),
      ),
    [selectedGroup, normalizedSearch, animalById],
  )
  const productivityColumns = useMemo<ColumnDef<FemaleProductivityResult>[]>(
    () => [
      {
        key: 'animalNumber',
        label: 'Hembra',
        sortable: true,
        sortFn: (a, b) => a.animalNumber.localeCompare(b.animalNumber, 'es-MX', { numeric: true }),
        render: (item) => {
          const animal = animalById.get(item.femaleId)
          return (
            <span className="font-semibold text-gray-800">
              #{item.animalNumber}
              {animal?.name ? ` · ${animal.name}` : ''}
            </span>
          )
        },
      },
      {
        key: 'age',
        label: 'Edad',
        sortable: true,
        sortFn: (a, b) => {
          const ageA = getAnimalAgeInMonths(animalById.get(a.femaleId))
          const ageB = getAnimalAgeInMonths(animalById.get(b.femaleId))
          if (ageA === null) return ageB === null ? 0 : 1
          if (ageB === null) return -1
          return ageA - ageB
        },
        render: (item) => (
          <span className="tabular-nums text-gray-600">
            {formatAnimalAgeInMonths(getAnimalAgeInMonths(animalById.get(item.femaleId)))}
          </span>
        ),
      },
      {
        key: 'recordedBirths',
        label: 'Partos',
        sortable: true,
        sortFn: (a, b) => a.recordedBirths - b.recordedBirths,
        headerClassName: 'text-right',
        className: 'text-right tabular-nums',
        render: (item) => item.recordedBirths,
      },
      {
        key: 'achievedOffspring',
        label: 'Logradas',
        sortable: true,
        sortFn: (a, b) => a.achievedOffspring - b.achievedOffspring,
        headerClassName: 'text-right min-w-28',
        className: 'text-right tabular-nums',
        render: (item) => item.achievedOffspring,
      },
      {
        key: 'annualizedOffspring',
        label: 'Por año',
        sortable: true,
        sortFn: (a, b) => a.annualizedOffspring - b.annualizedOffspring,
        headerClassName: 'text-right',
        className: 'text-right tabular-nums',
        render: (item) => item.annualizedOffspring.toFixed(2),
      },
      {
        key: 'score',
        label: 'Índice',
        sortable: true,
        sortFn: (a, b) => a.score - b.score,
        headerClassName: 'text-right',
        className: 'text-right',
        render: (item) => (
          <span className="inline-flex min-w-12 justify-center rounded-full bg-green-100 px-2 py-0.5 font-bold tabular-nums text-green-800">
            {item.score.toFixed(2)}
          </span>
        ),
      },
    ],
    [animalById],
  )
  const handleSearchChange = (value: string) => {
    setTableSearch(value)

    const query = normalizeProductivitySearch(value)
    if (!query) return

    const matchingAnimals = speciesFiltered.filter((item) =>
      productivityItemMatches(item, query, animalById),
    )
    const exactMatch = matchingAnimals.find((item) => {
      const animal = animalById.get(item.femaleId)
      return [item.animalNumber, animal?.name].some(
        (searchableValue) =>
          searchableValue && normalizeProductivitySearch(String(searchableValue)) === query,
      )
    })
    const match = exactMatch || matchingAnimals[0]
    if (match) setSelectedBin(Math.min(19, Math.floor(match.score / 0.1)))
  }

  if (ranking.length === 0) return null

  return (
    <section
      className="min-w-0 rounded-lg bg-white p-4 shadow"
      aria-labelledby="female-productivity-title"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 id="female-productivity-title" className="text-sm font-semibold text-gray-800">
            Índice de productividad de hembras
          </h3>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-gray-500">
            Compara crías nacidas vivas por año productivo. Cada cría cuenta desde su nacimiento y
            conserva el mérito aunque después se venda o muera; los nacidos muertos no cuentan. 1
            cumple la meta de su especie y 2 es un límite extraordinario que nunca se alcanza.
          </p>
        </div>
        <label className="flex min-w-0 items-center gap-2 text-xs font-medium text-gray-600 sm:shrink-0">
          Especie
          <select
            value={selectedSpecies}
            onChange={(event) => {
              setSelectedSpecies(event.target.value as AnimalType | 'all')
              setSelectedBin(null)
              setTableSearch('')
            }}
            className="min-h-11 min-w-0 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800"
          >
            <option value="all">Todas</option>
            {species.map((type) => (
              <option key={type} value={type}>
                {animals_types_labels[type]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedTarget && (
        <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-800">
          Meta para {animals_types_labels[selectedSpecies as AnimalType].toLowerCase()}:{' '}
          {selectedTarget.toLocaleString('es-MX')} crías nacidas vivas por hembra al año.
        </p>
      )}

      <div className="mt-4 min-w-0 border-y border-gray-200 py-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h4 className="text-sm font-semibold text-gray-800">Distribución del índice</h4>
            <p className="mt-0.5 text-xs text-gray-500">
              Selecciona una barra para ver las hembras que pertenecen a ese intervalo. El eje
              vertical usa escala logarítmica para que los grupos pequeños sigan visibles.
            </p>
          </div>
          <label className="mt-2 flex items-center gap-2 text-xs font-medium text-gray-600 sm:mt-0">
            Ver grupo
            <select
              value={selectedBin ?? ''}
              onChange={(event) => {
                setSelectedBin(event.target.value === '' ? null : Number(event.target.value))
              }}
              className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-200"
            >
              <option value="">Seleccionar intervalo</option>
              {distribution
                .filter((bin) => bin.count > 0)
                .map((bin) => (
                  <option key={bin.index} value={bin.index}>
                    {bin.label} · {bin.count} hembras
                  </option>
                ))}
            </select>
          </label>
        </div>
        <div
          className="mt-2 h-72 min-w-0"
          role="group"
          aria-label="Distribución del índice de productividad. Las barras se pueden seleccionar."
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={distribution}
              margin={{ top: 16, right: 12, left: -12, bottom: 2 }}
            >
              <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" vertical={false} />
              <ReferenceArea x1={0} x2={1} fill="#f59e0b" fillOpacity={0.07} />
              <ReferenceArea x1={1} x2={1.6} fill="#16a34a" fillOpacity={0.07} />
              <ReferenceArea x1={1.6} x2={2} fill="#0d9488" fillOpacity={0.08} />
              <ReferenceLine
                x={1}
                stroke="#15803d"
                strokeWidth={2}
                strokeDasharray="5 4"
                label={{
                  value: 'Meta 1.0',
                  position: 'insideTopRight',
                  fill: '#166534',
                  fontSize: 11,
                }}
              />
              <XAxis
                type="number"
                dataKey="score"
                domain={[0, 2]}
                ticks={[0, 0.5, 1, 1.5, 2]}
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => Number(value).toFixed(1)}
              />
              <YAxis
                domain={[0, 'dataMax']}
                ticks={[0, 1, 2, 3]}
                tick={{ fontSize: 11 }}
                width={40}
                tickFormatter={(value) =>
                  Number(value) === 0 ? '0' : Math.round(10 ** (Number(value) - 1)).toString()
                }
              />
              <Tooltip
                labelFormatter={(_, payload) => payload?.[0]?.payload?.label || ''}
                formatter={(_, name, item) => {
                  const values = item.payload as { count: number; smooth: number }
                  return name === 'Distribución suavizada'
                    ? [values.smooth.toFixed(1), 'Concentración estimada']
                    : [values.count, 'Hembras']
                }}
                contentStyle={chartTooltipStyle}
              />
              <Bar
                dataKey="countScale"
                name="Hembras"
                fill="#86efac"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              >
                {distribution.map((bin) => (
                  <Cell
                    key={bin.index}
                    fill={
                      selectedBin === bin.index ? '#15803d' : bin.count > 0 ? '#86efac' : '#e5e7eb'
                    }
                    cursor={bin.count > 0 ? 'pointer' : 'default'}
                    onClick={() => {
                      if (bin.count === 0) return
                      setSelectedBin(bin.index)
                    }}
                  />
                ))}
              </Bar>
              <Line
                type="monotone"
                dataKey="smoothScale"
                name="Distribución suavizada"
                stroke="#15803d"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-1 grid grid-cols-3 text-center text-[11px] font-medium">
          <span className="text-amber-800">0–0.99 · Debajo</span>
          <span className="text-green-800">1–1.59 · En meta/alta</span>
          <span className="text-teal-800">1.6–1.99 · Extraordinaria</span>
        </div>
      </div>

      <div className="mt-3">
        <label htmlFor="female-productivity-search" className="sr-only">
          Buscar hembra por número, nombre o raza
        </label>
        <div className="relative max-w-xl">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
          <input
            id="female-productivity-search"
            type="search"
            value={tableSearch}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Buscar por número, nombre o raza…"
            className="min-h-11 w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-base text-gray-800 outline-none placeholder:text-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-200 sm:text-sm"
          />
        </div>
        {normalizedSearch && (
          <p className="mt-1 text-xs text-gray-500" role="status">
            {searchResultCount === 0
              ? 'No se encontraron hembras con esa búsqueda.'
              : `${searchResultCount} coincidencia${searchResultCount === 1 ? '' : 's'} en la distribución.`}
          </p>
        )}
      </div>

      {selectedGroup ? (
        <div className="pt-3">
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <DataTable
              data={groupedAnimals}
              columns={productivityColumns}
              rowKey={(item) => item.femaleId}
              selectable={false}
              defaultSortKey="animalNumber"
              pageSize={10}
              emptyMessage="No hay hembras de este intervalo que coincidan con la búsqueda."
              title={
                <div>
                  <h4 className="text-sm font-semibold text-gray-800">
                    Índice {selectedGroup.label}
                  </h4>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {normalizedSearch
                      ? `${groupedAnimals.length} de ${selectedGroup.items.length}`
                      : groupedAnimals.length}{' '}
                    hembra{groupedAnimals.length === 1 ? '' : 's'} en este grupo.
                  </p>
                </div>
              }
              toolbar={
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBin(null)
                    setTableSearch('')
                  }}
                  className="min-h-11 rounded-lg px-3 text-sm font-medium text-gray-600 outline-none hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-green-600 sm:min-h-8"
                >
                  Cerrar grupo
                </button>
              }
              onView={(item) => {
                const animal = animalById.get(item.femaleId)
                if (!animal) return null
                return (
                  <ModalAnimalDetails
                    animal={animal}
                    triggerComponent={
                      <button
                        type="button"
                        className="min-h-11 rounded-md px-2 font-semibold text-green-700 outline-none hover:bg-green-100 focus-visible:ring-2 focus-visible:ring-green-600 md:min-h-8"
                        aria-label={`Abrir ficha de la hembra ${item.animalNumber}`}
                      >
                        Ver
                      </button>
                    }
                  />
                )
              }}
            />
          </div>
        </div>
      ) : (
        <p className="py-5 text-center text-sm text-gray-500">
          Selecciona una barra para ver las hembras de ese grupo.
        </p>
      )}

      <p className="mt-3 text-[11px] leading-4 text-gray-400">
        Índice histórico anualizado desde la edad reproductiva. Las crías cuentan al registrarse su
        destete; el selector de periodo superior no modifica este indicador.
      </p>
    </section>
  )
}

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

const getXAxisInterval = (points: number) => {
  if (points <= 6) return 0
  if (points <= 12) return 1
  return 2
}

const chartTooltipStyle = {
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  boxShadow: '0 8px 24px rgb(15 23 42 / 0.10)',
  fontSize: '12px',
}

const SalesLineChart: React.FC<{ data: MonthlySalesPoint[] }> = ({ data }) => (
  <div className="w-full min-w-0" role="img" aria-label="Ventas mensuales en kilos e ingresos">
    <div className="h-72 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 10, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="key"
            tickFormatter={monthKeyLabel}
            tick={{ fontSize: 11 }}
            interval={getXAxisInterval(data.length)}
          />
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
            dot={data.length <= 12 ? { r: 4, fill: '#fff', strokeWidth: 2 } : false}
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="amount"
            type="monotone"
            dataKey="amount"
            name="Ingresos"
            stroke="#16a34a"
            strokeWidth={3}
            dot={data.length <= 12 ? { r: 4, fill: '#fff', strokeWidth: 2 } : false}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
)

const PriceLineChart: React.FC<{ data: MonthlySalesPoint[] }> = ({ data }) => (
  <div className="w-full min-w-0" role="img" aria-label="Precio promedio mensual por kilo">
    <div className="h-56 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="key"
            tickFormatter={monthKeyLabel}
            tick={{ fontSize: 11 }}
            interval={getXAxisInterval(data.length)}
          />
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
            dot={data.length <= 12 ? { r: 4, fill: '#fff', strokeWidth: 2 } : false}
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
    className="w-full min-w-0"
    role="img"
    aria-label="Nacimientos, muertes, gestaciones y montas fallidas por mes"
  >
    <div className="h-80 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="key"
            tickFormatter={monthKeyLabel}
            tick={{ fontSize: 11 }}
            interval={getXAxisInterval(data.length)}
          />
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
            name="Gestaciones"
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
  const monthKeys = useMemo(() => new Set(months.map((month) => month.key)), [months])
  const periodLabel =
    period === 6 ? 'Últimos 6 meses' : period === 12 ? 'Último año' : 'Últimos 2 años'

  // ── Ventas ──
  const salesStats = useMemo(() => {
    const completed = sales.filter(
      (sale) => sale.status === 'completed' && isDateInMonthBuckets(sale.date, monthKeys),
    )
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
  }, [sales, months, monthKeys, allAnimals])

  // ── Nacimientos ──
  const birthStats = useMemo(() => {
    const byMonth = new Map<string, number>()
    for (const m of months) byMonth.set(m.key, 0)

    let totalBirths = 0
    for (const b of breedings) {
      for (const f of b.femaleBreedingInfo) {
        if (f.actualBirthDate && isDateInMonthBuckets(f.actualBirthDate, monthKeys)) {
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
        if (
          f.actualBirthDate &&
          isDateInMonthBuckets(f.actualBirthDate, monthKeys) &&
          f.offspring
        ) {
          for (const id of f.offspring) offspringIds.add(id)
        }
      }
    }
    const alive = animals.filter(
      (a) => offspringIds.has(a.id) && (a.status ?? 'activo') === 'activo',
    ).length
    const survivalRate = offspringIds.size > 0 ? (alive / offspringIds.size) * 100 : 0

    return { byMonth, totalBirths, survivalRate }
  }, [breedings, animals, months, monthKeys])

  // ── Muertes ──
  const deathStats = useMemo(() => {
    const byMonth = new Map<string, number>()
    for (const m of months) byMonth.set(m.key, 0)

    const dead = animals.filter(
      (animal) => animal.status === 'muerto' && isDateInMonthBuckets(animal.statusAt, monthKeys),
    )
    for (const a of dead) {
      if (a.statusAt) {
        const d = new Date(a.statusAt)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        const val = byMonth.get(key)
        if (val !== undefined) byMonth.set(key, val + 1)
      }
    }

    return { byMonth, total: dead.length }
  }, [animals, months, monthKeys])

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

  const femaleProductivityRanking = useMemo(
    () => calculateFemaleProductivityRanking(animals, breedings),
    [animals, breedings],
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
            Ventas y movimientos corresponden al periodo elegido; el inventario muestra su estado
            actual.
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
              className={`min-h-11 flex-1 rounded-md px-3 text-sm font-medium transition-colors sm:flex-none ${
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
          <p className="text-xs text-gray-500">Animales activos · Actual</p>
          <p className="text-2xl font-bold text-gray-900">{weightStats.activeCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">Listos para venta · Actual</p>
          <p className="text-2xl font-bold text-gray-900">
            {animals.filter(isAvailableToSale).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">Ventas completadas · {periodLabel}</p>
          <p className="text-2xl font-bold text-gray-900">{salesStats.count}</p>
          <p className="text-xs text-green-600 font-medium">
            {formatPrice(salesStats.totalAmount)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">Nacimientos · {periodLabel}</p>
          <p className="text-2xl font-bold text-gray-900">{birthStats.totalBirths}</p>
          <p className="text-xs text-blue-600 font-medium">
            {birthStats.survivalRate.toFixed(0)}% supervivencia
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">Muertes · {periodLabel}</p>
          <p className="text-2xl font-bold text-gray-900">{deathStats.total}</p>
        </div>
      </div>

      {/* KPIs ventas */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-1">
          <h3 className="text-sm font-medium text-gray-700">Resumen de ventas</h3>
          <p className="text-xs text-gray-500">{periodLabel}</p>
        </div>
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
          Nacimientos, muertes, gestaciones confirmadas y montas diagnosticadas sin gestación.
        </p>
        <ActivityLineChart data={monthlyActivityData} />
      </div>

      <FemaleProductivitySection ranking={femaleProductivityRanking} animals={animals} />

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
