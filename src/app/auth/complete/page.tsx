'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import LoadingSpinner from '@/components/LoadingSpinner'

/**
 * Página para completar la autenticación por enlace de email
 */
export default function CompleteAuthPage() {
  const router = useRouter()
  const { completeEmailLinkSignIn, isEmailLinkSignIn } = useAuth()
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>(
    'loading'
  )
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const completeSignIn = async () => {
      try {
        const url = window.location.href

        // Verificar si es un enlace válido de autenticación
        if (!isEmailLinkSignIn(url)) {
          setStatus('error')
          setErrorMessage('Enlace de autenticación inválido')
          return
        }

        // Obtener el email del localStorage
        let email = window.localStorage.getItem('emailForSignIn')

        // Si no hay email en localStorage, pedirlo al usuario
        if (!email) {
          email = window.prompt(
            'Por favor confirma tu dirección de email para completar el inicio de sesión'
          )
        }

        if (!email) {
          setStatus('error')
          setErrorMessage('Email requerido para completar la autenticación')
          return
        }

        // Completar la autenticación
        await completeEmailLinkSignIn(email, url)

        setStatus('success')

        // Redirigir al dashboard después de 2 segundos
        setTimeout(() => {
          router.push('/')
        }, 2000)
      } catch (error) {
        console.error('Error completing email link sign in:', error)
        setStatus('error')
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Error al completar la autenticación'
        )
      }
    }

    completeSignIn()
  }, [completeEmailLinkSignIn, isEmailLinkSignIn, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <span className="text-6xl">🐄</span>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
            Mi Granja
          </h2>

          {status === 'loading' && (
            <div className="space-y-4">
              <LoadingSpinner text="Completando autenticación..." />
              <p className="text-gray-600">
                Verificando tu enlace de autenticación
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    ></path>
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                ¡Autenticación exitosa!
              </h3>
              <p className="text-gray-600">
                Serás redirigido automáticamente...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    ></path>
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                Error de autenticación
              </h3>
              <p className="text-red-600 text-sm">{errorMessage}</p>
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/')}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                >
                  Volver al inicio
                </button>
                <p className="text-xs text-gray-500">
                  Si continúas teniendo problemas, solicita un nuevo enlace de
                  autenticación
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
