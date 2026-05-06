'use client'

import React from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '@/features/store'
import { useFarmMembers } from '@/hooks/useFarmMembers'

interface Option {
  userId: string
  label: string
}

interface Props {
  value: string[]
  onChange: (next: string[]) => void
  label?: string
  helpText?: string
}

/**
 * Multi-select de usuarios asignables del farm actual.
 * Incluye al dueño + colaboradores activos. Si vacío => va al farmerId por defecto.
 */
const InputSelectAssignees: React.FC<Props> = ({ value, onChange, label, helpText }) => {
  const currentFarm = useSelector((s: RootState) => s.farm.currentFarm)
  const currentUser = useSelector((s: RootState) => s.auth.user)
  const { collaborators } = useFarmMembers(currentFarm?.id)

  const options: Option[] = []
  if (currentFarm?.ownerId) {
    const isMe = currentUser?.id === currentFarm.ownerId
    options.push({
      userId: currentFarm.ownerId,
      label: isMe ? `Yo (dueño)` : 'Dueño',
    })
  }
  for (const c of collaborators) {
    if (!c.isActive) continue
    if (c.userId === currentFarm?.ownerId) continue
    const isMe = currentUser?.id === c.userId
    options.push({
      userId: c.userId,
      label: `${isMe ? 'Yo' : c.email} · ${c.role}`,
    })
  }

  const toggle = (userId: string) => {
    if (value.includes(userId)) onChange(value.filter((id) => id !== userId))
    else onChange([...value, userId])
  }

  if (options.length <= 1) {
    return null
  }

  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = value.includes(opt.userId)
          return (
            <button
              key={opt.userId}
              type="button"
              onClick={() => toggle(opt.userId)}
              aria-pressed={selected}
              className={`px-3 py-1.5 rounded-full border text-sm cursor-pointer transition-colors ${
                selected
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      {helpText && <p className="text-xs text-gray-500 mt-1">{helpText}</p>}
    </div>
  )
}

export default InputSelectAssignees
