'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
  onSnapshot,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { FarmInvitation, FarmPermission } from '@/types/farm'
import {
  collaborator_roles_label,
  DEFAULT_PERMISSIONS,
  FarmCollaborator
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
  const collaborators: FarmCollaborator[] = useMemo(() => {
    return invitations.map((i) => {
      // Si la invitación está aceptada y el email coincide con el usuario autenticado
      // pero aún no tiene userId persistido, usamos el user.id actual para que
      // los permisos funcionen correctamente.
      const resolvedUserId =
        (i as any).userId ||
        (i.status === 'accepted' && user?.email && user.email === i.email
          ? user.id
          : i.email)

      return {
        id: i.id,
        farmId: i.farmId,
        userId: resolvedUserId,
        email: i.email,
        role: i.role,
        permissions: DEFAULT_PERMISSIONS[i.role] as FarmPermission[],
        isActive: i.status === 'accepted',
        invitedBy: i.invitedBy,
        invitedAt: i.createdAt,
        acceptedAt: (i as any).acceptedAt || i.updatedAt,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
        notes: (i as any).notes,
        invitationMeta: {
          invitationId: (i as any).invitationId || i.id,
          status: i.status,
          role: i.role,
          invitedBy: i.invitedBy,
          invitedByEmail: (i as any).invitedByEmail,
          invitedAt: i.createdAt,
          acceptedAt: (i as any).acceptedAt
        }
      }
    })
  }, [invitations, user])

  // Permisos efectivos del usuario actual (owner = todos)
  const myEffectivePermissions = useMemo(() => {
    if (!currentFarm || !user) return [] as FarmPermission[]
    if (currentFarm.ownerId === user.id) {
      return [
        { module: 'animals', actions: ['create', 'read', 'update', 'delete'] },
        { module: 'breeding', actions: ['create', 'read', 'update', 'delete'] },
        {
          module: 'reminders',
          actions: ['create', 'read', 'update', 'delete']
        },
        { module: 'areas', actions: ['create', 'read', 'update', 'delete'] },
        {
          module: 'collaborators',
          actions: ['create', 'read', 'update', 'delete']
        },
        { module: 'reports', actions: ['create', 'read', 'update', 'delete'] }
      ] as FarmPermission[]
    }
    const me = collaborators.find((c) => c.userId === user.id && c.isActive)
    return me?.permissions || []
  }, [currentFarm, user, collaborators])

  // hasPermissions: verifica si el usuario actual tiene TODAS las acciones solicitadas en un módulo
  const hasPermissions = useCallback(
    (
      module: FarmPermission['module'],
      required:
        | FarmPermission['actions'][number]
        | FarmPermission['actions'][number][]
    ) => {
      // Owner siempre true
      if (currentFarm && user && currentFarm.ownerId === user.id) return true

      // Si el colaborador es admin => true
      const me = collaborators.find((c) => c.userId === user?.id && c.isActive)
      if (me?.role === 'admin') return true

      const requiredArr = Array.isArray(required) ? required : [required]
      return requiredArr.every((act) =>
        myEffectivePermissions.some(
          (p) => p.module === module && p.actions.includes(act)
        )
      )
    },
    [currentFarm, user, collaborators, myEffectivePermissions]
  )

  const pendingInvitations = invitations.filter((i) => i.status === 'pending')
  const activeCollaborators = collaborators.filter((i) => i.isActive)

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
    // Añadir a arrays de la granja para validación por reglas
    try {
      const inv = invitations.find((i) => i.id === invitationId)
      if (inv?.farmId) {
        const farmRef = doc(db, 'farms', inv.farmId)
        await updateDoc(farmRef, {
          collaboratorsIds: arrayUnion(userId),
          ...(inv.email
            ? { collaboratorsEmails: arrayUnion(inv.email.toLowerCase()) }
            : {})
        })
      }
    } catch (e) {
      console.warn('No se pudo actualizar arrays de colaboradores en farm:', e)
    }
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
    // Lógica: revocar (temporal) requiere permiso update sobre colaboradores
    if (!hasPermissions('collaborators', 'update')) {
      throw new Error('No autorizado para revocar invitaciones')
    }
    const ref = doc(db, 'farmInvitations', invitationId)
    await updateDoc(ref, { status: 'revoked', updatedAt: Timestamp.now() })
    // Quitar de arrays de la granja si estaba aceptada (tiene userId)
    try {
      const inv = invitations.find((i) => i.id === invitationId)
      if (inv?.farmId && (inv as any).userId) {
        const farmRef = doc(db, 'farms', inv.farmId)
        await updateDoc(farmRef, {
          collaboratorsIds: arrayRemove((inv as any).userId),
          ...(inv.email
            ? { collaboratorsEmails: arrayRemove(inv.email.toLowerCase()) }
            : {})
        })
      }
    } catch (e) {
      console.warn('No se pudo quitar colaborador de arrays en farm:', e)
    }
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
    // Eliminar definitiva: requiere permiso delete sobre colaboradores
    if (!hasPermissions('collaborators', 'delete')) {
      throw new Error('No autorizado para eliminar invitaciones')
    }
    // Si estaba aceptada, quitar de arrays
    try {
      const inv = invitations.find((i) => i.id === invitationId)
      if (inv?.farmId && (inv as any).userId) {
        const farmRef = doc(db, 'farms', inv.farmId)
        await updateDoc(farmRef, {
          collaboratorsIds: arrayRemove((inv as any).userId),
          ...(inv.email
            ? { collaboratorsEmails: arrayRemove(inv.email.toLowerCase()) }
            : {})
        })
      }
    } catch (e) {
      console.warn(
        'No se pudo limpiar arrays de farm al eliminar invitación:',
        e
      )
    }
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

    // Sincronizar arrays en farms si cambia estado activo
    try {
      if (typeof updates.isActive === 'boolean') {
        const farmRef = doc(db, 'farms', inv.farmId)
        const userId = (inv as any).userId
        const email = inv.email?.toLowerCase()
        if (updates.isActive) {
          // Activado -> accepted
          await updateDoc(farmRef, {
            ...(userId ? { collaboratorsIds: arrayUnion(userId) } : {}),
            ...(email ? { collaboratorsEmails: arrayUnion(email) } : {})
          })
        } else {
          // Desactivado -> revoked
          await updateDoc(farmRef, {
            ...(userId ? { collaboratorsIds: arrayRemove(userId) } : {}),
            ...(email ? { collaboratorsEmails: arrayRemove(email) } : {})
          })
        }
      }
    } catch (e) {
      console.warn(
        'No se pudo sincronizar arrays de farm tras update colaborador:',
        e
      )
    }

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
    collaborators: activeCollaborators,
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
    hasPermissions,

    // Utilidades
    getCollaboratorStats,
    refresh: load
  }
}
