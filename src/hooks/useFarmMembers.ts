'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/features/store'
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  onSnapshot
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { FarmInvitation, FarmCollaborator, FarmPermission } from '@/types/farm'
import {
  collaborator_roles_label,
  DEFAULT_PERMISSIONS
} from '@/types/collaborators'
import { toDate } from '@/lib/dates'
import { useEmail } from '@/hooks/useEmail'

/**
 * Hook unificado: miembros de la granja basados exclusivamente en farmInvitations
 * "Colaboradores" = invitaciones aceptadas (status === 'accepted')
 */
export const useFarmMembers = (farmId?: string) => {
  const [invitations, setInvitations] = useState<FarmInvitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useSelector((s: RootState) => s.auth)
  const { currentFarm } = useSelector((s: RootState) => s.farm)
  const { sendEmail } = useEmail()

  const load = useCallback(async () => {
    // Mantener función manual de refresco usando getDocs (opcional)
    if (!farmId) {
      setInvitations([])
      return
    }
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
      console.error('Error load() farm members', e)
    }
  }, [farmId])

  // Suscripción en tiempo real
  useEffect(() => {
    if (!farmId) {
      setInvitations([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    const qInv = query(
      collection(db, 'farmInvitations'),
      where('farmId', '==', farmId)
    )
    const unsub = onSnapshot(
      qInv,
      (snap) => {
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
        setIsLoading(false)
      },
      (err) => {
        console.error('Error realtime farm members', err)
        setError('Error en tiempo real')
        setIsLoading(false)
      }
    )
    return () => unsub()
  }, [farmId])

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
    const created = {
      id: ref.id,
      ...docData,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date()
    } as any
    setInvitations((prev) => [...prev, created])

    // Enviar email (best-effort)
    try {
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        (typeof window !== 'undefined'
          ? window.location.origin
          : 'http://localhost:3000')
      const acceptUrl = `${appUrl}/invitations/confirm?token=${encodeURIComponent(
        docData.token
      )}&action=accept`
      const rejectUrl = `${appUrl}/invitations/confirm?token=${encodeURIComponent(
        docData.token
      )}&action=reject`

      await sendEmail({
        to: email,
        subject: 'Invitación para colaborar en una granja',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb; margin-bottom:16px;">Has sido invitado a colaborar en una granja</h2>
            <p style="margin:0 0 8px 0;">Rol propuesto: <strong>${role}</strong></p>
            <p style="margin:0 0 16px 0;">La invitación expira el <strong>${expiresAt.toLocaleDateString()}</strong>.</p>
            <div style="margin: 24px 0; display:flex; gap:12px;">
              <a href="${acceptUrl}" style="background:#16a34a; color:#fff; padding:12px 18px; text-decoration:none; border-radius:6px; font-weight:600;">Aceptar invitación</a>
              <a href="${rejectUrl}" style="background:#dc2626; color:#fff; padding:12px 18px; text-decoration:none; border-radius:6px; font-weight:600;">Rechazar</a>
            </div>
            <p style="font-size:12px; color:#6b7280;">Si los botones no funcionan copia y pega estos enlaces:</p>
            <p style="font-size:11px; word-break:break-all; margin:4px 0;">Aceptar: ${acceptUrl}</p>
            <p style="font-size:11px; word-break:break-all; margin:4px 0;">Rechazar: ${rejectUrl}</p>
          </div>
        `,
        text: `Has sido invitado como ${
          collaborator_roles_label[role] || role
        }. Acepta: ${acceptUrl} | Rechaza: ${rejectUrl}`,
        tags: [
          { name: 'type', value: 'invitation' },
          { name: 'farm_id', value: farmId }
        ]
      })
    } catch (e) {
      console.warn('Fallo al enviar email de invitación (continuando):', e)
    }

    return created
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
    // Seguridad en cliente: solo owner / admin / manager
    const me = invitations
      .filter((i) => i.status === 'accepted')
      .find((i) => (i as any).userId === user?.id)
    const myRole = (me as any)?.role
    const isOwner = currentFarm && user && currentFarm.ownerId === user.id
    const allowed = isOwner || myRole === 'admin' || myRole === 'manager'
    if (!allowed) throw new Error('No autorizado para revocar invitaciones')

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
