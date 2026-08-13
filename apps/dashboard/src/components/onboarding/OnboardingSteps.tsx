import React from 'react'

interface Step {
  emoji: string
  title: string
  description: string
  action: string
}

const STEPS: Step[] = [
  {
    emoji: '🐄',
    title: 'Crea tus animales',
    description:
      'Registra cada animal de tu granja con sus datos básicos: arete, raza, sexo y fecha de nacimiento.',
    action: 'Animales → Nuevo animal',
  },
  {
    emoji: '💕',
    title: 'Agrégalos a un empadre (monta)',
    description:
      'Crea un empadre con un macho y agrega las hembras que vayan con él. Puedes tener varias hembras en un mismo empadre.',
    action: 'Etapas → Empadre',
  },
  {
    emoji: '🤰',
    title: 'Marca gestaciones o saca animales del empadre',
    description:
      'Espera los tiempos adecuados. Confirma qué hembras están gestantes o retira a las que no quedaron para liberar al macho.',
    action: 'Etapas → Empadre o Gestantes',
  },
  {
    emoji: '🍼',
    title: 'Registra el parto',
    description:
      'Cuando nazca la cría, registra el parto desde el empadre. Las crías se agregan automáticamente a tu inventario.',
    action: 'Etapas → Gestantes',
  },
  {
    emoji: '🌾',
    title: 'Desteta y mueve a la etapa correspondiente',
    description:
      'Al destetar, mueve cada animal a su etapa: reproducción si quieres conservarlo, engorda si va para venta.',
    action: 'Etapas → Crías',
  },
  {
    emoji: '📈',
    title: 'Registra sus progresos',
    description:
      'Lleva el seguimiento de pesos, vacunas, tratamientos y eventos importantes de cada animal.',
    action: 'Ficha del animal → Registros',
  },
]

interface OnboardingStepsProps {
  variant?: 'compact' | 'cards'
}

const OnboardingSteps: React.FC<OnboardingStepsProps> = ({ variant = 'compact' }) => {
  if (variant === 'compact') {
    return (
      <ol className="space-y-3">
        {STEPS.map((step, idx) => (
          <li key={step.title} className="flex gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-800">
              {idx + 1}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-gray-900">
                <span className="mr-1.5" aria-hidden="true">
                  {step.emoji}
                </span>
                {step.title}
              </h3>
              <p className="mt-0.5 text-sm text-gray-600">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    )
  }

  return (
    <ol className="relative grid gap-3 before:absolute before:bottom-6 before:left-[23px] before:top-6 before:w-px before:bg-green-200 sm:grid-cols-2 sm:before:hidden">
      {STEPS.map((step, idx) => (
        <li
          key={step.title}
          className="relative flex gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4"
        >
          <div className="relative z-10 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border-4 border-white bg-green-100 text-sm font-bold text-green-900 shadow-sm">
            {idx + 1}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <span aria-hidden="true" className="text-xl leading-6">
                {step.emoji}
              </span>
              <h4 className="text-base font-bold leading-6 text-slate-950">{step.title}</h4>
            </div>
            <p className="mt-1 text-sm leading-5 text-slate-600">{step.description}</p>
            <p className="mt-2 text-xs font-semibold text-green-800">Dónde: {step.action}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

export default OnboardingSteps
