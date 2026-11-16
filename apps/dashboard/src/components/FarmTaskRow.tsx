'use client'

import { useState } from 'react'
import AnimalTag from '@/components/AnimalTag'
import Button from '@/components/buttons/Button'
import { EmojiIcon } from '@/components/Icon/emoji-icons'
import { Modal } from '@/components/Modal'
import PendingRow, { dueLabel, formatShortDate } from '@/components/PendingRow'
import type { FarmPendingTask } from '@/hooks/useFarmPendingTasks'

const KIND_CONFIG: Record<
  FarmPendingTask['kind'],
  { label: string; emoji: string; dateLabel: string; action: string }
> = {
  parto: {
    label: 'Parto',
    emoji: '🤰',
    dateLabel: 'Fecha esperada de parto',
    action: 'Registrar parto',
  },
  destete: {
    label: 'Destete',
    emoji: '🍼',
    dateLabel: 'Fecha recomendada de destete',
    action: 'Registrar destete',
  },
}

/**
 * Fila de un parto o destete pendiente; abre su detalle con la etiqueta del animal
 * y el botón para registrarlo. `onRegister` abre el formulario existente en el padre
 * para que sobreviva cuando la fila desaparece al guardar.
 */
export default function FarmTaskRow({
  task,
  onRegister,
}: {
  task: FarmPendingTask
  onRegister?: (task: FarmPendingTask) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const { label, emoji, dateLabel, action } = KIND_CONFIG[task.kind]
  const overdue = task.daysUntil < 0
  return (
    <>
      <PendingRow
        emoji={emoji}
        title={`${label} · ${task.animal.animalNumber}`}
        subtitle={formatShortDate(task.dueDate)}
        daysUntil={task.daysUntil}
        onClick={() => setIsOpen(true)}
      />
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={`${label} pendiente`}>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              <EmojiIcon emoji={emoji} />
            </span>
            <div>
              <p className="text-sm text-gray-500">{dateLabel}</p>
              <p className="font-medium text-gray-900">
                {task.dueDate.toLocaleDateString('es-MX', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <span
              className={`ml-auto text-xs px-2 py-1 rounded-full font-medium ${
                overdue ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {dueLabel(task.daysUntil)}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Animal</p>
            <AnimalTag animal={task.animal} showModalOnClick />
          </div>
          {onRegister && (
            <Button
              color="success"
              className="w-full"
              onClick={() => {
                setIsOpen(false)
                onRegister(task)
              }}
            >
              {action}
            </Button>
          )}
        </div>
      </Modal>
    </>
  )
}
