import React from 'react'
import { EmojiIcon } from '@/components/Icon/emoji-icons'
import { ANIMAL_BREEDING_CONFIGS } from '@/lib/animalBreedingConfig'
import {
  animal_icon,
  animal_stage_config,
  animal_stage_descriptions,
  animals_stages,
  animals_types,
  animals_types_labels,
} from '@/types/animals'

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
    name: 'Gestación',
    detail: 'La gestación ya fue confirmada.',
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

      <section aria-labelledby="default-stages-title">
        <h4 id="default-stages-title" className="text-lg font-bold text-slate-950">
          Etapas por defecto de cada especie
        </h4>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Abre una especie para consultar sus etapas y edades de referencia. Al registrar un animal,
          la fecha de nacimiento y el género determinan las opciones disponibles.
        </p>
        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {animals_types.map((type) => {
            const config = ANIMAL_BREEDING_CONFIGS[type]
            const ages = {
              cria:
                config.weaningDays > 0
                  ? `Desde el nacimiento hasta ${config.weaningDays} días`
                  : 'Desde el nacimiento, según su desarrollo',
              juvenil: `Después del destete y antes de ${config.minBreedingAge} meses`,
              engorda: 'Destino productivo después del destete',
              reproductor: `Desde ${config.minBreedingAge} meses`,
              descarte: 'Sin una edad fija; se asigna según el caso',
            }
            return (
              <details key={type} className="group px-4 py-3 open:bg-green-50/40">
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 [&::-webkit-details-marker]:hidden">
                  <span aria-hidden="true" className="text-xl text-green-800">
                    <EmojiIcon emoji={animal_icon[type]} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-slate-900">
                      {animals_types_labels[type]}
                    </span>
                    <span className="block text-xs leading-5 text-slate-500">
                      Reproducción desde {config.minBreedingAge} meses
                      {config.weaningDays > 0
                        ? ` · Destete de referencia: ${config.weaningDays} días`
                        : ''}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="text-lg text-green-700 transition-transform group-open:rotate-45 motion-reduce:transition-none"
                  >
                    +
                  </span>
                </summary>
                <ul className="mt-3 space-y-3 pb-1">
                  {animals_stages.map((stage) => (
                    <li key={stage} className="flex items-start gap-3 text-sm">
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${animal_stage_config[stage].color}`}
                      >
                        <EmojiIcon emoji={animal_stage_config[stage].icon} />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">
                          {animal_stage_config[stage].label}
                        </p>
                        <p className="text-xs font-medium leading-5 text-green-800">
                          {ages[stage]}
                        </p>
                        <p className="text-xs leading-5 text-slate-600">
                          {animal_stage_descriptions[stage].description}
                        </p>
                        {stage === 'reproductor' && (
                          <dl className="mt-2 space-y-1 text-xs leading-5 text-slate-600">
                            <div>
                              <dt className="inline font-semibold text-slate-800">
                                {type === 'gallina'
                                  ? 'Promedio por ciclo: '
                                  : 'Promedio por parto: '}
                              </dt>
                              <dd className="inline">
                                {config.averageLitterSize.toLocaleString('es-MX')}{' '}
                                {type === 'gallina' ? 'huevos por hembra' : 'crías por hembra'}
                                {type === 'otro' ? ' (configuración genérica)' : ' como referencia'}
                                .
                              </dd>
                            </div>
                            <div>
                              <dt className="inline font-semibold text-slate-800">
                                Edad y desarrollo:{' '}
                              </dt>
                              <dd className="inline">
                                {animal_stage_descriptions.reproductor.speciesInfo?.[type] ??
                                  `Desde ${config.minBreedingAge} meses; ajustar según la especie`}
                                .
                              </dd>
                            </div>
                            <div>
                              <dt className="inline font-semibold text-slate-800">
                                {type === 'gallina' ? 'Incubación: ' : 'Gestación: '}
                              </dt>
                              <dd className="inline">{config.gestationDays} días de referencia.</dd>
                            </div>
                          </dl>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </details>
            )
          })}
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Estas referencias no registran eventos automáticamente. Gestación, empadre y lactancia se
          confirman por separado; la fecha exacta de destete puede dejarse vacía si no se conoce.
        </p>
      </section>

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
                  <EmojiIcon emoji={stage.icon} />
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
                  <span aria-hidden="true">
                    <EmojiIcon emoji={stage.icon} />
                  </span>{' '}
                  {stage.name}
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
                  <EmojiIcon emoji={condition.icon} />
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
            <strong>Puede coexistir:</strong> una Madre/Lechera también puede estar gestante.
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
