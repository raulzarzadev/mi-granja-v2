'use client'

import { addDays, differenceInCalendarDays } from 'date-fns'
import { useRouter } from 'next/navigation'
import React, { useCallback, useMemo, useState } from 'react'
import AnimalCard from '@/components/AnimalCard'
import BreedingCard from '@/components/BreedingCard'
import BreedingTable from '@/components/BreedingTable'
import Button from '@/components/buttons/Button'
import ButtonConfirm from '@/components/buttons/ButtonConfirm'
import NumbersTab from '@/components/Dashboard/Animals/NumbersTab'
import DataTable, { ColumnDef } from '@/components/DataTable'
import { Icon } from '@/components/Icon/icon'
import { Modal } from '@/components/Modal'
import ModalAnimalDetails from '@/components/ModalAnimalDetails'
import ModalBirthForm from '@/components/ModalBirthForm'
import ModalBreedingAnimalDetails from '@/components/ModalBreedingAnimalDetails'
import ModalBulkEdit from '@/components/ModalBulkEdit'
import ModalConfirmPregnancy from '@/components/ModalConfirmPregnancy'
import ModalOnboarding from '@/components/onboarding/ModalOnboarding'
import StatisticsTab from '@/components/StatisticsTab'
import Tabs from '@/components/Tabs'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useBreedingCRUD } from '@/hooks/useBreedingCRUD'
import {
  animalAge,
  computeAnimalEffectiveStage,
  computeAnimalStage,
  findAnimalByRef,
  formatWeight,
} from '@/lib/animal-utils'
import { calculateExpectedBirthDate, getWeaningDays } from '@/lib/animalBreedingConfig'
import { formatDate, toDate } from '@/lib/dates'
import {
  Animal,
  AnimalStageKey,
  animal_gender_config,
  animal_stage_config,
  animal_status_colors,
  animal_status_labels,
  animals_types_labels,
} from '@/types/animals'
import { BreedingRecord, FemaleBreedingInfo } from '@/types/breedings'
import { BreedingActionHandlers } from '@/types/components/breeding'
import ModalBulkHealthAction from '../../ModalBulkHealthAction'
import ModalSaleForm from '../../ModalSaleForm'
import { AnimalFilters, AnimalsFilters, useAnimalFilters } from './animals-filters'
import { buildAllAnimalColumns, buildAnimalColumns } from './columns/animalColumns'
import { buildDestetesColumns, type UnweanedRow } from './columns/destetesColumns'
import { buildPartosColumns, type EnrichedPregnant } from './columns/partosColumns'
import { useAnimalStages } from './hooks/useAnimalStages'
import { useBreedingHandlers } from './hooks/useBreedingHandlers'
import { usePregnantFemales } from './hooks/usePregnantFemales'
import SimpleStageTab from './stages/SimpleStageTab'
import TabEtapas from './tabs/TabEtapas'
import TabTodos from './tabs/TabTodos'

const ICON_GENDER_SIZE = 4

interface AnimalsSectionProps {
  filters: AnimalFilters
  setFilters: React.Dispatch<React.SetStateAction<AnimalFilters>>
}

// --- Helpers para agrupación de hembras por status ---
type FemaleGroup = {
  key: 'empadre' | 'embarazada' | 'parida'
  label: string
  items: FemaleBreedingInfo[]
}

export function groupFemalesByStatus(females: FemaleBreedingInfo[]): FemaleGroup[] {
  return [
    {
      key: 'empadre',
      label: 'En empadre',
      items: females.filter((fi) => !fi.pregnancyConfirmedDate && !fi.actualBirthDate),
    },
    {
      key: 'embarazada',
      label: 'Embarazada',
      items: females.filter((fi) => fi.pregnancyConfirmedDate && !fi.actualBirthDate),
    },
    { key: 'parida', label: 'Parida', items: females.filter((fi) => fi.actualBirthDate) },
  ]
}

const CHIP_COLORS: Record<FemaleGroup['key'], string> = {
  empadre: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  embarazada: 'bg-blue-50 text-blue-800 border-blue-200',
  parida: 'bg-green-50 text-green-800 border-green-200',
}

export function sortFemalesByAnimalNumber(items: FemaleBreedingInfo[], animals: Animal[]) {
  return [...items].sort((a, b) => {
    const numA = animals.find((an) => an.id === a.femaleId)?.animalNumber || ''
    const numB = animals.find((an) => an.id === b.femaleId)?.animalNumber || ''
    return numA.localeCompare(numB, 'es', { numeric: true })
  })
}

/**
 * Sección de Animales con sub-tabs: Todos, Etapas, Estadísticas
 */
const AnimalsSection: React.FC<AnimalsSectionProps> = ({ filters, setFilters }) => {
  const router = useRouter()
  const {
    animals,
    isLoading: isLoadingAnimals,
    wean,
    create,
    addRecord,
    update,
    remove,
  } = useAnimalCRUD()
  const { breedingRecords, updateBreedingRecord, deleteBreedingRecord, getBirthsWindow } =
    useBreedingCRUD()

  const {
    filteredAnimals,
    animals: allAnimals,
    formatStatLabel,
    activeFilterCount,
    availableTypes,
    availableBreeds,
    availableStages,
    availableGenders,
  } = useAnimalFilters({ filters, setFilters })

  // Bulk actions state
  const [isBulkHealthModalOpen, setIsBulkHealthModalOpen] = useState(false)
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false)
  const [bulkSelectedAnimals, setBulkSelectedAnimals] = useState<string[]>([])
  const [bulkClearFn, setBulkClearFn] = useState<(() => void) | null>(null)

  // Breeding modals state
  const [birthRecord, setBirthRecord] = useState<BreedingRecord | null>(null)
  const [birthFemaleId, setBirthFemaleId] = useState<string | null>(null)
  const [confirmPregnancyRecord, setConfirmPregnancyRecord] = useState<BreedingRecord | null>(null)
  const [selectedAnimal, setSelectedAnimal] = useState<null | string>(null)
  const [weanConfirm, setWeanConfirm] = useState<{
    animals: { id: string; number: string }[]
    decision: 'engorda' | 'reproductor'
  } | null>(null)
  const [isWeaning, setIsWeaning] = useState(false)
  const [weanSuccess, setWeanSuccess] = useState<{
    animalNumbers: string[]
    decision: 'engorda' | 'reproductor'
  } | null>(null)
  const [selectedWeanIds, setSelectedWeanIds] = useState<Set<string>>(new Set())
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false)
  const [viewingBreedingRecord, setViewingBreedingRecord] = useState<BreedingRecord | null>(null)
  const [viewingConfirming, setViewingConfirming] = useState(false)

  const editRecord = (record: BreedingRecord) => router.push(`/empadre/${record.id}/editar`)

  const { handleRemoveFromBreeding, handleUnconfirmPregnancy, handleRevertBirth, weanAndUpdateMother } =
    useBreedingHandlers({
      animals,
      update,
      remove,
      wean,
      addRecord,
      updateBreedingRecord,
      deleteBreedingRecord,
    })

  // --- Breeding modal triggers ---
  const handleOpenAddBirth: BreedingActionHandlers['onAddBirth'] = (record, femaleId) => {
    setBirthRecord(record)
    setBirthFemaleId(femaleId)
  }
  const handleOpenConfirmPregnancy: BreedingActionHandlers['onConfirmPregnancy'] = (
    props,
    femaleId,
  ) => {
    setConfirmPregnancyRecord(props)
    setSelectedAnimal(femaleId)
  }

  const handleWeanConfirm = async () => {
    if (!weanConfirm) return
    setIsWeaning(true)
    try {
      const mothersToCheck = new Set<string>()
      for (const a of weanConfirm.animals) {
        await wean(a.id, { stageDecision: weanConfirm.decision })
        const animal = animals.find((an) => an.id === a.id)
        if (animal?.motherId) mothersToCheck.add(animal.motherId)
      }
      // Verificar si las madres ya no tienen crías sin destetar
      for (const motherId of mothersToCheck) {
        const remainingCrias = animals.filter(
          (an) =>
            an.motherId === motherId &&
            an.stage === 'cria' &&
            an.status !== 'muerto' &&
            an.status !== 'vendido' &&
            !weanConfirm.animals.some((w) => w.id === an.id),
        )
        if (remainingCrias.length === 0) {
          await update(motherId, { weanedMotherAt: new Date(), birthedAt: null })
        }
      }
      setWeanSuccess({
        animalNumbers: weanConfirm.animals.map((a) => a.number),
        decision: weanConfirm.decision,
      })
      setWeanConfirm(null)
      setSelectedWeanIds(new Set())
    } catch (e) {
      console.error(e)
    } finally {
      setIsWeaning(false)
    }
  }

  const _toggleWeanSelect = (id: string) => {
    setSelectedWeanIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openBulkWean = (decision: 'engorda' | 'reproductor') => {
    const selected = unweanedOffspring
      .filter(({ animal: a }) => selectedWeanIds.has(a.id))
      .map(({ animal: a }) => ({ id: a.id, number: a.animalNumber }))
    if (selected.length === 0) return
    setWeanConfirm({ animals: selected, decision })
  }

  // --- Filtro compartido para etapas (usa los mismos filters de useAnimalFilters) ---
  const matchesEtapasFilters = useCallback(
    (animal: Animal | undefined, { skipSearch = false }: { skipSearch?: boolean } = {}) => {
    if (!animal) return false
    if (filters.type && animal.type !== filters.type) return false
    if (filters.breed && animal.breed !== filters.breed) return false
    if (filters.gender && animal.gender !== filters.gender) return false
    if (!skipSearch) {
      const q = filters.search.trim().toLowerCase()
      if (q) {
        const num = animal.animalNumber?.toLowerCase() || ''
        const name = animal.name?.toLowerCase() || ''
        const notes = animal.notes?.toLowerCase() || ''
        if (!num.includes(q) && !name.includes(q) && !notes.includes(q)) return false
      }
    }
    return true
    },
    [filters],
  )

  // --- Animales activos ---
  const activeAnimals = useMemo(
    () => animals.filter((a) => (a.status ?? 'activo') === 'activo'),
    [animals],
  )

  // --- Empadres filtrados por tipo/raza/género/búsqueda ---
  const filteredBreedingRecords = useMemo(() => {
    const hasFilters = filters.type || filters.breed || filters.gender
    const q = filters.search.trim().toLowerCase()
    if (!hasFilters && !q) return breedingRecords
    return breedingRecords.filter((r) => {
      const male = animals.find((a) => a.id === r.maleId)
      const females = r.femaleBreedingInfo.map((f) => animals.find((a) => a.id === f.femaleId))
      const involved = [male, ...females]
      if (hasFilters && !involved.some((a) => matchesEtapasFilters(a))) return false
      if (q) {
        const idMatch = (r.breedingId || r.id || '').toLowerCase().includes(q)
        const animalMatch = involved.some((a) => {
          if (!a) return false
          const num = a.animalNumber?.toLowerCase() || ''
          const name = a.name?.toLowerCase() || ''
          return num.includes(q) || name.includes(q)
        })
        if (!idMatch && !animalMatch) return false
      }
      return true
    })
  }, [breedingRecords, animals, filters])

  // --- Empadres ordenados ---
  const orderedBreedings = useMemo(() => {
    const needPregnancyConfirmation: BreedingRecord[] = []
    const terminated: BreedingRecord[] = []

    filteredBreedingRecords.forEach((r) => {
      if (r.status === 'finished') {
        terminated.push(r)
        return
      }
      const hasPendingPregnancyConfirm = r.femaleBreedingInfo.some(
        (f) => !f.pregnancyConfirmedDate && !f.actualBirthDate,
      )
      if (hasPendingPregnancyConfirm) {
        needPregnancyConfirmation.push(r)
      } else {
        // Todas confirmadas o paridas — empadre terminado
        terminated.push(r)
      }
    })

    const sortDesc = (a: BreedingRecord, b: BreedingRecord) =>
      (b.breedingDate?.getTime() || 0) - (a.breedingDate?.getTime() || 0)

    return {
      needPregnancyConfirmation: needPregnancyConfirmation.sort(sortDesc),
      terminated: terminated.sort(sortDesc),
    }
  }, [filteredBreedingRecords])

  // --- Partos próximos (hembras embarazadas) ---
  const pregnantFemales = usePregnantFemales({
    activeAnimals,
    animals,
    breedingRecords,
    matchesEtapasFilters,
  })
  const rawBirthsWindow = getBirthsWindow(14)
  const birthsWindow = useMemo(() => {
    if (!filters.type && !filters.breed && !filters.gender) return rawBirthsWindow
    const filterEntry = (e: (typeof rawBirthsWindow.pastDue)[number]) => {
      const animal = animals.find((a) => a.id === e.info.femaleId)
      return matchesEtapasFilters(animal, { skipSearch: true })
    }
    return {
      pastDue: rawBirthsWindow.pastDue.filter(filterEntry),
      upcoming: rawBirthsWindow.upcoming.filter(filterEntry),
      days: rawBirthsWindow.days,
    }
  }, [rawBirthsWindow, animals, filters])
  const _birthsSummary = useMemo(
    () => ({
      pastDueCount: birthsWindow.pastDue.length,
      upcomingCount: birthsWindow.upcoming.length,
      windowDays: birthsWindow.days,
    }),
    [birthsWindow],
  )

  // --- Destetes próximos ---
  const unweanedOffspring = useMemo(() => {
    const result: {
      animal: (typeof animals)[number]
      motherId: string
      record: BreedingRecord
      weanDate: Date | null
      daysUntilWean: number | null
    }[] = []
    for (const record of breedingRecords) {
      for (const fi of record.femaleBreedingInfo) {
        if (!fi.offspring || fi.offspring.length === 0) continue
        for (const offId of fi.offspring) {
          const a = animals.find((an) => an.id === offId)
          if (
            a &&
            a.stage === 'cria' &&
            a.status !== 'muerto' &&
            a.status !== 'vendido' &&
            matchesEtapasFilters(a, { skipSearch: true }) &&
            (() => {
              const q = filters.search.trim().toLowerCase()
              if (!q) return true
              const num = a.animalNumber?.toLowerCase() || ''
              const name = a.name?.toLowerCase() || ''
              const brId = (record.breedingId || record.id || '').toLowerCase()
              const mother = animals.find((an) => an.id === fi.femaleId)
              const motherNum = mother?.animalNumber?.toLowerCase() || ''
              const motherName = mother?.name?.toLowerCase() || ''
              return (
                num.includes(q) ||
                name.includes(q) ||
                brId.includes(q) ||
                motherNum.includes(q) ||
                motherName.includes(q)
              )
            })()
          ) {
            let weanDate: Date | null = null
            let daysUntilWean: number | null = null
            if (a.birthDate) {
              const days = getWeaningDays(a)
              weanDate = addDays(toDate(a.birthDate), days)
              daysUntilWean = differenceInCalendarDays(weanDate, new Date())
            }
            result.push({ animal: a, motherId: fi.femaleId, record, weanDate, daysUntilWean })
          }
        }
      }
    }
    return result
  }, [breedingRecords, animals, filters])

  const destetesColumns = useMemo(() => buildDestetesColumns(animals), [animals])

  // Madres únicas amamantando — se calcula después de allCrias para ser consistente con filtros

  // IDs de animales ya contados en tabs de breeding (Empadre, Embarazos, Crías)
  const breedingTabIds = useMemo(() => {
    const ids = new Set<string>()
    // Hembras en empadre (pendientes de confirmar embarazo)
    for (const r of orderedBreedings.needPregnancyConfirmation) {
      for (const f of r.femaleBreedingInfo) {
        if (!f.pregnancyConfirmedDate && !f.actualBirthDate) ids.add(f.femaleId)
      }
    }
    // Hembras embarazadas
    for (const entry of pregnantFemales) ids.add(entry.animal.id)
    // Crías en destete
    for (const entry of unweanedOffspring) ids.add(entry.animal.id)
    // Madres amamantando (por offspring en stage cria)
    const activeCriaIds = new Set(
      activeAnimals.filter((a) => computeAnimalStage(a) === 'cria').map((a) => a.id),
    )
    for (const r of breedingRecords) {
      for (const fi of r.femaleBreedingInfo) {
        if (fi.offspring?.some((offId) => activeCriaIds.has(offId))) {
          if (!ids.has(fi.femaleId)) ids.add(fi.femaleId)
        }
      }
    }
    // Madres standalone: crías cuyo motherId apunta a un animal directamente
    // (sin enlace en breeding records). Resolver por id o animalNumber.
    for (const a of activeAnimals) {
      if (computeAnimalStage(a) !== 'cria' || !a.motherId) continue
      const mother = findAnimalByRef(activeAnimals, a.motherId)
      if (mother) ids.add(mother.id)
    }
    return ids
  }, [
    orderedBreedings.needPregnancyConfirmation,
    pregnantFemales,
    unweanedOffspring,
    activeAnimals,
    breedingRecords,
  ])

  // --- Etapas por computeAnimalEffectiveStage (una etapa por animal, sin duplicados) ---
  const {
    engordaAnimals,
    juvenilAnimals,
    reproductorAnimals,
    criaAnimals,
    descarteAnimals,
  } = useAnimalStages({ activeAnimals, breedingRecords, matchesEtapasFilters })

  const empadresCount = orderedBreedings.needPregnancyConfirmation.length
  const empadreFemalesCount = useMemo(() => {
    const ids = new Set<string>()
    for (const r of orderedBreedings.needPregnancyConfirmation) {
      for (const f of r.femaleBreedingInfo) {
        if (!f.pregnancyConfirmedDate && !f.actualBirthDate) ids.add(f.femaleId)
      }
    }
    return ids.size
  }, [orderedBreedings.needPregnancyConfirmation])

  // Hembras presentes en más de un empadre activo (pendiente de confirmar)
  const duplicateEmpadreFemales = useMemo(() => {
    const map = new Map<string, BreedingRecord[]>()
    for (const r of orderedBreedings.needPregnancyConfirmation) {
      for (const f of r.femaleBreedingInfo) {
        if (!f.pregnancyConfirmedDate && !f.actualBirthDate) {
          const arr = map.get(f.femaleId) || []
          arr.push(r)
          map.set(f.femaleId, arr)
        }
      }
    }
    const dups: {
      id: string
      animalNumber: string
      records: { id: string; label: string }[]
    }[] = []
    for (const [id, records] of map) {
      if (records.length > 1) {
        const a = animals.find((an) => an.id === id)
        dups.push({
          id,
          animalNumber: a?.animalNumber || id.slice(0, 6),
          records: records.map((r) => ({
            id: r.id,
            label: r.breedingId || r.id.slice(0, 6),
          })),
        })
      }
    }
    return dups.sort((a, b) =>
      (a.animalNumber || '').localeCompare(b.animalNumber || '', 'es', { numeric: true }),
    )
  }, [orderedBreedings.needPregnancyConfirmation, animals])

  const [showCrossTabDups, setShowCrossTabDups] = useState(false)

  // --- Birth form submit handler ---
  const handleBirthSubmit = async (form: {
    animalId: string
    birthDate: string
    birthTime: string
    totalOffspring: number
    notes?: string
    offspring: {
      animalNumber: string
      gender: 'macho' | 'hembra'
      weight?: string | number | null
      color?: string
      healthIssues?: string
      status?: string
    }[]
  }) => {
    try {
      if (!birthRecord) return
      const mother = animals.find((a) => a.id === form.animalId)
      if (!mother) throw new Error('Madre no encontrada')

      const [y, m, d] = form.birthDate.split('-').map((n) => parseInt(n, 10))
      const [hh, mm] = form.birthTime.split(':').map((n) => parseInt(n, 10))
      const actualDate = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0)

      const offspringIds: string[] = []
      for (const off of form.offspring) {
        const weightVal =
          typeof off.weight === 'string'
            ? off.weight === ''
              ? null
              : parseFloat(off.weight)
            : (off.weight ?? null)
        const notesParts = [
          off.color ? `Color: ${off.color}` : null,
          off.healthIssues ? `Salud: ${off.healthIssues}` : null,
        ].filter(Boolean)

        const isDead = off.status === 'muerto'

        const createdId = await create({
          animalNumber: off.animalNumber,
          type: mother.type,
          stage: 'cria',
          weight: weightVal,
          birthDate: actualDate,
          gender: off.gender,
          motherId: mother.id,
          fatherId: birthRecord.maleId,
          ...(notesParts.length > 0 && { notes: notesParts.join(' · ') }),
          ...(isDead && { status: 'muerto' as const, statusAt: actualDate }),
        })
        if (createdId) offspringIds.push(createdId)
      }

      const updatedFemaleInfo = birthRecord.femaleBreedingInfo.map((fi) =>
        fi.femaleId === form.animalId
          ? {
              ...fi,
              actualBirthDate: actualDate,
              offspring: [...(fi.offspring || []), ...offspringIds],
            }
          : fi,
      )
      await updateBreedingRecord(birthRecord.id, { femaleBreedingInfo: updatedFemaleInfo })
      // Actualizar estado reproductivo de la madre
      await update(form.animalId, { birthedAt: actualDate, pregnantAt: null, pregnantBy: null })

      const offspringSummary = form.offspring
        .map((o) => `#${o.animalNumber} (${o.gender}${o.weight ? `, ${o.weight}kg` : ''})`)
        .join(', ')
      await addRecord(form.animalId, {
        type: 'birth',
        category: 'general',
        title: `Parto: ${form.totalOffspring} cría${form.totalOffspring > 1 ? 's' : ''}`,
        description: offspringSummary,
        date: actualDate,
        notes: form.notes || undefined,
      })
    } catch (e) {
      console.error(e)
    }
  }

  // ========================
  // ETAPAS SUB-TABS CONTENT
  // ========================

  const [showOnboarding, setShowOnboarding] = useState(false)

  // Tab: Empadre
  const empadreContent = (
    <div>
      <ModalOnboarding isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
      {duplicateEmpadreFemales.length > 0 && (
        <div className="mb-3 p-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-sm">
          <div className="font-semibold mb-2">
            ⚠️ {duplicateEmpadreFemales.length} hembra
            {duplicateEmpadreFemales.length !== 1 ? 's' : ''} en múltiples empadres activos
          </div>
          <div className="text-xs text-amber-800 mb-2">
            Termina el empadre anterior o confirma embarazo para que no se cuenten dos veces.
          </div>
          <ul className="text-xs space-y-1">
            {duplicateEmpadreFemales.map((d) => {
              const recordsToShow = orderedBreedings.needPregnancyConfirmation.filter((r) =>
                d.records.some((dr) => dr.id === r.id),
              )
              return (
                <li key={d.id} className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-amber-900">{d.animalNumber}</span>
                  <span className="text-amber-700">en</span>
                  {recordsToShow.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setViewingBreedingRecord(r)}
                      className="px-1.5 py-0.5 rounded bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 cursor-pointer"
                    >
                      {r.breedingId || r.id.slice(0, 6)}
                    </button>
                  ))}
                </li>
              )
            })}
          </ul>
        </div>
      )}
      <BreedingTable
        records={[...orderedBreedings.needPregnancyConfirmation]}
        animals={animals}
        onSelect={(record) => setViewingBreedingRecord(record)}
        onDelete={async (ids) => {
          for (const id of ids) await deleteBreedingRecord(id)
        }}
        onConfirmPregnancy={(record) => {
          setConfirmPregnancyRecord(record)
          setSelectedAnimal(null)
        }}
        toolbar={
          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="ghost"
              color="primary"
              icon="help"
              onClick={() => setShowOnboarding(true)}
              title="Ver guia de primeros pasos"
            />
            <Button
              size="xs"
              color="success"
              icon="add"
              onClick={() => router.push('/empadre/nueva')}
            >
              Nuevo Empadre
            </Button>
          </div>
        }
        renderCard={(row) => (
          <BreedingCard
            record={row.record}
            animals={animals}
            onEdit={editRecord}
            onAddBirth={handleOpenAddBirth}
            onConfirmPregnancy={(record, femaleId) => handleOpenConfirmPregnancy(record, femaleId)}
            onUnconfirmPregnancy={handleUnconfirmPregnancy}
            onDelete={(rec) => deleteBreedingRecord(rec.id)}
            onRemoveFromBreeding={handleRemoveFromBreeding}
            onDeleteBirth={handleRevertBirth}
          />
        )}
        onView={(row) => {
          const r = row.record
          const male = animals.find((a) => a.id === r.maleId)
          const ViewModal = () => {
            const [open, setOpen] = useState(false)
            const [confirming, setConfirming] = useState(false)
            return (
              <>
                <Button
                  size="xs"
                  variant="ghost"
                  color="primary"
                  icon="view"
                  onClick={() => setOpen(true)}
                >
                  Ver
                </Button>
                <Modal
                  isOpen={open}
                  onClose={() => setOpen(false)}
                  title={`Empadre ${r.breedingId || ''}`}
                >
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Fecha</span>
                      <span className="font-medium">
                        {r.breedingDate ? formatDate(r.breedingDate, 'dd MMM yyyy') : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Macho</span>
                      <span className="font-medium">
                        {male?.animalNumber || '?'}{' '}
                        <span className="text-xs text-gray-400">
                          {male ? animals_types_labels[male.type] : ''}
                        </span>
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-2">
                        Hembras ({r.femaleBreedingInfo.length})
                      </p>
                      <div className="space-y-3">
                        {groupFemalesByStatus(r.femaleBreedingInfo).map((g) => (
                          <div key={g.key}>
                            <span
                              className={`text-xs font-semibold ${g.items.length === 0 ? 'text-gray-400' : 'text-gray-600'}`}
                            >
                              {g.label} ({g.items.length})
                            </span>
                            {g.items.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {sortFemalesByAnimalNumber(g.items, animals).map((fi) => {
                                  const fem = animals.find((a) => a.id === fi.femaleId)
                                  return (
                                    <span
                                      key={fi.femaleId}
                                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${CHIP_COLORS[g.key]}`}
                                    >
                                      {fem?.animalNumber || fi.femaleId}
                                    </span>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    {r.status === 'finished' && (
                      <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 text-center">
                        Empadre terminado
                      </div>
                    )}
                    {confirming ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-3">
                        <p className="text-sm text-amber-800">
                          Las hembras pendientes (en empadre) quedarán disponibles para nuevos
                          empadres. Las que amamantan seguirán ocupadas hasta el destete.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            color="neutral"
                            onClick={() => setConfirming(false)}
                            className="flex-1"
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            color="warning"
                            icon="check_circle"
                            className="flex-1"
                            onClick={async () => {
                              await updateBreedingRecord(r.id, { status: 'finished' })
                              setOpen(false)
                              setConfirming(false)
                            }}
                          >
                            Confirmar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          color="primary"
                          icon="edit"
                          onClick={() => {
                            setOpen(false)
                            editRecord(r)
                          }}
                          className="flex-1"
                        >
                          Editar
                        </Button>
                        {r.status !== 'finished' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            color="warning"
                            icon="check_circle"
                            className="flex-1"
                            onClick={() => setConfirming(true)}
                          >
                            Terminar
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            color="success"
                            className="flex-1"
                            icon="check_circle"
                            onClick={async () => {
                              await updateBreedingRecord(r.id, { status: 'active' })
                              setOpen(false)
                            }}
                          >
                            Reactivar
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </Modal>
              </>
            )
          }
          return <ViewModal />
        }}
      />
      {orderedBreedings.terminated.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 flex items-center gap-2 py-2">
            Empadres terminados ({orderedBreedings.terminated.length})
          </summary>
          <div className="mt-2">
            <BreedingTable
              records={orderedBreedings.terminated}
              animals={animals}
              onSelect={(record) => setViewingBreedingRecord(record)}
              onDelete={async (ids) => {
                for (const id of ids) await deleteBreedingRecord(id)
              }}
              onView={(row) => {
                const r = row.record
                const male = animals.find((a) => a.id === r.maleId)
                const ViewModal = () => {
                  const [open, setOpen] = useState(false)
                  return (
                    <>
                      <Button
                        size="xs"
                        variant="ghost"
                        color="primary"
                        icon="view"
                        onClick={() => setOpen(true)}
                      >
                        Ver
                      </Button>
                      <Modal
                        isOpen={open}
                        onClose={() => setOpen(false)}
                        title={`Empadre ${r.breedingId || ''}`}
                      >
                        <div className="p-4 space-y-4">
                          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 text-center">
                            Empadre terminado
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Fecha</span>
                            <span className="font-medium">
                              {r.breedingDate ? formatDate(r.breedingDate, 'dd MMM yyyy') : '—'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Macho</span>
                            <span className="font-medium">{male?.animalNumber || '?'}</span>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 mb-2">
                              Hembras ({r.femaleBreedingInfo.length})
                            </p>
                            <div className="space-y-3">
                              {groupFemalesByStatus(r.femaleBreedingInfo).map((g) => (
                                <div key={g.key}>
                                  <span
                                    className={`text-xs font-semibold ${g.items.length === 0 ? 'text-gray-400' : 'text-gray-600'}`}
                                  >
                                    {g.label} ({g.items.length})
                                  </span>
                                  {g.items.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                      {sortFemalesByAnimalNumber(g.items, animals).map((fi) => {
                                        const fem = animals.find((a) => a.id === fi.femaleId)
                                        return (
                                          <span
                                            key={fi.femaleId}
                                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${CHIP_COLORS[g.key]}`}
                                          >
                                            {fem?.animalNumber || fi.femaleId}
                                          </span>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              color="primary"
                              icon="edit"
                              onClick={() => {
                                setOpen(false)
                                editRecord(r)
                              }}
                              className="flex-1"
                            >
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              color="success"
                              className="flex-1"
                              icon="check_circle"
                              onClick={async () => {
                                await updateBreedingRecord(r.id, { status: 'active' })
                                setOpen(false)
                              }}
                            >
                              Reactivar
                            </Button>
                          </div>
                        </div>
                      </Modal>
                    </>
                  )
                }
                return <ViewModal />
              }}
            />
          </div>
        </details>
      )}
    </div>
  )

  // Partos ordenados por días restantes (atrasados primero, luego más próximos)
  const enrichedPregnantFemales: EnrichedPregnant[] = useMemo(
    () =>
      pregnantFemales.map((entry) => {
        // Prioridad: fecha esperada del empadre, o calcular desde pregnantAt + gestación
        let expected = entry.info?.expectedBirthDate ? toDate(entry.info.expectedBirthDate) : null
        if (!expected && entry.animal.pregnantAt) {
          const pregnantDate = toDate(entry.animal.pregnantAt)
          if (pregnantDate) {
            expected = calculateExpectedBirthDate(pregnantDate, entry.animal.type) ?? null
          }
        }
        const daysLeft = expected ? Math.round((expected.getTime() - Date.now()) / 86400000) : null
        return { ...entry, expected, daysLeft }
      }),
    [pregnantFemales],
  )


  const partosColumns = useMemo(() => buildPartosColumns(), [])

  // Tab: Embarazos
  const partosContent = (
    <div>
      <p className="text-xs text-gray-500 mb-2">
        Hembras con embarazo confirmado, en espera de parto.
      </p>
      <DataTable
        title={`${animal_stage_config.embarazos.icon} Embarazos`}
        data={enrichedPregnantFemales}
        columns={partosColumns}
        rowKey={(row) => row.animal.id}
        defaultSortKey="expected"
        sessionStorageKey="mg_last_parto_id"
        selectable
        emptyMessage="No hay partos próximos."
        onView={(row) => (
          <ModalAnimalDetails
            animal={row.animal}
            triggerComponent={
              <Button size="xs" variant="ghost" color="primary" icon="view">
                Ver
              </Button>
            }
          />
        )}
        renderActions={(row) => (
          <>
            {row.record && (
              <Button
                size="xs"
                color="success"
                icon="baby"
                onClick={() => {
                  setBirthRecord(row.record!)
                  setBirthFemaleId(row.animal.id)
                }}
              >
                Parto
              </Button>
            )}
            {row.record && (
              <Button
                size="xs"
                variant="ghost"
                color="primary"
                icon="edit"
                onClick={() => editRecord(row.record!)}
              >
                Empadre
              </Button>
            )}
            <ButtonConfirm
              openProps={{ size: 'xs', variant: 'ghost', color: 'error', icon: 'close' }}
              confirmProps={{ color: 'error' }}
              openLabel="Desconfirmar"
              confirmText={`¿Desconfirmar embarazo de ${row.animal.animalNumber}?`}
              confirmLabel="Desconfirmar"
              onConfirm={async () => {
                if (row.record) {
                  await handleUnconfirmPregnancy(row.record, row.animal.id)
                } else {
                  await update(row.animal.id, { pregnantAt: null, pregnantBy: null })
                }
              }}
            />
          </>
        )}
      />
    </div>
  )

  // Tab: Crías — recién nacidos en espera de destete
  const allCrias: UnweanedRow[] = useMemo(() => {
    const fromBreeding = unweanedOffspring
    const breedingCriaIds = new Set(fromBreeding.map((r) => r.animal.id))
    // Crías standalone: buscar madre y aplicar búsqueda por madre
    const allStandalone = activeAnimals
      .filter(
        (a) =>
          computeAnimalStage(a) === 'cria' &&
          !breedingCriaIds.has(a.id) &&
          matchesEtapasFilters(a, { skipSearch: true }),
      )
      .map((a) => {
        let weanDate: Date | null = null
        let daysUntilWean: number | null = null
        if (a.birthDate) {
          const days = getWeaningDays(a)
          weanDate = addDays(toDate(a.birthDate), days)
          daysUntilWean = differenceInCalendarDays(weanDate, new Date())
        }
        let motherId = ''
        let record: BreedingRecord | null = null
        for (const r of breedingRecords) {
          for (const fi of r.femaleBreedingInfo) {
            if (fi.offspring?.includes(a.id)) {
              motherId = fi.femaleId
              record = r
              break
            }
          }
          if (motherId) break
        }
        // Fallback: usar el motherId guardado en el animal (puede ser id o animalNumber)
        if (!motherId && a.motherId) motherId = a.motherId
        return { animal: a, motherId, record: record as any, weanDate, daysUntilWean }
      })
      .filter((entry) => {
        const q = filters.search.trim().toLowerCase()
        if (!q) return true
        const num = entry.animal.animalNumber?.toLowerCase() || ''
        const name = entry.animal.name?.toLowerCase() || ''
        if (num.includes(q) || name.includes(q)) return true
        // Buscar también por número/nombre de madre
        if (entry.motherId) {
          const mother = findAnimalByRef(animals, entry.motherId)
          const motherNum = mother?.animalNumber?.toLowerCase() || ''
          const motherName = mother?.name?.toLowerCase() || ''
          if (motherNum.includes(q) || motherName.includes(q)) return true
        }
        return false
      })
    return [...fromBreeding, ...allStandalone]
  }, [unweanedOffspring, activeAnimals, breedingRecords, animals, filters])

  // Madres únicas de las crías mostradas (consistente con filtros de búsqueda)
  const nursingMotherIds = useMemo(() => {
    const ids = new Set<string>()
    for (const entry of allCrias) {
      if (!entry.motherId) continue
      // Normalizar a doc id (entry.motherId puede ser id o animalNumber)
      const mother = findAnimalByRef(animals, entry.motherId)
      ids.add(mother?.id || entry.motherId)
    }
    return ids
  }, [allCrias, animals])

  // Cross-tab duplicates: animales contados en 2+ tabs de Etapas
  const crossTabDuplicates = useMemo(() => {
    const tabBuckets: Record<string, Set<string>> = {
      Reproducción: new Set(reproductorAnimals.map((a) => a.id)),
      Embarazos: new Set(pregnantFemales.map((e) => e.animal.id)),
      Crías: new Set([
        ...unweanedOffspring.map((e) => e.animal.id),
        ...criaAnimals.map((a) => a.id),
      ]),
      Madres: new Set(nursingMotherIds),
      Juvenil: new Set(juvenilAnimals.map((a) => a.id)),
      Engorda: new Set(engordaAnimals.map((a) => a.id)),
      Descarte: new Set(descarteAnimals.map((a) => a.id)),
    }
    const empadreSet = new Set<string>()
    for (const r of orderedBreedings.needPregnancyConfirmation) {
      for (const f of r.femaleBreedingInfo) {
        if (!f.pregnancyConfirmedDate && !f.actualBirthDate) empadreSet.add(f.femaleId)
      }
    }
    tabBuckets.Empadre = empadreSet

    const memberships = new Map<string, string[]>()
    for (const [tabName, ids] of Object.entries(tabBuckets)) {
      for (const id of ids) {
        const arr = memberships.get(id) || []
        arr.push(tabName)
        memberships.set(id, arr)
      }
    }
    const dups: { id: string; animalNumber: string; tabs: string[] }[] = []
    for (const [id, tabs] of memberships) {
      if (tabs.length > 1) {
        const a = animals.find((an) => an.id === id)
        dups.push({
          id,
          animalNumber: a?.animalNumber || id.slice(0, 6),
          tabs,
        })
      }
    }
    return dups.sort((a, b) =>
      (a.animalNumber || '').localeCompare(b.animalNumber || '', 'es', { numeric: true }),
    )
  }, [
    reproductorAnimals,
    pregnantFemales,
    unweanedOffspring,
    criaAnimals,
    nursingMotherIds,
    juvenilAnimals,
    engordaAnimals,
    descarteAnimals,
    orderedBreedings.needPregnancyConfirmation,
    animals,
  ])

  const destetesContent = (
    <div>
      <p className="text-xs text-gray-500 mb-2">Recién nacidos, en espera de destete.</p>
      <DataTable
        title={`${animal_stage_config.crias_lactantes.icon} Crías`}
        data={allCrias}
        columns={destetesColumns}
        rowKey={(row) => row.animal.id}
        defaultSortKey="weanDate"
        sessionStorageKey="mg_last_destete_id"
        selectable
        renderBulkActions={(ids) => (
          <>
            <Button
              size="xs"
              color="warning"
              onClick={() => {
                setSelectedWeanIds(ids)
                openBulkWean('engorda')
              }}
            >
              {animal_stage_config.engorda.icon} Engorda ({ids.size})
            </Button>
            <Button
              size="xs"
              color="error"
              onClick={() => {
                setSelectedWeanIds(ids)
                openBulkWean('reproductor')
              }}
            >
              {animal_stage_config.reproductor.icon} Reproductor ({ids.size})
            </Button>
          </>
        )}
        onView={(row) => (
          <ModalAnimalDetails
            animal={row.animal}
            triggerComponent={
              <Button size="xs" variant="ghost" color="primary" icon="view">
                Ver
              </Button>
            }
          />
        )}
        renderActions={(row) => (
          <>
            <ButtonConfirm
              openLabel={`${animal_stage_config.engorda.icon} Engorda`}
              confirmLabel="Destetar a Engorda"
              confirmText={`¿Destetar a #${row.animal.animalNumber} y moverlo a Engorda?`}
              onConfirm={() => weanAndUpdateMother(row.animal.id, { stageDecision: 'engorda' })}
              openProps={{ size: 'xs', variant: 'ghost', color: 'warning' }}
              confirmProps={{ color: 'warning' }}
            />
            <ButtonConfirm
              openLabel={`${animal_stage_config.reproductor.icon} Reproductor`}
              confirmLabel="Destetar a Reproductor"
              confirmText={`¿Destetar a #${row.animal.animalNumber} y moverlo a Reproductor?`}
              onConfirm={() => weanAndUpdateMother(row.animal.id, { stageDecision: 'reproductor' })}
              openProps={{ size: 'xs', variant: 'ghost', color: 'error' }}
              confirmProps={{ color: 'error' }}
            />
          </>
        )}
        emptyMessage="No hay crías pendientes de destete."
      />
      {nursingMotherIds.size > 0 &&
        (() => {
          // Agrupar crías por madre y calcular el destete más urgente por madre
          const motherMap = new Map<string, { motherId: string; minDaysUntilWean: number | null }>()
          for (const entry of allCrias) {
            if (!entry.motherId) continue
            const existing = motherMap.get(entry.motherId)
            if (!existing) {
              motherMap.set(entry.motherId, {
                motherId: entry.motherId,
                minDaysUntilWean: entry.daysUntilWean,
              })
            } else if (
              entry.daysUntilWean !== null &&
              (existing.minDaysUntilWean === null ||
                entry.daysUntilWean < existing.minDaysUntilWean)
            ) {
              existing.minDaysUntilWean = entry.daysUntilWean
            }
          }
          const overdue = [...motherMap.values()]
            .filter((m) => m.minDaysUntilWean !== null && m.minDaysUntilWean < 0)
            .sort((a, b) => (a.minDaysUntilWean ?? 0) - (b.minDaysUntilWean ?? 0))
          const upcoming = [...motherMap.values()]
            .filter((m) => m.minDaysUntilWean === null || m.minDaysUntilWean >= 0)
            .sort((a, b) => (a.minDaysUntilWean ?? 999) - (b.minDaysUntilWean ?? 999))

          return (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold text-gray-600">
                Madres amamantando ({motherMap.size})
              </p>
              {overdue.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-red-600">
                    Destetes atrasados ({overdue.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {overdue.map((m) => {
                      const mother = findAnimalByRef(animals, m.motherId)
                      return (
                        <ModalAnimalDetails
                          key={m.motherId}
                          animal={mother!}
                          triggerComponent={
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer transition-all hover:shadow-sm bg-red-50 text-red-800 border-red-200 hover:bg-red-100"
                            >
                              {mother?.animalNumber || m.motherId}
                              <span className="text-[10px] opacity-70">
                                ({Math.abs(m.minDaysUntilWean!)}d)
                              </span>
                            </button>
                          }
                        />
                      )
                    })}
                  </div>
                </div>
              )}
              {upcoming.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-gray-500">
                    Destetes próximos ({upcoming.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {upcoming.map((m) => {
                      const mother = findAnimalByRef(animals, m.motherId)
                      return (
                        <ModalAnimalDetails
                          key={m.motherId}
                          animal={mother!}
                          triggerComponent={
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer transition-all hover:shadow-sm bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                            >
                              {mother?.animalNumber || m.motherId}
                              {m.minDaysUntilWean !== null && (
                                <span className="text-[10px] opacity-70">
                                  ({m.minDaysUntilWean}d)
                                </span>
                              )}
                            </button>
                          }
                        />
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })()}
    </div>
  )

  // ========================
  // SUB-TABS DE ETAPAS
  // ========================
  const etapaLabel = (key: AnimalStageKey, count: number) => {
    const cfg = animal_stage_config[key]
    return `${cfg.icon} ${cfg.label} (${count})`
  }

  const animalColumns = useMemo(() => buildAnimalColumns(), [])
  const allAnimalColumns = useMemo(() => buildAllAnimalColumns(breedingRecords), [breedingRecords])

  const etapasTabs = [
    {
      label: etapaLabel('reproductor', reproductorAnimals.length),
      content: (
        <SimpleStageTab
          title={`${animal_stage_config.reproductor.icon} Reproducción`}
          data={reproductorAnimals}
          columns={animalColumns}
          sessionStorageKey="mg_last_reproductor_id"
          emptyMessage="No hay animales en reproducción."
        />
      ),
    },
    {
      label: etapaLabel('empadre', empadreFemalesCount),
      badgeCount: empadresCount,
      content: empadreContent,
    },
    {
      label: etapaLabel('embarazos', pregnantFemales.length),
      content: partosContent,
    },
    {
      label: `${animal_stage_config.crias_lactantes.icon} Crías (${unweanedOffspring.length + criaAnimals.length}) Madres (${nursingMotherIds.size})`,
      content: destetesContent,
    },
    {
      label: etapaLabel('juvenil', juvenilAnimals.length),
      content: (
        <SimpleStageTab
          title={`${animal_stage_config.juvenil.icon} Juvenil`}
          data={juvenilAnimals}
          columns={animalColumns}
          sessionStorageKey="mg_last_juvenil_id"
          emptyMessage="No hay animales juveniles."
        />
      ),
    },
    {
      label: etapaLabel('engorda', engordaAnimals.length),
      content: (
        <SimpleStageTab
          title={`${animal_stage_config.engorda.icon} Engorda`}
          data={engordaAnimals}
          columns={animalColumns}
          sessionStorageKey="mg_last_engorda_id"
          emptyMessage="No hay animales en engorda."
        />
      ),
    },
    {
      label: etapaLabel('descarte', descarteAnimals.length),
      content: (
        <SimpleStageTab
          title={`${animal_stage_config.descarte.icon} Descarte`}
          data={descarteAnimals}
          columns={animalColumns}
          sessionStorageKey="mg_last_descarte_id"
          emptyMessage="No hay animales en descarte."
        />
      ),
    },
  ]

  // ========================
  // SUB-TABS PRINCIPALES
  // ========================
  const animalSubTabs = [
    {
      label: 'Todos',
      content: (
        <TabTodos
          filters={filters}
          setFilters={setFilters}
          filteredAnimals={filteredAnimals}
          allAnimals={allAnimals}
          columns={allAnimalColumns}
          isLoadingAnimals={isLoadingAnimals}
          activeFilterCount={activeFilterCount}
          availableTypes={availableTypes}
          availableBreeds={availableBreeds}
          availableStages={availableStages}
          availableGenders={availableGenders}
          formatStatLabel={formatStatLabel}
          onBulkEdit={(ids, clear) => {
            setBulkSelectedAnimals(ids)
            setBulkClearFn(() => clear)
            setIsBulkEditOpen(true)
          }}
          onBulkHealth={(ids, clear) => {
            setBulkSelectedAnimals(ids)
            setBulkClearFn(() => clear)
            setIsBulkHealthModalOpen(true)
          }}
          onBulkSale={(ids, clear) => {
            setBulkSelectedAnimals(ids)
            setBulkClearFn(() => clear)
            setIsSaleModalOpen(true)
          }}
        />
      ),
    },
    {
      label: 'Etapas',
      content: (
        <TabEtapas
          filters={filters}
          setFilters={setFilters}
          filteredCount={filteredAnimals.length}
          activeFilterCount={activeFilterCount}
          availableTypes={availableTypes}
          availableBreeds={availableBreeds}
          availableStages={availableStages}
          availableGenders={availableGenders}
          formatStatLabel={formatStatLabel}
          tabsTotal={
            reproductorAnimals.length +
            empadreFemalesCount +
            pregnantFemales.length +
            unweanedOffspring.length +
            criaAnimals.length +
            nursingMotherIds.size +
            juvenilAnimals.length +
            engordaAnimals.length +
            descarteAnimals.length
          }
          crossTabDuplicatesCount={crossTabDuplicates.length}
          onShowDuplicates={() => setShowCrossTabDups(true)}
          etapasTabs={etapasTabs}
        />
      ),
    },
    {
      label: 'Números',
      content: <NumbersTab />,
    },
    {
      label: 'Estadísticas',
      content: <StatisticsTab typeFilter={filters.type} />,
    },
  ]

  return (
    <>
      <Tabs tabs={animalSubTabs} tabsId="animals-section" />

      <Modal
        isOpen={showCrossTabDups}
        onClose={() => setShowCrossTabDups(false)}
        title={`Animales en múltiples etapas (${crossTabDuplicates.length})`}
        size="xl"
      >
        <p className="text-sm text-gray-600 mb-3">
          Estos animales están contados en más de una pestaña de Etapas. Cada uno se suma N veces en
          el total general.
        </p>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {crossTabDuplicates.map((d) => (
            <div
              key={d.id}
              className="flex flex-wrap items-center gap-2 p-2 border border-gray-200 rounded"
            >
              <span className="font-semibold text-gray-900">{d.animalNumber}</span>
              <span className="text-xs text-gray-500">en</span>
              {d.tabs.map((t) => (
                <span
                  key={t}
                  className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200"
                >
                  {t}
                </span>
              ))}
            </div>
          ))}
        </div>
      </Modal>

      {/* Modals de bulk actions */}
      <ModalBulkEdit
        isOpen={isBulkEditOpen}
        onClose={() => {
          setIsBulkEditOpen(false)
          bulkClearFn?.()
          setBulkSelectedAnimals([])
        }}
        selectedAnimals={animals.filter((a) => bulkSelectedAnimals.includes(a.id))}
        onSave={async (ids, updates) => {
          for (const id of ids) {
            await update(id, updates)
          }
        }}
      />
      <ModalBulkHealthAction
        isOpen={isBulkHealthModalOpen}
        onClose={() => setIsBulkHealthModalOpen(false)}
        selectedAnimals={filteredAnimals.filter((a) => bulkSelectedAnimals.includes(a.id))}
        onSuccess={() => {
          bulkClearFn?.()
          setBulkSelectedAnimals([])
          setIsBulkHealthModalOpen(false)
        }}
        onRemoveAnimal={(id) => setBulkSelectedAnimals((prev) => prev.filter((x) => x !== id))}
      />
      <ModalSaleForm
        isOpen={isSaleModalOpen}
        onClose={() => {
          setIsSaleModalOpen(false)
          bulkClearFn?.()
          setBulkSelectedAnimals([])
        }}
        preSelectedAnimals={filteredAnimals.filter((a) => bulkSelectedAnimals.includes(a.id))}
      />

      {/* Modals de breeding */}
      <ModalBirthForm
        isOpen={!!birthRecord}
        onClose={() => {
          setBirthRecord(null)
          setBirthFemaleId(null)
        }}
        breedingRecord={birthRecord as BreedingRecord}
        animals={animals}
        selectedFemaleId={birthFemaleId || undefined}
        onSubmit={handleBirthSubmit}
        isLoading={false}
      />
      <ModalConfirmPregnancy
        isOpen={!!confirmPregnancyRecord}
        onClose={() => setConfirmPregnancyRecord(null)}
        breedingRecord={confirmPregnancyRecord as BreedingRecord}
        animals={animals}
        onSubmit={async (r) => {
          // Si todas las hembras tienen embarazo confirmado, marcar empadre como terminado
          const allConfirmed = r.femaleBreedingInfo.every((fi) => !!fi.pregnancyConfirmedDate)
          await updateBreedingRecord(r.id, {
            ...r,
            ...(allConfirmed ? { status: 'finished' } : {}),
          })
          for (const fi of r.femaleBreedingInfo) {
            if (fi.pregnancyConfirmedDate) {
              await update(fi.femaleId, {
                pregnantAt: fi.pregnancyConfirmedDate,
                pregnantBy: r.maleId,
                birthedAt: null,
                weanedMotherAt: null,
              })
            }
          }
        }}
        isLoading={false}
        selectedAnimal={selectedAnimal}
      />

      {/* Modal detalle de empadre (al hacer click en fila de BreedingTable) */}
      <Modal
        isOpen={!!viewingBreedingRecord}
        onClose={() => {
          setViewingBreedingRecord(null)
          setViewingConfirming(false)
        }}
        title={`Empadre ${viewingBreedingRecord?.breedingId || ''}`}
      >
        {viewingBreedingRecord &&
          (() => {
            const r = viewingBreedingRecord
            const male = animals.find((a) => a.id === r.maleId)
            const groups = groupFemalesByStatus(r.femaleBreedingInfo)
            return (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Fecha</span>
                  <span className="font-medium">
                    {r.breedingDate ? formatDate(r.breedingDate, 'dd MMM yyyy') : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Macho</span>
                  <span className="font-medium">
                    {male?.animalNumber || '?'}{' '}
                    <span className="text-xs text-gray-400">
                      {male ? animals_types_labels[male.type] : ''}
                    </span>
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-2">
                    Hembras ({r.femaleBreedingInfo.length})
                  </p>
                  <div className="space-y-3">
                    {groups.map((g) => (
                      <div key={g.key}>
                        <span
                          className={`text-xs font-semibold ${g.items.length === 0 ? 'text-gray-400' : 'text-gray-600'}`}
                        >
                          {g.label} ({g.items.length})
                        </span>
                        {g.items.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {sortFemalesByAnimalNumber(g.items, animals).map((fi) => {
                              const fem = animals.find((a) => a.id === fi.femaleId)
                              if (!fem) return null
                              return (
                                <ModalBreedingAnimalDetails
                                  key={fi.femaleId}
                                  animal={fem}
                                  animalType="female"
                                  record={r}
                                  status={g.key}
                                  animals={animals}
                                  onConfirmPregnancy={(rec, fId) => {
                                    setViewingBreedingRecord(null)
                                    handleOpenConfirmPregnancy(rec, fId)
                                  }}
                                  onAddBirth={(rec, fId) => {
                                    setViewingBreedingRecord(null)
                                    handleOpenAddBirth(rec, fId)
                                  }}
                                  onRemoveFromBreeding={async (rec, animalId) => {
                                    const updated = rec.femaleBreedingInfo.filter(
                                      (f) => f.femaleId !== animalId,
                                    )
                                    await updateBreedingRecord(rec.id, {
                                      femaleBreedingInfo: updated,
                                    })
                                    setViewingBreedingRecord(null)
                                  }}
                                  onDeleteBirth={async (rec, fId) => {
                                    await handleRevertBirth(rec, fId)
                                    setViewingBreedingRecord(null)
                                  }}
                                  triggerComponent={
                                    <button
                                      type="button"
                                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer transition-all hover:shadow-sm ${CHIP_COLORS[g.key]} hover:opacity-80`}
                                    >
                                      {fem.animalNumber}
                                    </button>
                                  }
                                />
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                {r.status === 'finished' && (
                  <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 text-center">
                    Empadre terminado
                  </div>
                )}
                {viewingConfirming ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-3">
                    <p className="text-sm text-amber-800">
                      Las hembras pendientes (en empadre) quedarán disponibles para nuevos empadres.
                      Las que amamantan seguirán ocupadas hasta el destete.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        color="neutral"
                        onClick={() => setViewingConfirming(false)}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        color="warning"
                        icon="check_circle"
                        className="flex-1"
                        onClick={async () => {
                          await updateBreedingRecord(r.id, { status: 'finished' })
                          setViewingBreedingRecord(null)
                          setViewingConfirming(false)
                        }}
                      >
                        Confirmar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      color="primary"
                      icon="edit"
                      onClick={() => {
                        setViewingBreedingRecord(null)
                        editRecord(r)
                      }}
                      className="flex-1"
                    >
                      Editar
                    </Button>
                    {r.status !== 'finished' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        color="warning"
                        icon="check_circle"
                        className="flex-1"
                        onClick={() => setViewingConfirming(true)}
                      >
                        Terminar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        color="success"
                        className="flex-1"
                        icon="check_circle"
                        onClick={async () => {
                          await updateBreedingRecord(r.id, { status: 'active' })
                          setViewingBreedingRecord(null)
                        }}
                      >
                        Reactivar
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )
          })()}
      </Modal>

      {/* Modal confirmar destete */}
      <Modal
        isOpen={!!weanConfirm}
        onClose={() => setWeanConfirm(null)}
        title="Confirmar destete"
        size="sm"
      >
        {weanConfirm && (
          <div className="space-y-4">
            {weanConfirm.animals.length === 1 ? (
              <p className="text-sm text-gray-600">
                Vas a destetar a{' '}
                <span className="font-semibold text-gray-900">
                  #{weanConfirm.animals[0].number}
                </span>{' '}
                y moverlo a la etapa de{' '}
                <span
                  className={`font-semibold ${weanConfirm.decision === 'engorda' ? 'text-orange-700' : 'text-purple-700'}`}
                >
                  {weanConfirm.decision === 'engorda' ? 'Engorda' : 'Reproductor'}
                </span>
                .
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Vas a destetar{' '}
                  <span className="font-semibold text-gray-900">
                    {weanConfirm.animals.length} crías
                  </span>{' '}
                  y moverlas a la etapa de{' '}
                  <span
                    className={`font-semibold ${weanConfirm.decision === 'engorda' ? 'text-orange-700' : 'text-purple-700'}`}
                  >
                    {weanConfirm.decision === 'engorda' ? 'Engorda' : 'Reproductor'}
                  </span>
                  .
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {weanConfirm.animals.map((a) => (
                    <span
                      key={a.id}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                    >
                      #{a.number}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                color="neutral"
                onClick={() => setWeanConfirm(null)}
                disabled={isWeaning}
              >
                Cancelar
              </Button>
              <Button
                color={weanConfirm.decision === 'engorda' ? 'warning' : 'primary'}
                onClick={handleWeanConfirm}
                disabled={isWeaning}
                className="flex-1"
              >
                {isWeaning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Destetando...
                  </>
                ) : (
                  `Destetar${weanConfirm.animals.length > 1 ? ` (${weanConfirm.animals.length})` : ''} a ${weanConfirm.decision === 'engorda' ? 'Engorda' : 'Reproductor'}`
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal éxito destete */}
      <Modal
        isOpen={!!weanSuccess}
        onClose={() => setWeanSuccess(null)}
        title="Destete completado"
        size="sm"
      >
        {weanSuccess && (
          <div className="flex flex-col items-center py-4 space-y-4">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-8 h-8 text-green-600"
              >
                <path
                  fillRule="evenodd"
                  d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            {weanSuccess.animalNumbers.length === 1 ? (
              <p className="text-sm text-gray-600 text-center">
                <span className="font-semibold text-gray-900">#{weanSuccess.animalNumbers[0]}</span>{' '}
                fue destetado y movido a{' '}
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    weanSuccess.decision === 'engorda'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {weanSuccess.decision === 'engorda' ? 'Engorda' : 'Juvenil'}
                </span>
                {weanSuccess.decision === 'reproductor' && (
                  <span className="text-xs text-gray-400 ml-1">(futuro reproductor)</span>
                )}
              </p>
            ) : (
              <div className="space-y-2 w-full">
                <p className="text-sm text-gray-600 text-center">
                  <span className="font-semibold text-gray-900">
                    {weanSuccess.animalNumbers.length} crías
                  </span>{' '}
                  fueron destetadas y movidas a{' '}
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      weanSuccess.decision === 'engorda'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {weanSuccess.decision === 'engorda' ? 'Engorda' : 'Juvenil'}
                  </span>
                  {weanSuccess.decision === 'reproductor' && (
                    <span className="text-xs text-gray-400 ml-1">(futuro reproductor)</span>
                  )}
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {weanSuccess.animalNumbers.map((num) => (
                    <span
                      key={num}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                    >
                      #{num}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <Button color="success" onClick={() => setWeanSuccess(null)} className="w-full">
              Aceptar
            </Button>
          </div>
        )}
      </Modal>
    </>
  )
}

export default AnimalsSection
