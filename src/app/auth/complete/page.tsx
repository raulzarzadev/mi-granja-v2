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
  const [status, setStatus] = useState<
    'loading' | 'error' | 'success' | 'needEmail'
  >('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [hasAttemptedAuth, setHasAttemptedAuth] = useState(false)

  const handleManualEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailInput) return

    try {
      setStatus('loading')
      setHasAttemptedAuth(true) // Marcamos que ya intentamos la autenticación
      const url = window.location.href
      await completeEmailLinkSignIn(emailInput, url)
      setStatus('success')
      setTimeout(() => {
        router.push('/')
      }, 1500)
    } catch (error) {
      console.error('Error with manual email:', error)
      setStatus('error')
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Error al completar la autenticación con el email proporcionado'
      )
    }
  }

  useEffect(() => {
    // Evitar bucle infinito
    if (hasAttemptedAuth) return

    const completeSignIn = async () => {
      try {
        setHasAttemptedAuth(true)
        const url = window.location.href
        console.log('Complete auth page loaded with URL:', url)

        // Verificar si es un enlace válido de autenticación
        if (!isEmailLinkSignIn(url)) {
          console.log('Invalid email link')
          setStatus('error')
          setErrorMessage(
            'El enlace de autenticación no es válido o ha expirado.'
          )
          return
        }

        // Obtener el email del localStorage
        let email = window.localStorage.getItem('emailForSignIn')
        console.log('Email from localStorage:', email)

        // Debug: Mostrar todo el localStorage
        console.log('All localStorage keys:', Object.keys(localStorage))
        console.log('localStorage contents:', localStorage)

        // Si no hay email en localStorage, intentar extraerlo de los parámetros de la URL
        if (!email) {
          const urlParams = new URLSearchParams(window.location.search)
          email = urlParams.get('email')
          console.log('Email from URL params:', email)
          console.log('All URL params:', Array.from(urlParams.entries()))
        }

        // Como último recurso, intentar extraer el email del hash de la URL
        if (!email) {
          const hashParams = new URLSearchParams(
            window.location.hash.substring(1)
          )
          email = hashParams.get('email')
          console.log('Email from hash params:', email)
          console.log('All hash params:', Array.from(hashParams.entries()))
        }

        // Si aún no hay email, mostrar formulario para ingresarlo en lugar de error
        if (!email) {
          console.log('No email found in localStorage or URL params')
          setStatus('needEmail')
          return
        }

        console.log('Proceeding with email:', email)
        // Completar la autenticación
        await completeEmailLinkSignIn(email, url)

        setStatus('success')

        // Redirigir al dashboard inmediatamente
        setTimeout(() => {
          router.push('/')
        }, 1500)
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
  }, [hasAttemptedAuth, completeEmailLinkSignIn, isEmailLinkSignIn, router])

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
              <p className="text-gray-600">Redirigiendo a tu dashboard...</p>
            </div>
          )}

          {status === 'needEmail' && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    ></path>
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                Confirma tu email
              </h3>
              <p className="text-gray-600 text-sm">
                No pudimos recuperar automáticamente tu dirección de email. Por
                favor confírmala para completar la autenticación.
              </p>
              <form onSubmit={handleManualEmailSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Correo electrónico
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    placeholder="tu@email.com"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                >
                  Completar autenticación
                </button>
              </form>
              <button
                onClick={() => router.push('/auth')}
                className="w-full text-gray-600 text-sm hover:text-gray-800"
              >
                Solicitar nuevo enlace
              </button>
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
              <h3 className="text-xl font-semibold text-gray-900">Error</h3>
              <p className="text-red-600 text-sm">{errorMessage}</p>
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/auth')}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                >
                  Volver al login
                </button>
                <p className="text-xs text-gray-500">
                  Si continúas teniendo problemas, solicita un nuevo enlace de
                  autenticación desde la página de login
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
