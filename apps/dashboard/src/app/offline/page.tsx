'use client'

import type { Metadata } from 'next'

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">📡</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Sin conexión a internet</h1>
        <p className="text-gray-600 mb-6">
          No se puede conectar al servidor. Verifica tu conexión a internet e intenta de nuevo.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>
  )
}
