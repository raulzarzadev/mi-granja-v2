import React from 'react'

interface Step {
  emoji: string
  title: string
  description: string
}

const STEPS: Step[] = [
  {
    emoji: '🐄',
    title: 'Crea tus animales',
    description:
      'Registra cada animal de tu granja con sus datos básicos: arete, raza, sexo y fecha de nacimiento.',
  },
  {
    emoji: '💕',
    title: 'Agrégalos a un empadre (monta)',
    description:
      'Crea un empadre con un macho y agrega las hembras que vayan con él. Puedes tener varias hembras en un mismo empadre.',
  },
  {
    emoji: '🤰',
    title: 'Marca embarazos o saca animales del empadre',
    description:
      'Espera los tiempos adecuados. Confirma las hembras preñadas o retira a las que no quedaron para liberar al macho.',
  },
  {
    emoji: '🍼',
    title: 'Registra el parto',
    description:
      'Cuando nazca la cría, registra el parto desde el empadre. Las crías se agregan automáticamente a tu inventario.',
  },
  {
    emoji: '🌾',
    title: 'Desteta y mueve a la etapa correspondiente',
    description:
      'Al destetar, mueve cada animal a su etapa: reproducción si quieres conservarlo, engorda si va para venta.',
  },
  {
    emoji: '📈',
    title: 'Registra sus progresos',
    description:
      'Lleva el seguimiento de pesos, vacunas, tratamientos y eventos importantes de cada animal.',
  },
]

const OnboardingSteps: React.FC = () => {
  return (
    <ol className="space-y-3">
      {STEPS.map((step, idx) => (
        <li key={step.title} className="flex gap-3">
          <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-green-100 text-green-800 font-semibold text-sm">
            {idx + 1}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">
              <span className="mr-1.5">{step.emoji}</span>
              {step.title}
            </h3>
            <p className="text-sm text-gray-600 mt-0.5">{step.description}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

export default OnboardingSteps
