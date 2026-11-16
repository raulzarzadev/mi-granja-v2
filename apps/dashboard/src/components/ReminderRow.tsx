'use client'

import { useState } from 'react'
import { Modal } from '@/components/Modal'
import ModalReminderForm from '@/components/ModalReminderForm'
import PendingRow, { formatShortDate } from '@/components/PendingRow'
import ReminderCard from '@/components/ReminderCard'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useReminders } from '@/hooks/useReminders'
import type { Reminder } from '@/types'

export const REMINDER_TYPE_ICONS: Record<Reminder['type'], string> = {
  medical: '🏥',
  breeding: '🐣',
  feeding: '🌾',
  weight: '⚖️',
  other: '📝',
}

const DAY_MS = 86400000
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

/** Fila compacta de un recordatorio; abre su detalle en un modal (completar, editar, eliminar). */
export default function ReminderRow({ reminder }: { reminder: Reminder }) {
  const [isOpen, setIsOpen] = useState(false)
  const dueDate = new Date(reminder.dueDate)
  const validDate = !Number.isNaN(dueDate.getTime())
  const daysUntil = validDate
    ? Math.round((startOfDay(dueDate).getTime() - startOfDay(new Date()).getTime()) / DAY_MS)
    : undefined
  const animalNumbers = reminder.animalNumbers?.length
    ? reminder.animalNumbers
    : reminder.animalNumber
      ? [reminder.animalNumber]
      : []
  const subtitle = [
    validDate ? formatShortDate(dueDate) : null,
    animalNumbers.length > 3
      ? `${animalNumbers.length} animales`
      : animalNumbers.join(', ') || null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      <PendingRow
        onClick={() => setIsOpen(true)}
        emoji={REMINDER_TYPE_ICONS[reminder.type] ?? '📝'}
        title={reminder.title}
        subtitle={subtitle}
        daysUntil={reminder.completed ? undefined : daysUntil}
        rightLabel={reminder.completed ? 'Completado' : undefined}
        muted={reminder.completed}
        badge={
          !reminder.completed && reminder.priority === 'high' ? (
            <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Alta</span>
          ) : undefined
        }
      />
      <ReminderDetailModal reminder={reminder} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}

/**
 * Detalle de un recordatorio en modal (completar, editar, eliminar). Al editar cambia al
 * formulario y `onClose` se llama cuando este se cierra.
 */
export function ReminderDetailModal({
  reminder,
  isOpen,
  onClose,
}: {
  reminder: Reminder
  isOpen: boolean
  onClose: () => void
}) {
  const { animals } = useAnimalCRUD()
  const { markAsCompleted, markAnimalCompleted, deleteReminder } = useReminders()
  const [isEditing, setIsEditing] = useState(false)
  return (
    <>
      <Modal isOpen={isOpen && !isEditing} onClose={onClose} title="Recordatorio">
        <ReminderCard
          reminder={reminder}
          animals={animals}
          onComplete={reminder.completed ? undefined : (r) => markAsCompleted(r.id)}
          onCompleteAnimal={
            reminder.completed
              ? undefined
              : (r, animalNumber, completed) => markAnimalCompleted(r.id, animalNumber, completed)
          }
          onEdit={() => setIsEditing(true)}
          onDelete={async (r) => {
            await deleteReminder(r.id)
            onClose()
          }}
        />
      </Modal>
      <ModalReminderForm
        isOpen={isOpen && isEditing}
        onClose={() => {
          setIsEditing(false)
          onClose()
        }}
        editingReminder={reminder}
      />
    </>
  )
}
