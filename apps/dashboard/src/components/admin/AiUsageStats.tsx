'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import LoadingSpinner from '@/components/LoadingSpinner'
import { auth } from '@/lib/firebase'

interface AiUsageStatsResponse {
  days: number
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

const PERIODS = [7, 30, 90] as const
const number = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 })
const money = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 4,
})

export default function AiUsageStats() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<AiUsageStatsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStatistics = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) throw new Error('La sesión de administrador no está disponible')
      const response = await fetch(`/api/admin/ai-usage?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar las estadísticas')
      setData(payload)
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'No se pudieron cargar las estadísticas',
      )
    } finally {
      setIsLoading(false)
    }
  }, [days])

  useEffect(() => {
    loadStatistics()
  }, [loadStatistics])

  const chartData = useMemo(
    () =>
      (data?.daily ?? []).map((item) => ({
        ...item,
        label: new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(
          new Date(`${item.date}T12:00:00`),
        ),
      })),
    [data?.daily],
  )

  return (
    <section
      aria-labelledby="ai-usage-title"
      className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5"
    >
      <div className="flex flex-col gap-3 border-b border-gray-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="ai-usage-title" className="text-lg font-bold text-gray-900">
            Uso del asistente
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Consultas exitosas realizadas por los usuarios. Los datos de proveedor y modelo se
            registran desde esta actualización.
          </p>
        </div>
        <div
          className="inline-flex self-start rounded-lg border border-gray-300 p-1"
          aria-label="Periodo de estadísticas"
        >
          {PERIODS.map((period) => (
            <button
              key={period}
              type="button"
              aria-pressed={days === period}
              onClick={() => setDays(period)}
              className={`min-h-10 rounded-md px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                days === period ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {period} días
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-72 items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={loadStatistics}
            className="mt-3 min-h-11 font-bold underline"
          >
            Reintentar
          </button>
        </div>
      ) : data && data.totals.queries > 0 ? (
        <>
          <dl className="grid grid-cols-2 border-b border-gray-200 py-4 lg:grid-cols-5">
            <Metric label="Consultas" value={number.format(data.totals.queries)} />
            <Metric label="Usuarios activos" value={number.format(data.totals.activeUsers)} />
            <Metric
              label="Promedio por usuario"
              value={number.format(data.totals.queriesPerUser)}
            />
            <Metric label="Tokens" value={number.format(data.totals.totalTokens)} />
            <Metric label="Costo reportado" value={money.format(data.totals.reportedCost)} />
          </dl>

          <div className="grid gap-6 border-b border-gray-200 py-5 lg:grid-cols-[minmax(0,2fr)_minmax(15rem,1fr)]">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-gray-900">Consultas por día</h3>
              <div
                className="mt-3 h-64 w-full"
                role="img"
                aria-label="Gráfica de consultas diarias al asistente"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={22} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ''}
                      formatter={(value, name) => [
                        number.format(Number(value)),
                        name === 'queries' ? 'Consultas' : name,
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="queries"
                      stroke="#16a34a"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Por proveedor</h3>
              <div className="mt-3 space-y-3">
                {data.providers.map((provider) => (
                  <UsageBar
                    key={provider.name}
                    label={provider.name}
                    value={provider.queries}
                    total={data.totals.queries}
                  />
                ))}
              </div>
              {data.models.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold text-gray-900">Modelos más usados</h3>
                  <ol className="mt-2 space-y-2 text-sm text-gray-700">
                    {data.models.slice(0, 5).map((model) => (
                      <li key={model.name} className="flex items-start justify-between gap-3">
                        <span className="min-w-0 break-all">{model.name}</span>
                        <span className="shrink-0 font-bold tabular-nums">{model.queries}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>

          <div className="pt-5">
            <h3 className="text-sm font-bold text-gray-900">Uso por usuario</h3>
            <p className="mt-1 text-xs text-gray-500">
              Ordenado por número de consultas en el periodo.
            </p>
            <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
                  <tr>
                    <th scope="col" className="px-3 py-2.5 font-semibold">
                      Usuario
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                      Consultas
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                      Tokens
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                      Costo reportado
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">
                      Último uso
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.users.map((user) => (
                    <tr key={user.userId} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5">
                        <p className="font-semibold text-gray-900">{user.name}</p>
                        {user.email && user.email !== user.name && (
                          <p className="text-xs text-gray-500">{user.email}</p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                        {number.format(user.queries)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-600">
                        {number.format(user.totalTokens)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-600">
                        {money.format(user.reportedCost)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-gray-600">
                        {formatDate(user.lastUsedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="py-12 text-center">
          <p className="font-semibold text-gray-900">Todavía no hay consultas en este periodo</p>
          <p className="mt-1 text-sm text-gray-600">
            Las nuevas conversaciones aparecerán aquí automáticamente.
          </p>
        </div>
      )}
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-gray-200 px-3 py-2 first:pl-0 lg:border-r lg:last:border-r-0">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-1 text-xl font-bold tabular-nums text-gray-900">{value}</dd>
    </div>
  )
}

function UsageBar({ label, value, total }: { label: string; value: number; total: number }) {
  const percentage = total > 0 ? Math.max(2, (value / total) * 100) : 0
  return (
    <div>
      <div className="flex justify-between gap-3 text-xs text-gray-700">
        <span className="capitalize">{label}</span>
        <span className="font-bold tabular-nums">{value}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}

function formatDate(value: string) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`))
}
