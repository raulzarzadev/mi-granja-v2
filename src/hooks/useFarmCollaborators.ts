'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  FarmCollaborator,
  FarmInvitation,
  DEFAULT_PERMISSIONS
} from '@/types/farm'
import { toDate } from '@/lib/dates'
import { useEmail } from '@/hooks/useEmail'

export const useFarmCollaborators = (farmId?: string) => {
  const { sendEmail } = useEmail()
  const [collaborators, setCollaborators] = useState<FarmCollaborator[]>([])
  const [invitations, setInvitations] = useState<FarmInvitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCollaborators = useCallback(async () => {
    if (!farmId) {
      setCollaborators([])
      setInvitations([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Cargar colaboradores activos
      const collaboratorsQuery = query(
        collection(db, 'farmCollaborators'),
        where('farmId', '==', farmId)
      )
      const collaboratorsSnapshot = await getDocs(collaboratorsQuery)
      const collaboratorsData = collaboratorsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        invitedAt: doc.data().invitedAt?.toDate() || new Date(),
        acceptedAt: doc.data().acceptedAt?.toDate() || null,
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as FarmCollaborator[]

      // Cargar invitaciones pendientes
      const invitationsQuery = query(
        collection(db, 'farmInvitations'),
        where('farmId', '==', farmId),
        where('status', '==', 'pending')
      )
      const invitationsSnapshot = await getDocs(invitationsQuery)
      const invitationsData = invitationsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        expiresAt: doc.data().expiresAt?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as FarmInvitation[]

      setCollaborators(collaboratorsData)
      setInvitations(invitationsData)
    } catch (err) {
      console.error('Error loading farm collaborators:', err)
      setError('Error al cargar los colaboradores de la granja')
    } finally {
      setIsLoading(false)
    }
  }, [farmId])

  useEffect(() => {
    loadCollaborators()
  }, [loadCollaborators])

  const inviteCollaborator = async (
    email: string,
    role: FarmCollaborator['role'],
    invitedBy: string,
    customPermissions?: FarmCollaborator['permissions']
  ) => {
    if (!farmId) throw new Error('ID de granja requerido')

    const permissions = customPermissions || DEFAULT_PERMISSIONS[role]
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // Expira en 7 días

    // Generar token único para la invitación
    const token = `${farmId}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 10)}`

    const invitationData = {
      farmId,
      email: email.toLowerCase().trim(),
      role,
      permissions,
      invitedBy,
      token,
      status: 'pending' as const,
      expiresAt: Timestamp.fromDate(expiresAt),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }

    try {
      const docRef = await addDoc(
        collection(db, 'farmInvitations'),
        invitationData
      )
      const createdInvitation = {
        id: docRef.id,
        ...invitationData,
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      setInvitations((prev) => [...prev, createdInvitation])

      // Enviar email de invitación con links de aceptar/rechazar
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        (typeof window !== 'undefined'
          ? window.location.origin
          : 'http://localhost:3000')
      const acceptUrl = `${appUrl}/invitations/confirm?token=${encodeURIComponent(
        token
      )}&action=accept`
      const rejectUrl = `${appUrl}/invitations/confirm?token=${encodeURIComponent(
        token
      )}&action=reject`

      try {
        await sendEmail({
          to: email,
          subject: 'Invitación para colaborar en una granja',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Has sido invitado a colaborar en una granja</h2>
              <p>Has recibido una invitación para unirte como <strong>${role}</strong>.</p>
              <p>La invitación expira el <strong>${expiresAt.toLocaleDateString()}</strong>.</p>
              <div style="margin: 20px 0;">
                <a href="${acceptUrl}" style="background: #16a34a; color: white; padding: 10px 16px; text-decoration: none; border-radius: 6px; margin-right: 8px;">Aceptar invitación</a>
                <a href="${rejectUrl}" style="background: #ef4444; color: white; padding: 10px 16px; text-decoration: none; border-radius: 6px;">Rechazar</a>
              </div>
              <p style="color: #6b7280; font-size: 12px;">Si los botones no funcionan, copia y pega estos enlaces en tu navegador:</p>
              <p style="font-size: 12px; word-break: break-all;">Aceptar: ${acceptUrl}</p>
              <p style="font-size: 12px; word-break: break-all;">Rechazar: ${rejectUrl}</p>
            </div>
          `,
          text: `Has sido invitado como ${role}. Acepta: ${acceptUrl} | Rechaza: ${rejectUrl}`,
          tags: [
            { name: 'type', value: 'invitation' },
            { name: 'farm_id', value: farmId }
          ]
        })
      } catch (e) {
        console.warn('No se pudo enviar el email de invitación:', e)
      }

      return createdInvitation
    } catch (error) {
      console.error('Error inviting collaborator:', error)
      throw new Error('Error al enviar la invitación')
    }
  }

  const acceptInvitation = async (invitationId: string, userId: string) => {
    try {
      const invitation = invitations.find((inv) => inv.id === invitationId)
      if (!invitation) throw new Error('Invitación no encontrada')

      // Crear el colaborador
      const collaboratorData = {
        farmId: invitation.farmId,
        userId,
        role: invitation.role,
        permissions: invitation.permissions,
        isActive: true,
        invitedBy: invitation.invitedBy,
        invitedAt: Timestamp.fromDate(toDate(invitation.createdAt)),
        acceptedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }

      const collaboratorRef = await addDoc(
        collection(db, 'farmCollaborators'),
        collaboratorData
      )

      // Actualizar la invitación como aceptada
      await updateDoc(doc(db, 'farmInvitations', invitationId), {
        status: 'accepted',
        updatedAt: Timestamp.now()
      })

      const newCollaborator = {
        id: collaboratorRef.id,
        ...collaboratorData,
        invitedAt: invitation.createdAt,
        acceptedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      setCollaborators((prev) => [...prev, newCollaborator])
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId))

      return newCollaborator
    } catch (error) {
      console.error('Error accepting invitation:', error)
      throw new Error('Error al aceptar la invitación')
    }
  }

  const updateCollaborator = async (
    collaboratorId: string,
    updates: Partial<
      Pick<FarmCollaborator, 'role' | 'permissions' | 'isActive' | 'notes'>
    >
  ) => {
    try {
      const collaboratorRef = doc(db, 'farmCollaborators', collaboratorId)
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now()
      }

      await updateDoc(collaboratorRef, updateData)

      setCollaborators((prev) =>
        prev.map((collaborator) =>
          collaborator.id === collaboratorId
            ? { ...collaborator, ...updates, updatedAt: new Date() }
            : collaborator
        )
      )
    } catch (error) {
      console.error('Error updating collaborator:', error)
      throw new Error('Error al actualizar el colaborador')
    }
  }

  const removeCollaborator = async (collaboratorId: string) => {
    try {
      await deleteDoc(doc(db, 'farmCollaborators', collaboratorId))
      setCollaborators((prev) =>
        prev.filter((collaborator) => collaborator.id !== collaboratorId)
      )
    } catch (error) {
      console.error('Error removing collaborator:', error)
      throw new Error('Error al remover el colaborador')
    }
  }

  const cancelInvitation = async (invitationId: string) => {
    try {
      await updateDoc(doc(db, 'farmInvitations', invitationId), {
        status: 'rejected',
        updatedAt: Timestamp.now()
      })

      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId))
    } catch (error) {
      console.error('Error canceling invitation:', error)
      throw new Error('Error al cancelar la invitación')
    }
  }

  // Revocar invitación por parte del owner/admin (diferente a rejected por el invitado)
  const revokeInvitation = async (invitationId: string) => {
    try {
      await updateDoc(doc(db, 'farmInvitations', invitationId), {
        status: 'revoked',
        updatedAt: Timestamp.now()
      })
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId))
    } catch (error) {
      console.error('Error revoking invitation:', error)
      throw new Error('Error al revocar la invitación')
    }
  }

  // Eliminación definitiva de la invitación en Firestore
  const deleteInvitation = async (invitationId: string) => {
    try {
      await deleteDoc(doc(db, 'farmInvitations', invitationId))
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId))
    } catch (error) {
      console.error('Error deleting invitation:', error)
      throw new Error('Error al eliminar la invitación')
    }
  }

  const getActiveCollaborators = () => collaborators.filter((c) => c.isActive)
  const getPendingInvitations = () =>
    invitations.filter(
      (inv) => inv.status === 'pending' && new Date() < inv.expiresAt
    )

  const getCollaboratorStats = () => {
    const active = getActiveCollaborators()
    const pending = getPendingInvitations()

    const byRole = active.reduce((acc, collaborator) => {
      acc[collaborator.role] = (acc[collaborator.role] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total: active.length,
      pending: pending.length,
      byRole
    }
  }

  return {
    collaborators,
    invitations,
    isLoading,
    error,
    inviteCollaborator,
    acceptInvitation,
    updateCollaborator,
    removeCollaborator,
    cancelInvitation,
    revokeInvitation,
    deleteInvitation,
    getActiveCollaborators,
    getPendingInvitations,
    getCollaboratorStats,
    refreshCollaborators: loadCollaborators
  }
}
