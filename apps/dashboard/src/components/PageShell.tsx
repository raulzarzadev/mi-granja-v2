'use client'

import { useRouter } from 'next/navigation'
import React from 'react'
import { useSelector } from 'react-redux'
import Navbar from '@/components/Navbar'
import { RootState } from '@/features/store'

/**
 * Shell para paginas internas autenticadas.
 * Muestra Navbar + contenido centrado con boton de volver.
 */
const PageShell: React.FC<{
  title: string
  children: React.ReactNode
  backHref?: string
}> = ({ title, children, backHref }) => {
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
    <div className="@container/page min-h-screen min-w-0 bg-gray-50">
      <Navbar />
      <div className="w-full min-w-0 max-w-5xl mx-auto px-3 py-4 @[640px]/page:px-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => (backHref ? router.replace(backHref) : router.back())}
            className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors text-gray-600"
            title={backHref === '/' ? 'Volver al panel' : 'Volver'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-5 h-5"
            >
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
