'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  FarmInvitation,
  DEFAULT_PERMISSIONS,
  FarmCollaborator,
  FarmPermission
} from '@/types/farm'
import { toDate } from '@/lib/dates'

/**
 * Hook unificado: miembros de la granja basados exclusivamente en farmInvitations
 * "Colaboradores" = invitaciones aceptadas (status === 'accepted')
 */
export const useFarmMembers = (farmId?: string) => {
  const [invitations, setInvitations] = useState<FarmInvitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!farmId) {
      setInvitations([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const qInv = query(
        collection(db, 'farmInvitations'),
        where('farmId', '==', farmId)
      )
      const snap = await getDocs(qInv)
      const data = snap.docs.map((d) => {
        const v = d.data() as any
        return {
          id: d.id,
          ...v,
          expiresAt: toDate(v.expiresAt),
          createdAt: toDate(v.createdAt),
          updatedAt: toDate(v.updatedAt),
          acceptedAt: v.acceptedAt ? toDate(v.acceptedAt) : undefined
        } as FarmInvitation
      })
      setInvitations(data)
    } catch (e) {
      console.error('Error loading farm members', e)
      setError('Error al cargar miembros')
    } finally {
      setIsLoading(false)
    }
  }, [farmId])

  useEffect(() => {
    load()
  }, [load])

  // Colaboradores activos = accepted
  const collaborators: FarmCollaborator[] = invitations
    .filter((i) => i.status === 'accepted')
    .map((i) => ({
      id: i.id,
      farmId: i.farmId,
      userId: (i as any).userId || i.email, // fallback al email
      role: i.role,
      permissions: DEFAULT_PERMISSIONS[i.role] as FarmPermission[],
      isActive: true,
      invitedBy: i.invitedBy,
      invitedAt: i.createdAt,
      acceptedAt: (i as any).acceptedAt || i.updatedAt,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
      notes: (i as any).notes
    }))

  const pendingInvitations = invitations.filter((i) => i.status === 'pending')

  // Invitación nueva
  const inviteCollaborator = async (
    email: string,
    role: FarmCollaborator['role'],
    invitedBy: string
  ) => {
    if (!farmId) throw new Error('ID de granja requerido')

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const docData = {
      farmId,
      email: email.toLowerCase().trim(),
      role,
      permissions: DEFAULT_PERMISSIONS[role],
      invitedBy,
      status: 'pending',
      token: `${farmId}_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 10)}`,
      expiresAt: Timestamp.fromDate(expiresAt),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }
    const ref = await addDoc(collection(db, 'farmInvitations'), docData)
    setInvitations((prev) => [
      ...prev,
      {
        id: ref.id,
        ...docData,
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any
    ])
  }

  // Aceptar invitación (interno / administrador)
  const acceptInvitation = async (invitationId: string, userId: string) => {
    const ref = doc(db, 'farmInvitations', invitationId)
    const now = Timestamp.now()
    await updateDoc(ref, {
      status: 'accepted',
      userId,
      acceptedAt: now,
      updatedAt: now
    })
    setInvitations((prev) =>
      prev.map((i) =>
        i.id === invitationId
          ? {
              ...i,
              status: 'accepted',
              userId,
              acceptedAt: new Date(),
              updatedAt: new Date()
            }
          : i
      )
    )
  }

  // Cancelar (marcar rechazada) si pending
  const cancelInvitation = async (invitationId: string) => {
    const ref = doc(db, 'farmInvitations', invitationId)
    await updateDoc(ref, { status: 'rejected', updatedAt: Timestamp.now() })
    setInvitations((prev) =>
      prev.map((i) =>
        i.id === invitationId
          ? { ...i, status: 'rejected', updatedAt: new Date() }
          : i
      )
    )
  }

  // Revocar (accepted -> revoked)
  const revokeInvitation = async (invitationId: string) => {
    const ref = doc(db, 'farmInvitations', invitationId)
    await updateDoc(ref, { status: 'revoked', updatedAt: Timestamp.now() })
    setInvitations((prev) =>
      prev.map((i) =>
        i.id === invitationId
          ? { ...i, status: 'revoked', updatedAt: new Date() }
          : i
      )
    )
  }

  // Eliminar definitiva
  const deleteInvitation = async (invitationId: string) => {
    await deleteDoc(doc(db, 'farmInvitations', invitationId))
    setInvitations((prev) => prev.filter((i) => i.id !== invitationId))
  }

  // Update role / notes / reactivar
  const updateCollaborator = async (
    invitationId: string,
    updates: Partial<{
      role: FarmCollaborator['role']
      isActive: boolean
      notes: string
    }>
  ) => {
    const inv = invitations.find((i) => i.id === invitationId)
    if (!inv) throw new Error('Invitación no encontrada')

    const updateData: any = { updatedAt: Timestamp.now() }
    if (updates.role) updateData.role = updates.role
    if ('notes' in updates) updateData.notes = updates.notes

    if (typeof updates.isActive === 'boolean') {
      updateData.status = updates.isActive ? 'accepted' : 'revoked'
    }

    await updateDoc(doc(db, 'farmInvitations', invitationId), updateData)

    setInvitations((prev) =>
      prev.map((i) =>
        i.id === invitationId
          ? { ...i, ...updateData, updatedAt: new Date() }
          : i
      )
    )
  }

  const getCollaboratorStats = () => {
    const active = collaborators
    const pending = pendingInvitations
    const byRole = active.reduce((acc, c) => {
      acc[c.role] = (acc[c.role] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total: active.length,
      pending: pending.length,
      byRole
    }
  }

  return {
    // Estado
    collaborators,
    invitations: pendingInvitations,
    isLoading,
    error,

    // Acciones
    inviteCollaborator,
    acceptInvitation,
    cancelInvitation,
    revokeInvitation,
    deleteInvitation,
    updateCollaborator,

    // Utilidades
    getCollaboratorStats,
    refresh: load
  }
}
