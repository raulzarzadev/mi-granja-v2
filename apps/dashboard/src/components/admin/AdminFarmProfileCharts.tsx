import type { FarmProfileStats, ProfileBreakdownItem } from '@/lib/admin/farm-profile-stats'

function BreakdownChart({
  title,
  items,
  colorClass,
  emptyMessage,
}: {
  title: string
  items: ProfileBreakdownItem[]
  colorClass: string
  emptyMessage: string
}) {
  const max = Math.max(1, ...items.map((item) => item.count))

  return (
    <figure className="rounded-xl border border-slate-200 bg-white p-4">
      <figcaption className="font-semibold text-slate-900">{title}</figcaption>
      {items.length === 0 ? (
        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-5 text-center text-sm text-slate-500">
          {emptyMessage}
        </p>
      ) : (
        <ol className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.key}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium text-slate-700">{item.label}</span>
                <span className="shrink-0 font-semibold tabular-nums text-slate-900">
                  {item.count}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${colorClass}`}
                  style={{ width: `${Math.max(4, (item.count / max) * 100)}%` }}
                  aria-hidden="true"
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </figure>
  )
}

export default function AdminFarmProfileCharts({ stats }: { stats: FarmProfileStats }) {
  return (
    <section aria-labelledby="farm-profile-stats-title" className="space-y-5">
      <div>
        <h2 id="farm-profile-stats-title" className="text-lg font-semibold text-slate-900">
          Perfil de las granjas
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Respuestas del onboarding. Los objetivos y especies permiten selección múltiple.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Granjas activas</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stats.totalFarms}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-medium text-emerald-800">Con perfil</p>
          <p className="mt-1 text-2xl font-bold text-emerald-950">{stats.profiledFarms}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-medium text-amber-800">Sin perfil</p>
          <p className="mt-1 text-2xl font-bold text-amber-950">{stats.missingProfiles}</p>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
          <p className="text-xs font-medium text-sky-800">Cobertura</p>
          <p className="mt-1 text-2xl font-bold text-sky-950">{stats.coveragePercent}%</p>
        </div>
      </div>

      {stats.profiledFarms === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
          <p className="font-semibold text-slate-800">Todavía no hay perfiles productivos</p>
          <p className="mt-1 text-sm text-slate-500">
            Aparecerán cuando se creen granjas con el nuevo onboarding.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BreakdownChart
            title="Tipo de granja"
            items={stats.activities}
            colorClass="bg-emerald-600"
            emptyMessage="Sin tipos registrados"
          />
          <BreakdownChart
            title="Objetivos productivos"
            items={stats.purposes}
            colorClass="bg-amber-500"
            emptyMessage="Sin objetivos ganaderos registrados"
          />
          <BreakdownChart
            title="Especies declaradas"
            items={stats.species}
            colorClass="bg-sky-600"
            emptyMessage="Sin especies registradas"
          />
          <BreakdownChart
            title="Tipos de cultivo"
            items={stats.crops}
            colorClass="bg-lime-600"
            emptyMessage="Sin cultivos registrados"
          />
          <BreakdownChart
            title="País"
            items={stats.countries}
            colorClass="bg-indigo-500"
            emptyMessage="Sin países registrados"
          />
        </div>
      )}
    </section>
  )
}
