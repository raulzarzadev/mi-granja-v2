'use client'

import React, { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  addDoc,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { FarmInvitation } from '@/types/farm'
import { toDate } from '@/lib/dates'

export default function InvitationConfirmPage() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token') || ''
  const action = (params.get('action') || 'accept').toLowerCase()

  const { user } = useAuth()
  const [status, setStatus] = useState<'loading' | 'error' | 'done'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const process = async () => {
      try {
        if (!token) throw new Error('Token inválido')

        // Buscar invitación por token
        const q = query(
          collection(db, 'farmInvitations'),
          where('token', '==', token)
        )
        const snap = await getDocs(q)
        if (snap.empty) throw new Error('Invitación no encontrada o inválida')
        const docRef = snap.docs[0]
        const data = docRef.data() as Partial<FarmInvitation>

        // Verificar expiración
        const expiresAtDate = data.expiresAt ? toDate(data.expiresAt) : null
        if (expiresAtDate && expiresAtDate < new Date()) {
          throw new Error('La invitación ha expirado')
        }

        // Si ya fue procesada, informar
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

        // Si es rechazar, no requiere login
        if (action === 'reject') {
          await updateDoc(doc(db, 'farmInvitations', docRef.id), {
            status: 'rejected',
            updatedAt: Timestamp.now(),
            // @ts-ignore - solo se usa para tracking opcional
            rejectedAt: Timestamp.now()
          })
          setStatus('done')
          return
        }

        // Aceptar requiere usuario autenticado
        if (!user?.id) {
          setStatus('error')
          setErrorMessage(
            'Debes iniciar sesión para aceptar la invitación. Inicia sesión y vuelve a abrir este enlace.'
          )
          return
        }

        // Verificar que el email del usuario coincide con la invitación (recomendado)
        const invitedEmail = (data.email || '').toLowerCase().trim()
        const userEmail = ((user as any).email || '').toLowerCase().trim()
        if (invitedEmail && userEmail && invitedEmail !== userEmail) {
          setStatus('error')
          setErrorMessage(
            `Esta invitación fue enviada a ${invitedEmail}. Inicia sesión con ese correo para aceptarla.`
          )
          return
        }

        // Evitar duplicados: comprobar si ya es colaborador
        if (!data.farmId) throw new Error('Invitación inválida (sin farmId)')
        const existsQ = query(
          collection(db, 'farmCollaborators'),
          where('farmId', '==', data.farmId),
          where('userId', '==', user.id)
        )
        const existsSnap = await getDocs(existsQ)
        const collaboratorAlreadyExists = !existsSnap.empty

        // Crear colaborador y marcar invitación como aceptada
        const collaboratorData = {
          farmId: data.farmId,
          userId: user.id,
          role: data.role,
          permissions: data.permissions,
          isActive: true,
          invitedBy: data.invitedBy,
          invitedAt: data.createdAt ? toDate(data.createdAt) : Timestamp.now(),
          acceptedAt: Timestamp.now(),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        }

        if (!collaboratorAlreadyExists) {
          await addDoc(collection(db, 'farmCollaborators'), collaboratorData)
        }
        await updateDoc(doc(db, 'farmInvitations', docRef.id), {
          status: 'accepted',
          updatedAt: Timestamp.now(),
          // @ts-ignore - campo de tracking opcional
          acceptedAt: Timestamp.now()
        })

        setStatus('done')

        // Redirigir a la granja tras un breve feedback visual
        setTimeout(() => {
          try {
            // router.replace(`/farms/${data.farmId}`)
            router.replace('/')
          } catch {
            router.push('/')
          }
        }, 1000)
      } catch (e) {
        console.error(e)
        setStatus('error')
        setErrorMessage(
          e instanceof Error ? e.message : 'No se pudo procesar la invitación'
        )
      }
    }

    process()
  }, [token, action, user?.id])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
        <div className="mb-4">
          <span className="text-5xl">✉️</span>
        </div>
        <h1 className="text-xl font-semibold mb-4">
          Confirmación de invitación
        </h1>

        {status === 'loading' && (
          <div className="space-y-3">
            <LoadingSpinner />
            <p className="text-gray-600">Procesando tu solicitud...</p>
          </div>
        )}

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
                  ></path>
                </svg>
              </div>
            </div>
            <p className="text-gray-700">
              ¡Listo! La invitación fue{' '}
              {action === 'reject' ? 'rechazada' : 'aceptada'}.
            </p>
            <button
              onClick={() => router.push('/')}
              className="mt-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              Ir al inicio
            </button>
          </div>
        )}

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
                  ></path>
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
