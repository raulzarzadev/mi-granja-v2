'use client'

import React from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/features/store'
import { useFarmMembers } from '@/hooks/useFarmMembers'
import { collaborator_roles_label } from '@/types/collaborators'
import { Farm } from '@/types/farm'

const roleConfig: Record<string, { color: string; icon: string }> = {
  owner: { color: 'bg-purple-100 text-purple-700', icon: '🏠' },
  admin: { color: 'bg-blue-100 text-blue-700', icon: '👑' },
  manager: { color: 'bg-indigo-100 text-indigo-700', icon: '👨‍💼' },
  caretaker: { color: 'bg-amber-100 text-amber-700', icon: '👨‍🌾' },
  veterinarian: { color: 'bg-teal-100 text-teal-700', icon: '👨‍⚕️' },
  viewer: { color: 'bg-gray-100 text-gray-600', icon: '👁️' },
}
const defaultConfig = { color: 'bg-gray-100 text-gray-600', icon: '👤' }

export function getRoleLabel(role: string): string {
  if (role === 'owner') return 'Propietario'
  return (collaborator_roles_label as Record<string, string>)[role] || role
}

interface MyRoleProps {
  farm: Farm
}

const MyRole: React.FC<MyRoleProps> = ({ farm }) => {
  const { user } = useSelector((s: RootState) => s.auth)
  const { collaborators } = useFarmMembers(farm.id)
  if (!user) return null

  let role: string | undefined

  if (farm.ownerId === user.id) {
    role = 'owner'
  } else if (farm.invitationMeta?.role) {
    role = farm.invitationMeta.role
  } else {
    const collab = collaborators.find((c) => c.userId === user.id && c.isActive)
    role = collab?.role
  }
  if (!role) return null

  const { color, icon } = roleConfig[role] || defaultConfig

  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-medium ${color}`}
    >
      <span>{icon}</span>
      {getRoleLabel(role)}
    </span>
  )
}

export default MyRole
