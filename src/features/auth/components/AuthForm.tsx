'use client'

import React, { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import BrandLogo from '@/components/BrandLogo'

/**
 * Componente de login y registro
 * Interfaz simple y optimizada para móviles
 */
const AuthForm: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [authMethod, setAuthMethod] = useState<'password' | 'emailLink'>(
    'emailLink'
  )
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    farmName: ''
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const {
    login,
    register,
    loginWithEmailLink,
    clearError,
    clearEmailLink,
    isLoading,
    error,
    emailLinkSent,
    emailForLink
  } = useAuth()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))

    // Limpiar error del campo de validación
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: ''
      }))
    }

    // Limpiar error general de autenticación si existe
    if (error) {
      clearError()
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

    setFormErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm(authMethod === 'password')) {
      return
    }

    // Limpiar errores de Redux antes de empezar
    if (error) {
      clearError()
    }

    try {
      if (isLogin) {
        if (authMethod === 'password') {
          await login(formData.email, formData.password)
        } else {
          await loginWithEmailLink(formData.email)
        }
      } else {
        await register(formData.email, formData.password, formData.farmName)
      }
    } catch (authError) {
      console.error('Auth error:', authError)
      // El error ya está siendo manejado por el hook useAuth
      // y se reflejará en el estado Redux
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <BrandLogo variant="verde" />
          </div>
          {/* <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Mi Granja
          </h2> */}
          <p className="mt-2 text-center text-sm text-gray-600">
            {isLogin
              ? 'Inicia sesión en tu cuenta'
              : 'Crea tu cuenta de granjero'}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
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
                  formErrors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="tu@email.com"
                disabled={isLoading}
              />
              {formErrors.email && (
                <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
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
                    formErrors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                {formErrors.password && (
                  <p className="text-red-500 text-xs mt-1">
                    {formErrors.password}
                  </p>
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
                      formErrors.confirmPassword
                        ? 'border-red-500'
                        : 'border-gray-300'
                    }`}
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  {formErrors.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.confirmPassword}
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
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 shadow-lg rounded-xl p-6">
              <div className="text-center">
                <div className="mb-4">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-500 rounded-full mb-4 shadow-lg">
                    <svg
                      className="w-10 h-10 text-white animate-bounce"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                  </div>
                </div>
                <h4 className="font-bold text-xl mb-3 text-blue-800">
                  📧 ¡Revisa tu email ahora!
                </h4>
                <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 mb-4">
                  <p className="text-sm font-semibold text-yellow-800 mb-2">
                    Te hemos enviado un enlace de autenticación a:
                  </p>
                  <p className="font-mono text-sm bg-white px-3 py-2 rounded border font-bold text-blue-700">
                    {emailForLink || formData.email}
                  </p>
                </div>
                <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                  <p className="text-sm font-semibold text-green-800">
                    ✨ Haz clic en el enlace del email y automáticamente
                    regresarás aquí
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    No cierres esta ventana
                  </p>
                </div>

                {/* Mostrar advertencia si hay error pero aún se muestra el email enviado */}
                {error && (
                  <div className="bg-orange-100 border border-orange-300 rounded-lg p-3 mt-3">
                    <p className="text-sm font-semibold text-orange-800 mb-1">
                      ⚠️ Nota importante:
                    </p>
                    <p className="text-xs text-orange-700">
                      Hubo un problema técnico, pero es posible que el email se
                      haya enviado. Revisa tu bandeja de entrada y spam. Si no
                      recibes nada en unos minutos, puedes reenviar el enlace.
                    </p>
                  </div>
                )}
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

          {/* Botones cuando se ha enviado el enlace */}
          {emailLinkSent && (
            <div className="space-y-4">
              <div className="text-center bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700 mb-3 font-medium">
                  ¿No recibiste el email? Revisa tu carpeta de spam o:
                </p>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      clearEmailLink()
                      setAuthMethod('emailLink')
                    }}
                    className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold shadow-md"
                  >
                    📧 Reenviar enlace al email
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearEmailLink()
                      setAuthMethod('password')
                    }}
                    className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                  >
                    🔐 Usar contraseña en su lugar
                  </button>
                </div>
              </div>
            </div>
          )}

          {!emailLinkSent && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin)
                  setFormErrors({})
                  clearEmailLink()
                  if (error) clearError()
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
