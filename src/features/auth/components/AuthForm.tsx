'use client'

import React, { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

/**
 * Componente de login y registro
 * Interfaz simple y optimizada para móviles
 */
const AuthForm: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [authMethod, setAuthMethod] = useState<'password' | 'emailLink'>(
    'emailLink'
  )
  const [emailLinkSent, setEmailLinkSent] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    farmName: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  const { login, register, loginWithEmailLink } = useAuth()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))

    // Limpiar error del campo
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = (isPasswordAuth = true) => {
    const newErrors: Record<string, string> = {}

    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El email no es válido'
    }

    // Solo validar contraseña si estamos usando autenticación por contraseña
    if (isPasswordAuth) {
      if (!formData.password) {
        newErrors.password = 'La contraseña es requerida'
      } else if (formData.password.length < 6) {
        newErrors.password = 'La contraseña debe tener al menos 6 caracteres'
      }

      if (!isLogin) {
        if (!formData.confirmPassword) {
          newErrors.confirmPassword = 'Confirma tu contraseña'
        } else if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Las contraseñas no coinciden'
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm(authMethod === 'password')) {
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      if (isLogin) {
        if (authMethod === 'password') {
          await login(formData.email, formData.password)
        } else {
          await loginWithEmailLink(formData.email)
          setEmailLinkSent(true)
        }
      } else {
        await register(formData.email, formData.password, formData.farmName)
      }
    } catch (error) {
      console.error('Auth error:', error)
      setErrors({
        general: 'Error en la autenticación. Verifica tus credenciales.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <span className="text-6xl">🐄</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Mi Granja
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isLogin
              ? 'Inicia sesión en tu cuenta'
              : 'Crea tu cuenta de granjero'}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {errors.general}
            </div>
          )}

          <div className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="tu@email.com"
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            {/* Contraseña - solo mostrar si no es enlace por email o si es registro */}
            {(!isLogin || authMethod === 'password') && !emailLinkSent && (
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  required={!isLogin || authMethod === 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                )}
              </div>
            )}

            {/* Campos adicionales para registro */}
            {!isLogin && (
              <>
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Confirmar contraseña
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 ${
                      errors.confirmPassword
                        ? 'border-red-500'
                        : 'border-gray-300'
                    }`}
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="farmName"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Nombre de tu granja (opcional)
                  </label>
                  <input
                    id="farmName"
                    name="farmName"
                    type="text"
                    value={formData.farmName}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    placeholder="Granja San José"
                    disabled={isLoading}
                  />
                </div>
              </>
            )}
          </div>

          {/* Mostrar mensaje si el enlace fue enviado */}
          {emailLinkSent && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <h4 className="font-medium">¡Enlace enviado!</h4>
                  <p className="text-sm">
                    Revisa tu email y haz clic en el enlace para iniciar sesión.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Opciones de método de autenticación solo para login */}
          {isLogin && !emailLinkSent && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700 text-center">
                Elige un método de inicio de sesión
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAuthMethod('emailLink')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    authMethod === 'emailLink'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Enlace por email (recomendado)
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethod('password')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    authMethod === 'password'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Con contraseña
                </button>
              </div>
            </div>
          )}

          {!emailLinkSent && (
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    {isLogin && authMethod === 'emailLink'
                      ? 'Enviando enlace...'
                      : 'Procesando...'}
                  </span>
                ) : (
                  <>
                    {isLogin
                      ? authMethod === 'emailLink'
                        ? 'Enviar enlace por email'
                        : 'Iniciar sesión'
                      : 'Crear cuenta'}
                  </>
                )}
              </button>
            </div>
          )}

          {/* Botón para solicitar nuevo enlace */}
          {emailLinkSent && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  setEmailLinkSent(false)
                  setAuthMethod('emailLink')
                }}
                className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors text-sm"
              >
                Enviar nuevo enlace
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmailLinkSent(false)
                  setAuthMethod('password')
                }}
                className="w-full text-green-600 hover:text-green-500 text-sm font-medium"
              >
                Usar contraseña en su lugar
              </button>
            </div>
          )}

          {!emailLinkSent && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin)
                  setErrors({})
                  setEmailLinkSent(false)
                  setAuthMethod('password')
                  setFormData({
                    email: '',
                    password: '',
                    confirmPassword: '',
                    farmName: ''
                  })
                }}
                className="text-green-600 hover:text-green-500 text-sm font-medium"
                disabled={isLoading}
              >
                {isLogin
                  ? '¿No tienes cuenta? Regístrate'
                  : '¿Ya tienes cuenta? Inicia sesión'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

export default AuthForm
