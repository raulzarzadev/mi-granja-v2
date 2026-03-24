'use client'

import { useRouter } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'
import BrandLogo from '@/components/BrandLogo'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'

const CODE_LENGTH = 6

const AuthForm: React.FC = () => {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const {
    user,
    sendCode,
    verifyCode,
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
    const devCode = await sendCode(email)
    // En desarrollo, auto-rellenar el código sin enviar email real
    if (devCode) {
      const digits = devCode.split('')
      setCode(digits)
      // Auto-submit después de un breve delay para que el UI se actualice
      setTimeout(() => handleVerify(devCode), 300)
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
    const success = await verifyCode(targetEmail, finalCode)
    if (success) {
      router.push('/')
    }
  }

  const handleResend = async () => {
    setCode(Array(CODE_LENGTH).fill(''))
    clearEmailLink()
    clearError()
    const devCode = await sendCode(emailForCode || email)
    if (devCode) {
      const digits = devCode.split('')
      setCode(digits)
      setTimeout(() => handleVerify(devCode), 300)
    }
  }

  const handleChangeEmail = () => {
    setCode(Array(CODE_LENGTH).fill(''))
    clearEmailLink()
    clearError()
  }

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
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center gap-2 py-3 px-4 border border-transparent text-sm font-semibold rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed shadow"
            >
              {isLoading && <LoadingSpinner size="sm" text="" />}
              {isLoading ? 'Enviando código...' : 'Enviar código de acceso'}
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
              {isLoading && <LoadingSpinner size="sm" text="" />}
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
