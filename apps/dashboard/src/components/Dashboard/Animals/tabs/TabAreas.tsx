'use client'

import { useMemo, useState } from 'react'
import FarmMapEditor, { UNASSIGNED_AREA_ID } from '@/components/Dashboard/Animals/FarmMapEditor'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import type { Animal } from '@/types/animals'
import type { FarmArea } from '@/types/farm'

interface TabAreasProps {
  animals: Animal[]
  areas: FarmArea[]
}

export default function TabAreas({ animals, areas }: TabAreasProps) {
  const { assignArea } = useAnimalCRUD()
  const [selectedAnimalId, setSelectedAnimalId] = useState('')
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const activeAreas = useMemo(() => areas.filter((area) => area.isActive), [areas])
  const activeAreaIds = useMemo(() => new Set(activeAreas.map((area) => area.id)), [activeAreas])

  const animalsByArea = useMemo(() => {
    const groups = new Map<string, Animal[]>()
    groups.set(UNASSIGNED_AREA_ID, [])
    activeAreas.forEach((area) => {
      groups.set(area.id, [])
    })

    animals.forEach((animal) => {
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
  }, [activeAreaIds, activeAreas, animals])

  const setAnimalSaving = (animalId: string, isSaving: boolean) => {
    setSavingIds((prev) => {
      const next = new Set(prev)
      if (isSaving) next.add(animalId)
      else next.delete(animalId)
      return next
    })
  }

  const moveAnimal = async (animalId: string, areaId: string) => {
    const nextAreaId = areaId === UNASSIGNED_AREA_ID ? null : areaId
    const animal = animals.find((item) => item.id === animalId)
    if (!animal) return
    if ((animal.currentAreaId ?? null) === nextAreaId) return

    setError(null)
    setAnimalSaving(animalId, true)
    try {
      await assignArea(animalId, nextAreaId)
    } catch (err) {
      console.error('Error moving animal to area:', err)
      setError('No se pudo mover el animal. Intenta de nuevo.')
    } finally {
      setAnimalSaving(animalId, false)
    }
  }

  return (
    <div>
      {error ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
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
