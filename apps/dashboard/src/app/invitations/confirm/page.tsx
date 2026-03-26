'use client'

import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import BrandLogo from '@/components/BrandLogo'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import { toDate } from '@/lib/dates'
import { db } from '@/lib/firebase'
import type { FarmInvitation } from '@/types/farm'

const CODE_LENGTH = 6

function InvitationConfirmInner() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token') || ''
  const action = (params.get('action') || 'accept').toLowerCase()

  const {
    user,
    sendCode,
    verifyCode,
    isLoading: authLoading,
    error: authError,
    clearError,
    emailLinkSent: codeSent,
    emailForLink: emailForCode,
  } = useAuth()
  const [status, setStatus] = useState<'loading' | 'needLogin' | 'error' | 'done'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [invitation, setInvitation] = useState<
    (Partial<FarmInvitation> & { docId?: string }) | null
  >(null)

  // Code input state
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Load invitation data first
  useEffect(() => {
    const loadInvitation = async () => {
      try {
        if (!token) throw new Error('Token inválido')

        const q = query(collection(db, 'farmInvitations'), where('token', '==', token))
        const snap = await getDocs(q)
        if (snap.empty) throw new Error('Invitación no encontrada o inválida')

        const docRef = snap.docs[0]
        const data = docRef.data() as Partial<FarmInvitation>

        // Check expiry
        const expiresAtDate = data.expiresAt ? toDate(data.expiresAt) : null
        if (expiresAtDate && expiresAtDate < new Date()) {
          throw new Error('La invitación ha expirado')
        }

        if (data.status === 'accepted') {
          setStatus('done')
          return
        }
        if (data.status === 'rejected') {
          setStatus('error')
          setErrorMessage('La invitación ya fue rechazada')
          return
        }
        if (data.status === 'revoked') {
          setStatus('error')
          setErrorMessage('Esta invitación fue revocada por el propietario')
          return
        }

        // Reject doesn't need login
        if (action === 'reject') {
          await updateDoc(doc(db, 'farmInvitations', docRef.id), {
            status: 'rejected',
            updatedAt: Timestamp.now(),
            rejectedAt: Timestamp.now(),
          })
          setStatus('done')
          return
        }

        setInvitation({ ...data, docId: docRef.id })

        // If user is already logged in, process acceptance
        if (user?.id) {
          await acceptInvitation(data, docRef.id, user.id, (user as any).email)
        } else {
          setStatus('needLogin')
        }
      } catch (e) {
        console.error(e)
        setStatus('error')
        setErrorMessage(e instanceof Error ? e.message : 'No se pudo procesar la invitación')
      }
    }

    loadInvitation()
  }, [token, action])

  // When user logs in, process acceptance
  useEffect(() => {
    if (user?.id && invitation?.docId && status === 'needLogin') {
      setStatus('loading')
      acceptInvitation(invitation, invitation.docId, user.id, (user as any).email)
    }
  }, [user?.id])

  const acceptInvitation = async (
    data: Partial<FarmInvitation>,
    docId: string,
    userId: string,
    userEmail: string,
  ) => {
    try {
      // Verify email match
      const invitedEmail = (data.email || '').toLowerCase().trim()
      const normalizedUserEmail = (userEmail || '').toLowerCase().trim()
      if (invitedEmail && normalizedUserEmail && invitedEmail !== normalizedUserEmail) {
        setStatus('error')
        setErrorMessage(
          `Esta invitación fue enviada a ${invitedEmail}. Inicia sesión con ese correo para aceptarla.`,
        )
        return
      }

      if (!data.farmId) throw new Error('Invitación inválida (sin farmId)')

      await updateDoc(doc(db, 'farmInvitations', docId), {
        status: 'accepted',
        userId,
        updatedAt: Timestamp.now(),
        acceptedAt: Timestamp.now(),
      })

      try {
        await updateDoc(doc(db, 'farms', data.farmId), {
          collaboratorsIds: arrayUnion(userId),
          ...(data.email ? { collaboratorsEmails: arrayUnion(data.email.toLowerCase()) } : {}),
        })
      } catch (e) {
        console.warn('No se pudo actualizar arrays de farm tras aceptar:', e)
      }

      setStatus('done')
      setTimeout(() => {
        try {
          router.replace('/')
        } catch {
          router.push('/')
        }
      }, 1500)
    } catch (e) {
      console.error(e)
      setStatus('error')
      setErrorMessage(e instanceof Error ? e.message : 'No se pudo aceptar la invitación')
    }
  }

  // --- Inline auth handlers ---
  const invitedEmail = invitation?.email || ''

  const handleSendCode = async () => {
    if (!invitedEmail) return
    if (authError) clearError()
    await sendCode(invitedEmail)
  }

  const handleCodeChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const newCode = [...code]
    newCode[index] = digit
    setCode(newCode)
    if (authError) clearError()

    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }

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
    if (!pasted.length) return
    const newCode = [...code]
    for (let i = 0; i < pasted.length; i++) newCode[i] = pasted[i]
    setCode(newCode)
    const nextIndex = Math.min(pasted.length, CODE_LENGTH - 1)
    inputRefs.current[nextIndex]?.focus()
    if (pasted.length === CODE_LENGTH) handleVerify(pasted)
  }

  const handleVerify = async (codeStr?: string) => {
    const finalCode = codeStr || code.join('')
    if (finalCode.length !== CODE_LENGTH) return
    await verifyCode(invitedEmail, finalCode)
    // user?.id change will trigger the acceptance useEffect
  }

  // Auto-focus first code input
  useEffect(() => {
    if (codeSent) {
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    }
  }, [codeSent])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
        <div className="mb-4 flex justify-center">
          <BrandLogo variant="verde" />
        </div>
        <h1 className="text-xl font-semibold mb-4">Confirmación de invitación</h1>

        {/* Loading */}
        {status === 'loading' && (
          <div className="space-y-3">
            <LoadingSpinner />
            <p className="text-gray-600">Procesando tu solicitud...</p>
          </div>
        )}

        {/* Need login — inline auth */}
        {status === 'needLogin' && (
          <div className="space-y-4">
            {invitation?.email && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  Invitación para <span className="font-semibold">{invitation.email}</span>
                </p>
              </div>
            )}

            <p className="text-sm text-gray-600">Ingresa con tu email para aceptar la invitación</p>

            {authError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                {authError}
              </div>
            )}

            {/* Step 1: Send code */}
            {!codeSent && (
              <button
                onClick={handleSendCode}
                disabled={authLoading || !invitedEmail}
                className="w-full flex justify-center gap-2 py-3 px-4 text-sm font-semibold rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 shadow"
              >
                {authLoading && <LoadingSpinner size="sm" text="" />}
                {authLoading ? 'Enviando...' : `Enviar código a ${invitedEmail}`}
              </button>
            )}

            {/* Step 2: Enter code */}
            {codeSent && (
              <div className="space-y-4">
                <div className="text-center">
                  <span className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-3 py-1.5 text-sm font-medium text-green-800">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    Código enviado a {emailForCode || invitedEmail}
                  </span>
                </div>

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
                      disabled={authLoading}
                      className="w-11 h-13 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50"
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleVerify()}
                  disabled={authLoading || code.join('').length !== CODE_LENGTH}
                  className="w-full flex justify-center gap-2 py-2.5 px-4 text-sm font-semibold rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 shadow"
                >
                  {authLoading && <LoadingSpinner size="sm" text="" />}
                  {authLoading ? 'Verificando...' : 'Verificar código'}
                </button>

                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={authLoading}
                  className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                >
                  Reenviar código
                </button>
              </div>
            )}
          </div>
        )}

        {/* Done */}
        {status === 'done' && (
          <div className="space-y-3">
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
                  />
                </svg>
              </div>
            </div>
            <p className="text-gray-700">
              ¡Listo! La invitación fue {action === 'reject' ? 'rechazada' : 'aceptada'}.
            </p>
            <button
              onClick={() => router.push('/')}
              className="mt-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              Ir al inicio
            </button>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="space-y-3">
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
                  />
                </svg>
              </div>
            </div>
            <p className="text-red-600">{errorMessage}</p>
            <button
              onClick={() => router.push('/')}
              className="mt-2 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Volver al inicio
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function InvitationConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
          <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
            <div className="mb-4">
              <span className="text-5xl">✉️</span>
            </div>
            <h1 className="text-xl font-semibold mb-4">Confirmación de invitación</h1>
            <div className="space-y-3">
              <LoadingSpinner />
              <p className="text-gray-600">Cargando…</p>
            </div>
          </div>
        </div>
      }
    >
      <InvitationConfirmInner />
    </Suspense>
  )
}
