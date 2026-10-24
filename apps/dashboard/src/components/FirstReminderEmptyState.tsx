'use client'

import Link from 'next/link'
import { PiBell, PiEnvelopeSimple, PiHouse, PiPlus } from 'react-icons/pi'

const HOW_IT_WORKS = [
  {
    icon: PiEnvelopeSimple,
    title: 'Te llega un email',
    text: 'Te avisamos por correo cuando llegue la fecha.',
  },
  {
    icon: PiHouse,
    title: 'Lo primero que ves',
    text: 'Al entrar a la app ese día, el recordatorio aparece primero.',
  },
  {
    icon: PiBell,
    title: 'En la campanita',
    text: 'Los pendientes quedan en las notificaciones hasta que los completes.',
  },
]

/**
 * Estado vacío de Recordatorios: la granja aún no tiene recordatorios.
 */
const FirstReminderEmptyState: React.FC = () => (
  <section
    aria-labelledby="first-reminder-title"
    className="relative overflow-hidden rounded-[2rem] border border-green-200 bg-[#fbfdf8] px-5 py-8 shadow-sm sm:px-8 sm:py-10 lg:px-12"
  >
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-green-100/70"
    />
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -bottom-20 -left-16 h-52 w-52 rounded-full border-[28px] border-amber-100/60"
    />

    <div className="relative mx-auto max-w-3xl text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-700 text-white shadow-[0_8px_0_#bbf7d0] sm:h-20 sm:w-20">
        <PiBell aria-hidden className="h-8 w-8 sm:h-10 sm:w-10" />
      </div>
      <p className="mt-7 text-sm font-bold uppercase tracking-[0.18em] text-green-800">
        Que no se te pase nada
      </p>
      <h2
        id="first-reminder-title"
        className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
      >
        Agrega tu primer recordatorio
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
        Vacunas, desparasitaciones, pesajes o cualquier tarea de la granja. Llegado el momento te
        avisamos.
      </p>

      <div className="mt-7 flex justify-center">
        <Link
          href="/recordatorio/nuevo"
          className="group flex min-h-16 w-full max-w-sm items-center justify-center gap-3 rounded-2xl bg-green-700 px-5 py-3 text-white shadow-[0_6px_0_#14532d] transition-[transform,box-shadow,background-color] hover:-translate-y-0.5 hover:bg-green-800 hover:shadow-[0_8px_0_#14532d] active:translate-y-1 active:shadow-[0_2px_0_#14532d] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-300 focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
        >
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20"
          >
            <PiPlus className="h-5 w-5" />
          </span>
          <span className="text-base font-bold sm:text-lg">Agregar recordatorio</span>
        </Link>
      </div>

      <ul className="mt-10 grid gap-3 border-t border-green-200/80 pt-8 text-left sm:grid-cols-3">
        {HOW_IT_WORKS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-3 rounded-2xl bg-white/70 p-4 ring-1 ring-green-100">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
              <Icon aria-hidden className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-semibold text-slate-900">{title}</span>
              <span className="mt-0.5 block text-sm leading-5 text-slate-600">{text}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  </section>
)

export default FirstReminderEmptyState
