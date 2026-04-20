'use client'

import React, { useEffect, useState } from 'react'
import OnboardingSteps from './OnboardingSteps'

const STORAGE_KEY = 'onboarding:dismissed:v1'

const OnboardingCard: React.FC = () => {
  const [dismissed, setDismissed] = useState<boolean | null>(null)
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    setDismissed(localStorage.getItem(STORAGE_KEY) === '1')
  }, [])

  if (dismissed !== false) return null

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setDismissed(true)
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0" aria-hidden="true">
          📘
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-green-900">Primeros pasos en Mi Granja</h4>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setExpanded((p) => !p)}
                className="text-xs text-green-800 hover:text-green-900 hover:bg-green-100 px-2 py-1 rounded cursor-pointer transition-colors"
                aria-expanded={expanded}
              >
                {expanded ? 'Ocultar' : 'Ver pasos'}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-green-700 hover:text-green-900 hover:bg-green-100 h-7 w-7 rounded flex items-center justify-center cursor-pointer transition-colors"
                aria-label="Cerrar guía"
                title="Cerrar guía"
              >
                ✕
              </button>
            </div>
          </div>
          <p className="text-sm text-green-800 mt-1">
            Sigue estos pasos para sacar el máximo provecho de la app.
          </p>
          {expanded && (
            <div className="mt-4">
              <OnboardingSteps />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default OnboardingCard
