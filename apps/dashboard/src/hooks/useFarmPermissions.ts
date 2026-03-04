'use client'

import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/features/store'
import { FarmPermission } from '@/types/farm'
import { useFarmMembers } from './useFarmMembers'

export const useFarmPermissions = () => {
  const { user } = useSelector((s: RootState) => s.auth)
  const { currentFarm } = useSelector((s: RootState) => s.farm)
  const { myFarms } = useSelector((s: RootState) => s.farm)
  const billingStatus = useSelector((s: RootState) => s.billing.status)
  const { collaborators } = useFarmMembers(currentFarm?.id)

  // Cuando la suscripción está suspendida, solo la primera granja propia tiene acceso completo
  const isSuspended = billingStatus === 'suspended'
  const isExtraFarm = useMemo(() => {
    if (!isSuspended || !currentFarm || !user) return false
    // La primera granja propia (por orden de creación) mantiene acceso completo
    const firstOwnedFarm = myFarms[0]
    return currentFarm.id !== firstOwnedFarm?.id
  }, [isSuspended, currentFarm, user, myFarms])

  const myPerms = useMemo(() => {
    if (!currentFarm || !user) return [] as FarmPermission[]

    // Si está suspendido y es una granja extra, solo lectura
    if (isExtraFarm) {
      return [
        { module: 'animals', actions: ['read'] },
        { module: 'reminders', actions: ['read'] },
        { module: 'breeding', actions: ['read'] },
        { module: 'areas', actions: ['read'] },
        { module: 'collaborators', actions: ['read'] },
        { module: 'reports', actions: ['read'] },
      ] as FarmPermission[]
    }

    if (currentFarm.ownerId === user.id) {
      // Owner: acceso total
      return [
        { module: 'animals', actions: ['create', 'read', 'update', 'delete'] },
        {
          module: 'reminders',
          actions: ['create', 'read', 'update', 'delete'],
        },
        { module: 'breeding', actions: ['create', 'read', 'update', 'delete'] },
        { module: 'areas', actions: ['create', 'read', 'update', 'delete'] },
        {
          module: 'collaborators',
          actions: ['create', 'read', 'update', 'delete'],
        },
        { module: 'reports', actions: ['create', 'read', 'update', 'delete'] },
      ]
    }

    const me = collaborators.find((c) => c.userId === user.id && c.isActive)
    return me?.permissions || []
  }, [collaborators, currentFarm, user, isExtraFarm])

  const has = (module: FarmPermission['module'], action: FarmPermission['actions'][number]) => {
    return myPerms.some((p) => p.module === module && p.actions.includes(action))
  }

  return {
    has,
    isSuspended,
    isExtraFarm,
    canReadAnimals: has('animals', 'read'),
    canManageAnimals:
      has('animals', 'create') || has('animals', 'update') || has('animals', 'delete'),
    canReadReminders: has('reminders', 'read'),
    canManageReminders:
      has('reminders', 'create') || has('reminders', 'update') || has('reminders', 'delete'),
  }
}
