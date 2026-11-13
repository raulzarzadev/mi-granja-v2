'use client'

import { useMemo, useState } from 'react'
import { PiX } from 'react-icons/pi'
import { useAppFeedback } from '@/components/AppFeedbackProvider'
import Button from '@/components/buttons/Button'
import FarmMapEditor, { UNASSIGNED_AREA_ID } from '@/components/Dashboard/Animals/FarmMapEditor'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useFarmCRUD } from '@/hooks/useFarmCRUD'
import { useOptimisticAreaMoves } from '@/hooks/useOptimisticAreaMoves'
import type { Animal } from '@/types/animals'
import type { FarmArea } from '@/types/farm'

interface TabAreasProps {
  animals: Animal[]
  areas: FarmArea[]
}

export default function TabAreas({ animals, areas }: TabAreasProps) {
  const { assignArea } = useAnimalCRUD()
  const [selectedAnimalId, setSelectedAnimalId] = useState('')
  const { currentFarm } = useFarmCRUD()
  const { notify } = useAppFeedback()
  const { visibleAnimals, moveAnimal, failures, retry, dismissFailure, savingIds } =
    useOptimisticAreaMoves({
      scopeId: currentFarm?.id ?? '',
      animals,
      persistArea: assignArea,
      onFailure: (failure) =>
        notify(`No se pudo mover ${failure.animalNumber}. Puedes reintentarlo.`, 'error'),
    })

  const activeAreas = useMemo(() => areas.filter((area) => area.isActive), [areas])
  const activeAreaIds = useMemo(() => new Set(activeAreas.map((area) => area.id)), [activeAreas])

  const animalsByArea = useMemo(() => {
    const groups = new Map<string, Animal[]>()
    groups.set(UNASSIGNED_AREA_ID, [])
    activeAreas.forEach((area) => {
      groups.set(area.id, [])
    })

    visibleAnimals.forEach((animal) => {
      const areaId =
        animal.currentAreaId && activeAreaIds.has(animal.currentAreaId)
          ? animal.currentAreaId
          : UNASSIGNED_AREA_ID
      groups.get(areaId)?.push(animal)
    })

    groups.forEach((group) => {
      group.sort((a, b) => a.animalNumber.localeCompare(b.animalNumber, 'es', { numeric: true }))
    })

    return groups
  }, [activeAreaIds, activeAreas, visibleAnimals])

  return (
    <div>
      {failures.length ? (
        <div className="mb-3 space-y-2">
          {failures.map((failure) => (
            <div
              key={failure.animalId}
              role="alert"
              className="flex flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2"
            >
              <p className="min-w-0 flex-1 text-sm text-red-800">
                No se pudo mover <strong>{failure.animalNumber}</strong> a{' '}
                {failure.areaId
                  ? (areas.find((area) => area.id === failure.areaId)?.name ?? 'su área de destino')
                  : 'pendientes'}
                . Revisa su ubicación y vuelve a intentarlo.
              </p>
              <Button
                type="button"
                size="sm"
                color="error"
                variant="ghost"
                className="min-h-11 rounded-lg"
                onClick={() => {
                  void retry(failure).catch(() =>
                    notify('El animal ya no está disponible. Actualiza la vista.', 'error'),
                  )
                }}
              >
                Reintentar
              </Button>
              <button
                type="button"
                aria-label={`Cerrar aviso de ${failure.animalNumber}`}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-red-700 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                onClick={() => dismissFailure(failure.animalId)}
              >
                <PiX aria-hidden="true" size={18} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <FarmMapEditor
        areas={activeAreas}
        animalsByArea={animalsByArea}
        selectedAnimalId={selectedAnimalId}
        savingIds={savingIds}
        onSelectAnimal={setSelectedAnimalId}
        onMoveAnimal={moveAnimal}
      />
    </div>
  )
}
