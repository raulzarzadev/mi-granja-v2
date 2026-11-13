'use client'

import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '@/features/store'
import { auth } from '@/lib/firebase'

/** Respuesta pública de `/api/billing/ai-usage`. Solo valores visibles del plan. */
interface Usage {
  resetsAt?: string | null
  renewalCancelled?: boolean
  mode: 'daily' | 'credits'
  limit: number
  used: number
  remaining: number
  balanceUsd?: number
}

const TIME_ZONE = 'America/Mazatlan'
const TIME_ZONE_LABEL = 'hora de Mazatlán'

const dollars = (value: number) => `USD ${value.toFixed(2)}`
const queries = (value: number) => `${value} ${value === 1 ? 'consulta' : 'consultas'}`

function formatDate(iso: string, style: 'medium' | 'long') {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: style,
    timeStyle: 'short',
    timeZone: TIME_ZONE,
  }).format(date)
}

/** Valores ya derivados para pintar: una sola fuente para barra, cifras y textos. */
function describe(usage: Usage) {
  const credits = usage.mode === 'credits'
  const available = Math.max(0, credits ? (usage.balanceUsd ?? usage.remaining) : usage.remaining)
  const limit = Math.max(0, usage.limit)
  const used = Math.max(0, usage.used)
  const fraction = limit > 0 ? Math.min(1, available / limit) : 0
  const format = credits ? dollars : queries
  return {
    credits,
    available,
    fraction,
    exhausted: available <= 0,
    low: available > 0 && fraction <= 0.2,
    label: credits ? 'Créditos IA' : 'Consultas IA hoy',
    included: format(limit),
    usedText: format(used),
    availableText: format(available),
    // En la barra compacta basta el número; la unidad la da la etiqueta.
    shortAvailable: credits ? dollars(available) : String(available),
    shortLimit: credits ? dollars(limit) : String(limit),
  }
}

type Described = ReturnType<typeof describe>

function useAiUsage(refreshKey?: string) {
  const userId = useSelector((state: RootState) => state.auth.user?.id)
  const impersonateUid = useSelector((state: RootState) => state.auth.impersonatingUser?.id)
  const [usage, setUsage] = useState<Usage | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)

  // Otro usuario (o suplantación): no mostrar cifras del anterior.
  useEffect(() => {
    setUsage(null)
  }, [userId, impersonateUid])

  useEffect(() => {
    setError(false)
    if (!userId) return
    setLoading(true)
    const controller = new AbortController()
    async function load() {
      try {
        const token = await auth.currentUser?.getIdToken()
        if (!token) throw new Error('Sesión no disponible')
        const response = await fetch('/api/billing/ai-usage', {
          headers: {
            Authorization: `Bearer ${token}`,
            ...(impersonateUid ? { 'x-impersonate-uid': impersonateUid } : {}),
          },
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('No disponible')
        const data = await response.json()
        if (
          !['daily', 'credits'].includes(data?.mode) ||
          ![data.used, data.limit, data.remaining].every(
            (n) => typeof n === 'number' && Number.isFinite(n),
          )
        )
          throw new Error('Respuesta inválida')
        if (!controller.signal.aborted) setUsage(data)
      } catch {
        if (!controller.signal.aborted) setError(true)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [userId, impersonateUid, attempt, refreshKey])

  return { usage, error, loading, retry: () => setAttempt((value) => value + 1) }
}

function UsageBar({ d, className = 'h-1.5' }: { d: Described; className?: string }) {
  const color = d.exhausted || d.low ? 'bg-amber-500' : 'bg-green-600'
  return (
    // Decorativa: las cifras se leen en el texto adyacente.
    <div
      aria-hidden="true"
      className={`w-full overflow-hidden rounded-full bg-slate-200 ${className}`}
    >
      <div
        className={`h-full rounded-full transition-[width] ${color}`}
        style={{ width: `${Math.round(d.fraction * 100)}%` }}
      />
    </div>
  )
}

/** Incluido / Usado / Disponible + renovación + qué significa. Igual en chat y /plan. */
function UsageBreakdown({
  usage,
  d,
  dateStyle,
}: {
  usage: Usage
  d: Described
  dateStyle: 'medium' | 'long'
}) {
  const date = usage.resetsAt ? formatDate(usage.resetsAt, dateStyle) : null
  const cancelled = d.credits && usage.renewalCancelled === true
  const dateLabel = !d.credits ? 'Se reinician' : cancelled ? 'Fin del ciclo' : 'Próxima renovación'

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-900">
        {d.credits ? 'Tus créditos del asistente' : 'Tus consultas de hoy'}
      </p>
      <dl className="grid grid-cols-3 divide-x divide-slate-200 rounded-lg bg-slate-50 text-center">
        {[
          [d.credits ? 'Créditos del mes' : 'Límite diario', d.included, 'text-slate-900'],
          ['Has usado', d.usedText, 'text-slate-900'],
          ['Te quedan', d.availableText, d.exhausted ? 'text-amber-700' : 'text-green-700'],
        ].map(([term, value, tone]) => (
          <div key={term} className="min-w-0 px-2 py-2">
            <dt className="text-xs text-slate-500">{term}</dt>
            <dd className={`text-sm font-semibold tabular-nums ${tone}`}>{value}</dd>
          </div>
        ))}
      </dl>

      {date && usage.resetsAt && (
        <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <span className="mb-1 block text-xs text-slate-500">{dateLabel}: </span>
          <time dateTime={usage.resetsAt} className="font-medium">
            {date}
          </time>{' '}
          <span className="text-slate-500">({TIME_ZONE_LABEL})</span>
        </p>
      )}

      <ul className="list-disc space-y-1 pl-4 text-xs leading-5 text-slate-600">
        {d.credits ? (
          <>
            <li>
              Cada consulta descuenta créditos según su consumo. Son parte de tu plan: no son un
              cargo extra ni dinero que debas.
            </li>
            <li>
              {cancelled
                ? 'Cancelaste la renovación: puedes usar el saldo hasta el fin del ciclo y después no se agregan créditos nuevos.'
                : 'Con tu siguiente pago mensual se repone el crédito incluido en tu plan. El saldo que sobre no se suma al siguiente mes.'}
            </li>
          </>
        ) : (
          <li>
            Tu plan incluye {d.included} gratis por día.
            {!date && ` Se reinician a medianoche (${TIME_ZONE_LABEL}).`}
          </li>
        )}
      </ul>
    </div>
  )
}

function ExhaustedNotice({ d }: { d: Described }) {
  return (
    <p role="status" className="text-xs text-amber-800">
      {d.credits ? 'Usaste los créditos de este ciclo.' : 'Usaste tus consultas de hoy.'}{' '}
      <a href="/plan" className="font-semibold underline underline-offset-2 hover:text-amber-600">
        Ver planes
      </a>
    </p>
  )
}

/** Barra discreta para el panel del asistente; los detalles se despliegan a todo el ancho. */
function CompactUsage({ refreshKey }: { refreshKey?: string }) {
  const { usage, error, retry, loading } = useAiUsage(refreshKey)
  const [open, setOpen] = useState(false)

  if (!usage) {
    if (error)
      return (
        <div role="alert" className="flex shrink-0 items-center justify-between gap-2 px-1 text-xs">
          <span className="text-slate-600">No se pudo cargar tu consumo de IA.</span>
          <button
            type="button"
            onClick={retry}
            disabled={loading}
            className="min-h-11 shrink-0 cursor-pointer rounded-lg px-2 font-medium text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reintentar
          </button>
        </div>
      )
    return (
      <div role="status" className="shrink-0 px-1 py-2">
        <span className="sr-only">Cargando consumo de IA…</span>
        <div aria-hidden="true" className="h-1.5 animate-pulse rounded-full bg-slate-200" />
      </div>
    )
  }

  const d = describe(usage)
  return (
    <section aria-label="Consumo de IA" className="shrink-0 space-y-1 px-1">
      <details className="group w-full" onToggle={(event) => setOpen(event.currentTarget.open)}>
        <summary className="block w-full cursor-pointer list-none rounded-lg py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 [&::-webkit-details-marker]:hidden">
          <span className="flex items-baseline justify-between gap-3 text-xs">
            <span className="min-w-0 truncate text-slate-500">
              {d.label}:{' '}
              <span
                className={`font-semibold tabular-nums ${d.exhausted ? 'text-amber-700' : 'text-slate-800'}`}
              >
                {d.shortAvailable}
              </span>{' '}
              de {d.shortLimit} disponibles
            </span>
            <span className="flex shrink-0 items-center gap-1 font-medium text-green-700 group-hover:text-green-800">
              {open ? 'Ocultar detalles' : 'Ver detalles'}
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
              >
                <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
              </svg>
            </span>
          </span>
          <UsageBar d={d} className="mt-1.5 h-1.5" />
        </summary>
        <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3">
          <UsageBreakdown usage={usage} d={d} dateStyle="medium" />
          <a
            href="/plan"
            className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-green-700 underline underline-offset-2 hover:text-green-800"
          >
            Ver mi plan
          </a>
        </div>
      </details>
      {d.exhausted && !open && <ExhaustedNotice d={d} />}
    </section>
  )
}

/** Sección completa en /plan: mismas cifras y textos, sin desplegable. */
function FullUsage() {
  const { usage, error, retry, loading } = useAiUsage()
  const d = usage ? describe(usage) : null
  return (
    <section
      className="rounded-xl border border-gray-200 bg-white p-5"
      aria-labelledby="ai-usage-title"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="ai-usage-title" className="font-semibold text-gray-900">
          Asistente IA
        </h2>
        <button
          type="button"
          onClick={retry}
          disabled={loading}
          className="min-h-11 cursor-pointer rounded-lg px-2 text-sm text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>
      {error && !usage ? (
        <p role="alert" className="text-sm text-red-700">
          No se pudo cargar tu consumo de IA. Pulsa Actualizar para reintentar.
        </p>
      ) : !usage || !d ? (
        <div role="status" className="h-24 animate-pulse rounded-lg bg-gray-100">
          <span className="sr-only">Cargando consumo de IA…</span>
        </div>
      ) : (
        <div className="space-y-3">
          {error && (
            <p role="alert" className="text-xs text-red-700">
              No se pudo actualizar; se muestran los últimos datos cargados.
            </p>
          )}
          <p className="text-sm text-slate-600">
            {d.label}:{' '}
            <span
              className={`font-semibold tabular-nums ${d.exhausted ? 'text-amber-700' : 'text-slate-900'}`}
            >
              {d.shortAvailable}
            </span>{' '}
            de {d.shortLimit} disponibles
          </p>
          <UsageBar d={d} className="h-2" />
          <UsageBreakdown usage={usage} d={d} dateStyle="long" />
        </div>
      )}
    </section>
  )
}

export function AiPlanUsage({
  compact = false,
  refreshKey,
}: {
  compact?: boolean
  /** Cambia cuando el chat registra consumo: vuelve a consultar sin desmontar ni cerrar detalles. */
  refreshKey?: string
}) {
  return compact ? <CompactUsage refreshKey={refreshKey} /> : <FullUsage />
}
