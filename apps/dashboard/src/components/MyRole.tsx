'use client'

import React from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/features/store'
import { useFarmCRUD } from '@/hooks/useFarmCRUD'
import { useFarmMembers } from '@/hooks/useFarmMembers'
import { collaborator_roles_label } from '@/types/collaborators'

export const roleColors: Record<string, string> = {
  owner: 'bg-green-100 text-green-700',
  admin: 'bg-blue-100 text-blue-700',
  manager: 'bg-purple-100 text-purple-700',
}
export const defaultRoleColor = 'bg-amber-100 text-amber-700'

export function getRoleLabel(role: string): string {
  if (role === 'owner') return 'Propietario'
  return (collaborator_roles_label as Record<string, string>)[role] || role
}

interface MyRoleProps {
  /** Pass a role directly instead of auto-detecting from current farm */
  role?: string
}

const MyRole: React.FC<MyRoleProps> = ({ role: roleProp }) => {
  const { user } = useSelector((s: RootState) => s.auth)
  const { currentFarm } = useFarmCRUD()
  const { collaborators } = useFarmMembers(currentFarm?.id)

  let role = roleProp
  if (!role) {
    if (!user || !currentFarm) return null
    const isOwner = currentFarm.ownerId === user.id
    const myCollaborator = collaborators.find((c) => c.userId === user.id && c.isActive)
    role = isOwner ? 'owner' : myCollaborator?.role
  }

  if (!role) return null

  const colorClass = roleColors[role] || defaultRoleColor

  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${colorClass}`}>
      {getRoleLabel(role)}
    </span>
  )
}

export default MyRole
