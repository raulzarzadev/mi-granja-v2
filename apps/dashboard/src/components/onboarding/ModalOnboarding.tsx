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

const TABS: { key: OnboardingPage; label: string; icon: string }[] = [
  { key: 'pasos', label: 'Primeros pasos', icon: '🚀' },
  { key: 'etapas', label: 'Etapas del animal', icon: '🧬' },
]

const ModalOnboarding: React.FC<ModalOnboardingProps> = ({ isOpen, onClose }) => {
  const [page, setPage] = useState<OnboardingPage>('pasos')

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Primeros pasos en Mi Granja" size="lg">
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {TABS.map((t) => {
          const active = page === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setPage(t.key)}
              aria-selected={active}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer hover:text-green-700 ${
                active
                  ? 'border-green-600 text-green-700'
                  : 'border-transparent text-gray-500 hover:border-gray-300'
              }`}
            >
              <span className="mr-1.5">{t.icon}</span>
              {t.label}
            </button>
          )
        })}
      </div>

      {page === 'pasos' && (
        <>
          <p className="text-sm text-gray-600 mb-4">
            Sigue este flujo para registrar y dar seguimiento a tu ganado.
          </p>
          <OnboardingSteps />
        </>
      )}

      {page === 'etapas' && <StageGuidePage />}
    </Modal>
  )
}

export default ModalOnboarding
