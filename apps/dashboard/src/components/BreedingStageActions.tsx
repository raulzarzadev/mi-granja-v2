'use client'

import { useState } from 'react'
import ModalAnimalDetails from '@/components/ModalAnimalDetails'
import ModalBreedingDetails from '@/components/ModalBreedingDetails'
import { useFarmPermissions } from '@/hooks/useFarmPermissions'
import type { Animal } from '@/types/animals'
import type { BreedingRecord } from '@/types/breedings'

export default function BreedingStageActions({
  animal,
  animals,
  records,
}: {
  animal: Animal
  animals: Animal[]
  records: BreedingRecord[]
}) {
  const { has } = useFarmPermissions()
  const [mode, setMode] = useState<'edit' | 'remove' | null>(null)
  const [animalId, setAnimalId] = useState<string | null>(null)
  const candidates = records.filter(
    (record) =>
      record.status !== 'finished' &&
      (record.maleId === animal.id ||
        record.femaleBreedingInfo.some(
          (info) =>
            info.femaleId === animal.id &&
            !info.actualBirthDate &&
            info.outcome !== 'aborted' &&
            info.outcome !== 'open',
        )),
  )
  const record = candidates.length === 1 ? candidates[0] : null
  if (!record)
    return (
      <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
        {candidates.length > 1
          ? 'Hay varios empadres asociados. Revisa la monta desde Empadres.'
          : 'No se encontró el empadre asociado. Revisa la monta desde Empadres.'}
      </p>
    )
  const removalDeletesRecord = animal.id === record.maleId || record.femaleBreedingInfo.length === 1
  const canUpdate = has('breeding', 'update')
  const canRemove = canUpdate && (!removalDeletesRecord || has('breeding', 'delete'))
  const openedAnimal = animals.find((item) => item.id === animalId)
  return (
    <div className="space-y-3">
      <p className="text-center text-sm text-gray-600">
        Está en empadre. Configura la monta o sácalo del empadre para cambiar su etapa.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={!canUpdate}
          onClick={() => setMode('edit')}
          className="min-h-11 cursor-pointer rounded-lg bg-green-600 px-4 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          Configurar monta
        </button>
        <button
          type="button"
          disabled={!canRemove}
          onClick={() => setMode('remove')}
          className="min-h-11 cursor-pointer rounded-lg border border-red-200 px-4 py-3 font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          Sacar del empadre
        </button>
      </div>
      {mode && (
        <ModalBreedingDetails
          key={`${record.id}-${mode}`}
          record={record}
          animals={animals}
          onClose={() => setMode(null)}
          onOpenAnimal={setAnimalId}
          initialEditing={mode === 'edit'}
          initialRemovingAnimal={mode === 'remove' ? animal : null}
        />
      )}
      {openedAnimal && (
        <ModalAnimalDetails animal={openedAnimal} isOpen onClose={() => setAnimalId(null)} />
      )}
    </div>
  )
}
