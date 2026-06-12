'use client'

import { useRouter } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'
import BrandLogo from '@/components/BrandLogo'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'

const CODE_LENGTH = 6
const DEV_TEST_ACCOUNTS = [
  { email: 'admin@migranja.com', label: 'Admin' },
  { email: 'granjero@ejemplo.com', label: 'Granjero' },
  { email: 'test@mail.com', label: 'Test' },
  { email: 'raulzarza.dev@gmail.com', label: 'Dev' },
]

const AuthForm: React.FC = () => {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [authAction, setAuthAction] = useState<'code' | 'google' | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const {
    user,
    sendCode,
    verifyCode,
    loginWithGoogle,
    clearError,
    clearEmailLink,
    isLoading,
    error,
    emailLinkSent: codeSent,
    emailForLink: emailForCode,
  } = useAuth()

  // Redirect when authenticated
  useEffect(() => {
    if (user) {
      router.push('/')
    }
  }, [user, router])

  // Auto-focus first code input when code form shows
  useEffect(() => {
    if (codeSent) {
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    }
  }, [codeSent])

  const validateEmail = () => {
    const newErrors: Record<string, string> = {}
    if (!email.trim()) newErrors.email = 'El email es requerido'
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'El email no es válido'
    setFormErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateEmail()) return
    if (error) clearError()
    setAuthAction('code')
    try {
      const devCode = await sendCode(email)
      // En desarrollo, auto-rellenar el código sin enviar email real
      if (devCode) {
        const digits = devCode.split('')
        setCode(digits)
        // Auto-submit después de un breve delay para que el UI se actualice
        setTimeout(() => handleVerify(devCode), 300)
      }
    } finally {
      setAuthAction(null)
    }
  }

  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1)
    const newCode = [...code]
    newCode[index] = digit
    setCode(newCode)

    // Clear error on input
    if (error) clearError()

    // Auto-advance to next input
    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all digits are filled
    const fullCode = newCode.join('')
    if (fullCode.length === CODE_LENGTH && newCode.every((d) => d !== '')) {
      handleVerify(fullCode)
    }
  }

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH)
    if (pasted.length === 0) return

    const newCode = [...code]
    for (let i = 0; i < pasted.length; i++) {
      newCode[i] = pasted[i]
    }
    setCode(newCode)

    // Focus last filled input or next empty
    const nextIndex = Math.min(pasted.length, CODE_LENGTH - 1)
    inputRefs.current[nextIndex]?.focus()

    // Auto-submit if complete
    if (pasted.length === CODE_LENGTH) {
      handleVerify(pasted)
    }
  }

  const handleVerify = async (codeStr?: string) => {
    const finalCode = codeStr || code.join('')
    if (finalCode.length !== CODE_LENGTH) return

    const targetEmail = emailForCode || email
    setAuthAction('code')
    try {
      const success = await verifyCode(targetEmail, finalCode)
      if (success) {
        router.push('/')
      }
    } finally {
      setAuthAction(null)
    }
  }

  const handleResend = async () => {
    setCode(Array(CODE_LENGTH).fill(''))
    clearEmailLink()
    clearError()
    setAuthAction('code')
    try {
      const devCode = await sendCode(emailForCode || email)
      if (devCode) {
        const digits = devCode.split('')
        setCode(digits)
        setTimeout(() => handleVerify(devCode), 300)
      }
    } finally {
      setAuthAction(null)
    }
  }

  const handleChangeEmail = () => {
    setCode(Array(CODE_LENGTH).fill(''))
    clearEmailLink()
    clearError()
  }

  const handleSelectTestEmail = (testEmail: string) => {
    setEmail(testEmail)
    setFormErrors({})
    if (error) clearError()
  }

  const handleGoogleLogin = async () => {
    if (error) clearError()
    setAuthAction('google')
    try {
      const success = await loginWithGoogle()
      if (success) {
        router.push('/')
      }
    } finally {
      setAuthAction(null)
    }
  }

  const showTestAccounts = process.env.NODE_ENV === 'development'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <BrandLogo variant="verde" />
          </div>
          <p className="mt-2 text-center text-sm text-gray-600">
            {codeSent
              ? 'Ingresa el código enviado a tu email'
              : 'Te enviaremos un código de acceso a tu email'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Email input */}
        {!codeSent && (
          <form className="mt-8 space-y-6" onSubmit={handleSendCode}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (formErrors.email) setFormErrors({})
                  if (error) clearError()
                }}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 ${
                  formErrors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="tu@email.com"
                disabled={isLoading}
              />
              {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
            </div>
            {showTestAccounts && (
              <section
                aria-labelledby="test-accounts-title"
                className="rounded-lg border border-amber-200 bg-amber-50 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 id="test-accounts-title" className="text-sm font-semibold text-amber-950">
                      Correos de prueba
                    </h2>
                    <p className="mt-0.5 text-xs text-amber-800">
                      Selecciona uno para rellenar el campo.
                    </p>
                  </div>
                  <span className="shrink-0 rounded border border-amber-300 px-2 py-1 text-[11px] font-semibold uppercase text-amber-900">
                    Dev
                  </span>
                </div>
                <div className="mt-3 grid gap-2">
                  {DEV_TEST_ACCOUNTS.map((account) => (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => handleSelectTestEmail(account.email)}
                      disabled={isLoading}
                      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-amber-200 bg-white px-3 py-2 text-left transition-colors hover:border-amber-400 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-gray-900">
                          {account.email}
                        </span>
                        <span className="block text-xs text-gray-600">{account.label}</span>
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-amber-800">Usar</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center gap-2 py-3 px-4 border border-transparent text-sm font-semibold rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed shadow"
            >
              {authAction === 'code' && <LoadingSpinner size="sm" text="" />}
              {isLoading ? 'Enviando código...' : 'Enviar código de acceso'}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-gray-50 px-3 text-xs font-medium uppercase text-gray-500">
                  O usa Google
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="mx-auto flex min-h-10 w-full max-w-xs items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {authAction === 'google' ? (
                <LoadingSpinner size="sm" text="" />
              ) : (
                <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z"
                  />
                </svg>
              )}
              {authAction === 'google' ? 'Abriendo Google...' : 'Continuar con Google'}
            </button>
          </form>
        )}

        {/* Step 2: Code input */}
        {codeSent && (
          <div className="mt-8 space-y-6">
            {/* Email badge */}
            <div className="text-center">
              <span className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-2 text-sm font-medium text-green-800">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                {emailForCode || email}
              </span>
            </div>

            {/* Code inputs */}
            <div className="flex justify-center gap-2" onPaste={handleCodePaste}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputRefs.current[i] = el
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  disabled={isLoading}
                  className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50 transition-colors"
                />
              ))}
            </div>

            {/* Verify button (fallback, auto-submit usually handles it) */}
            <button
              type="button"
              onClick={() => handleVerify()}
              disabled={isLoading || code.join('').length !== CODE_LENGTH}
              className="w-full flex justify-center gap-2 py-3 px-4 border border-transparent text-sm font-semibold rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed shadow"
            >
              {authAction === 'code' && <LoadingSpinner size="sm" text="" />}
              {isLoading ? 'Verificando...' : 'Verificar código'}
            </button>

            {/* Resend / change email */}
            <div className="text-center bg-gray-50 rounded-lg p-4 space-y-3">
              <p className="text-sm text-gray-600">¿No recibiste el código? Revisa spam.</p>
              <button
                type="button"
                onClick={handleResend}
                disabled={isLoading}
                className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold disabled:opacity-50"
              >
                Reenviar código
              </button>
              <button
                type="button"
                onClick={handleChangeEmail}
                disabled={isLoading}
                className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm"
              >
                Usar otro email
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AuthForm
