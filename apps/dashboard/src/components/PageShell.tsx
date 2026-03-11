'use client'

import React from 'react'
import { useSelector } from 'react-redux'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { RootState } from '@/features/store'

/**
 * Shell para paginas internas autenticadas.
 * Muestra Navbar + contenido centrado con boton de volver.
 */
const PageShell: React.FC<{
  title: string
  children: React.ReactNode
}> = ({ title, children }) => {
  const router = useRouter()
  const { user } = useSelector((state: RootState) => state.auth)

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto" />
      </div>
    )
  }

  if (user === null) {
    router.replace('/')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors text-gray-600"
            title="Volver"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path
                fillRule="evenodd"
                d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        </div>
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">{children}</div>
      </div>
    </div>
  )
}

export default PageShell
