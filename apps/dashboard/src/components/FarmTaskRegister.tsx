'use client'

import RegisterBirthFromStage from '@/components/RegisterBirthFromStage'
import { ModalWeanAnimal } from '@/components/WeanedAnimal'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import type { FarmPendingTask } from '@/hooks/useFarmPendingTasks'
import { getWeaningDueDate } from '@/lib/animal-utils'

/**
 * Formulario existente para registrar un parto o destete pendiente. Debe montarse fuera de
 * la fila que lo abre: al guardar, la tarea deja de estar pendiente y la fila desaparece.
 */
export default function FarmTaskRegister({
  task,
  onClose,
}: {
  task: FarmPendingTask
  onClose: () => void
}) {
  const { animals } = useAnimalCRUD()
  if (task.kind === 'parto') {
    return (
      <RegisterBirthFromStage
        motherId={task.animal.id}
        animals={animals}
        onClose={onClose}
        onCompleted={onClose}
      />
    )
  }
  return (
    <ModalWeanAnimal
      animal={task.animal}
      targetWeanDate={getWeaningDueDate(task.animal) ?? task.dueDate}
      onClose={onClose}
    />
  )
}
