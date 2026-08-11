'use client'

import React, { useState } from 'react'
import { Modal } from '../Modal'
import OnboardingSteps from './OnboardingSteps'
import StageGuidePage from './StageGuidePage'

interface ModalOnboardingProps {
  isOpen: boolean
  onClose: () => void
}

type OnboardingPage = 'pasos' | 'etapas'

const TABS: { key: OnboardingPage; label: string; description: string; icon: string }[] = [
  {
    key: 'pasos',
    label: 'Cómo empezar',
    description: 'La ruta recomendada',
    icon: '🚀',
  },
  {
    key: 'etapas',
    label: 'Etapas y condiciones',
    description: 'Cómo se clasifican',
    icon: '🐄',
  },
]

const ModalOnboarding: React.FC<ModalOnboardingProps> = ({ isOpen, onClose }) => {
  const [page, setPage] = useState<OnboardingPage>('pasos')

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Guía rápida de Mi Granja"
      size="xl"
      contentClassName="sm:p-5"
    >
      <nav
        aria-label="Secciones de la guía"
        className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5"
      >
        {TABS.map((t) => {
          const active = page === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setPage(t.key)}
              aria-pressed={active}
              className={`flex min-h-14 items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 ${
                active
                  ? 'bg-white text-green-800 shadow-sm'
                  : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
              }`}
            >
              <span aria-hidden="true" className="text-xl sm:text-2xl">
                {t.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold sm:text-base">{t.label}</span>
                <span className="hidden text-xs font-normal text-slate-500 sm:block">
                  {t.description}
                </span>
              </span>
            </button>
          )
        })}
      </nav>

      {page === 'pasos' && (
        <section>
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-green-700">
              De tu primer animal al seguimiento diario
            </p>
            <h3 className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">
              Empieza con esta ruta
            </h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              No necesitas configurar todo de una vez. Registra tus animales y avanza conforme
              ocurran los eventos en la granja.
            </p>
          </div>
          <OnboardingSteps variant="cards" />
        </section>
      )}

      {page === 'etapas' && (
        <section>
          <StageGuidePage />
        </section>
      )}
    </Modal>
  )
}

export default ModalOnboarding
