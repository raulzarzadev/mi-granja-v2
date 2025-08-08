'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/features/store'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { FarmInvitation } from '@/types/farm'
import { toDate } from '@/lib/dates'

export const useMyInvitations = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const [invitations, setInvitations] = useState<FarmInvitation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const email = (user?.email || '').toLowerCase().trim()

  const loadInvitations = useMemo(
    () => async () => {
      if (!email) {
        setInvitations([])
        return
      }
      setIsLoading(true)
      setError(null)
      try {
        const qInv = query(
          collection(db, 'farmInvitations'),
          where('email', '==', email),
          // Mostrar pendientes y aceptadas
          where('status', 'in', ['pending', 'accepted'])
        )
        const snap = await getDocs(qInv)
        const data = snap.docs.map((d) => {
          const v = d.data() as any
          return {
            id: d.id,
            ...v,
            expiresAt: toDate(v.expiresAt),
            createdAt: toDate(v.createdAt),
            updatedAt: toDate(v.updatedAt)
          } as FarmInvitation
        })
        setInvitations(data)
      } catch (e) {
        console.error('Error loading my invitations', e)
        setError('No se pudieron cargar tus invitaciones')
      } finally {
        setIsLoading(false)
      }
    },
    [email]
  )

  useEffect(() => {
    loadInvitations()
  }, [loadInvitations])

  const getPending = () =>
    invitations.filter(
      (i) => i.status === 'pending' && new Date() < i.expiresAt
    )
  const getAccepted = () => invitations.filter((i) => i.status === 'accepted')

  const getConfirmUrl = (token: string, action: 'accept' | 'reject') => {
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (typeof window !== 'undefined'
        ? window.location.origin
        : 'http://localhost:3000')
    return `${appUrl}/invitations/confirm?token=${encodeURIComponent(
      token
    )}&action=${action}`
  }

  return {
    invitations,
    isLoading,
    error,
    getPending,
    getAccepted,
    getConfirmUrl,
    refresh: loadInvitations
  }
}
