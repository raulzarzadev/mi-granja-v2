'use client'

import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/features/store'
import { FarmPermission } from '@/types/farm'
import { useFarmCollaborators } from './useFarmCollaborators'

export const useFarmPermissions = () => {
  const { user } = useSelector((s: RootState) => s.auth)
  const { currentFarm } = useSelector((s: RootState) => s.farm)
  const { collaborators } = useFarmCollaborators(currentFarm?.id)

  const myPerms = useMemo(() => {
    if (!currentFarm || !user) return [] as FarmPermission[]
    if (currentFarm.ownerId === user.id) {
      // Owner: acceso total
      return [
        { module: 'animals', actions: ['create', 'read', 'update', 'delete'] },
        {
          module: 'reminders',
          actions: ['create', 'read', 'update', 'delete']
        },
        { module: 'breeding', actions: ['create', 'read', 'update', 'delete'] },
        { module: 'areas', actions: ['create', 'read', 'update', 'delete'] },
        {
          module: 'collaborators',
          actions: ['create', 'read', 'update', 'delete']
        },
        { module: 'reports', actions: ['create', 'read', 'update', 'delete'] }
      ]
    }

    const me = collaborators.find((c) => c.userId === user.id && c.isActive)
    return me?.permissions || []
  }, [collaborators, currentFarm, user])

  const has = (
    module: FarmPermission['module'],
    action: FarmPermission['actions'][number]
  ) => {
    return myPerms.some(
      (p) => p.module === module && p.actions.includes(action)
    )
  }

  return {
    has,
    canReadAnimals: has('animals', 'read'),
    canManageAnimals:
      has('animals', 'create') ||
      has('animals', 'update') ||
      has('animals', 'delete'),
    canReadReminders: has('reminders', 'read'),
    canManageReminders:
      has('reminders', 'create') ||
      has('reminders', 'update') ||
      has('reminders', 'delete')
  }
}
