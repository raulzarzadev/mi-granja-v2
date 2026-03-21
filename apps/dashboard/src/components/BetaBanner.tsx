'use client'

import { useState } from 'react'

const FEEDBACK_EMAIL = 'contacto@migranja.app'

export function BetaBanner() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-sm text-amber-800">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <p>
          <span className="font-semibold">Mi Granja esta en fase de pruebas.</span>{' '}
          Algunas funciones pueden cambiar o no estar disponibles aun.{' '}
          <a
            href={`mailto:${FEEDBACK_EMAIL}?subject=Feedback%20Mi%20Granja`}
            className="underline font-medium hover:text-amber-900 transition-colors"
          >
            Enviar feedback o sugerencias
          </a>
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 p-1 rounded hover:bg-amber-100 transition-colors cursor-pointer"
          aria-label="Cerrar aviso"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
