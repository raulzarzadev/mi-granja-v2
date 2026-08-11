import React from 'react'

const developmentStages = [
  {
    icon: '🐣',
    name: 'Cría',
    detail: 'Desde el nacimiento hasta registrar su destete.',
    tone: 'border-amber-200 bg-amber-50 text-amber-950',
  },
  {
    icon: '🌱',
    name: 'Juvenil',
    detail: 'Etapa automática mientras alcanza la edad reproductiva.',
    tone: 'border-teal-200 bg-teal-50 text-teal-950',
  },
] as const

const destinations = [
  {
    icon: '🌾',
    name: 'Engorda',
    detail: 'Cuando su destino productivo es crecimiento o venta.',
    tone: 'border-orange-200 bg-orange-50 text-orange-950',
  },
  {
    icon: '❤️',
    name: 'Reproductor',
    detail: 'Cuando se conservará para reproducción.',
    tone: 'border-rose-200 bg-rose-50 text-rose-950',
  },
] as const

const conditions = [
  {
    icon: '🐂',
    name: 'Empadre',
    detail: 'Está participando en una monta activa.',
  },
  {
    icon: '🤰',
    name: 'Embarazo',
    detail: 'La preñez ya fue confirmada.',
  },
  {
    icon: '🥛',
    name: 'Madre / Lechera',
    detail: 'Tiene una lactancia activa para crías, leche o ambos.',
  },
] as const

const StageGuidePage: React.FC = () => {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-green-700">
          Dos conceptos fáciles
        </p>
        <h3 className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">
          Desarrollo y condición actual
        </h3>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
          La <strong>etapa</strong> indica cómo va creciendo el animal. La{' '}
          <strong>condición</strong> describe lo que está pasando en su ciclo reproductivo.
        </p>
      </header>

      <section aria-labelledby="development-title">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 font-bold text-green-800">
            1
          </span>
          <div>
            <h4 id="development-title" className="font-bold text-slate-950">
              Etapa de desarrollo
            </h4>
            <p className="text-xs text-slate-500">Sigue una ruta principal</p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-stretch">
          {developmentStages.map((stage, index) => (
            <React.Fragment key={stage.name}>
              <article className={`rounded-2xl border p-3.5 ${stage.tone}`}>
                <p className="text-xl" aria-hidden="true">
                  {stage.icon}
                </p>
                <h5 className="mt-1 font-bold">{stage.name}</h5>
                <p className="mt-1 text-sm leading-5 opacity-80">{stage.detail}</p>
              </article>
              {index === 0 && (
                <div
                  className="flex min-h-9 items-center justify-center text-green-700"
                  aria-hidden="true"
                >
                  <span className="sm:hidden">↓</span>
                  <span className="hidden sm:inline">→</span>
                </div>
              )}
            </React.Fragment>
          ))}

          <div
            className="flex min-h-9 items-center justify-center text-green-700"
            aria-hidden="true"
          >
            <span className="sm:hidden">↓</span>
            <span className="hidden sm:inline">→</span>
          </div>

          <div className="grid gap-2">
            {destinations.map((stage) => (
              <article key={stage.name} className={`rounded-2xl border p-3 ${stage.tone}`}>
                <h5 className="font-bold">
                  <span aria-hidden="true">{stage.icon}</span> {stage.name}
                </h5>
                <p className="mt-1 text-xs leading-5 opacity-80">{stage.detail}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-3 text-sm leading-5 text-green-950">
          <strong>La app te ayuda:</strong> después del destete, “Juvenil” se calcula por la edad.
          Tú sólo decides si el destino será Engorda o Reproducción.
        </div>
      </section>

      <section aria-labelledby="condition-title" className="border-t border-slate-200 pt-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-800">
            2
          </span>
          <div>
            <h4 id="condition-title" className="font-bold text-slate-950">
              Condición reproductiva
            </h4>
            <p className="text-xs text-slate-500">Puede cambiar o combinarse</p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {conditions.map((condition, index) => (
            <article
              key={condition.name}
              className="relative rounded-2xl border border-blue-200 bg-blue-50 p-3.5 text-blue-950"
            >
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="text-xl">
                  {condition.icon}
                </span>
                <h5 className="font-bold">{condition.name}</h5>
              </div>
              <p className="mt-1 text-sm leading-5 text-blue-900/80">{condition.detail}</p>
              {index < conditions.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute -right-4 top-1/2 z-10 hidden -translate-y-1/2 text-blue-500 sm:block"
                >
                  →
                </span>
              )}
            </article>
          ))}
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-sm leading-5 text-cyan-950">
            <strong>Puede coexistir:</strong> una Madre/Lechera también puede estar embarazada.
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-5 text-slate-700">
            <strong>Madre/Lechera:</strong> requiere fecha de nacimiento y último parto para evitar
            clasificaciones incorrectas.
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-slate-900 p-4 text-white sm:flex sm:items-center sm:justify-between sm:gap-5">
        <div>
          <h4 className="font-bold">En resumen</h4>
          <p className="mt-1 text-sm leading-5 text-slate-300">
            Etapa = crecimiento. Condición = situación reproductiva actual.
          </p>
        </div>
        <p className="mt-3 text-sm font-semibold text-green-300 sm:mt-0 sm:text-right">
          Cría → Juvenil → Engorda o Reproductor
        </p>
      </section>
    </div>
  )
}

export default StageGuidePage
