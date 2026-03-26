'use client'

import { addDays, differenceInCalendarDays } from 'date-fns'
import { useRouter } from 'next/navigation'
import React, { useMemo, useState } from 'react'
import AnimalBadges from '@/components/AnimalBadges'
import BirthsWindowSummary from '@/components/BirthsWindowSummary'
import BreedingCard from '@/components/BreedingCard'
import BreedingTable from '@/components/BreedingTable'
import Button from '@/components/buttons/Button'
import ButtonConfirm from '@/components/buttons/ButtonConfirm'
import DataTable, { ColumnDef } from '@/components/DataTable'
import { Modal } from '@/components/Modal'
import ModalAnimalDetails from '@/components/ModalAnimalDetails'
import ModalBirthForm from '@/components/ModalBirthForm'
import ModalConfirmPregnancy from '@/components/ModalConfirmPregnancy'
import StatisticsTab from '@/components/StatisticsTab'
import Tabs from '@/components/Tabs'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useBreedingCRUD } from '@/hooks/useBreedingCRUD'
import { useLocalPreference } from '@/hooks/useLocalPreference'
import { animalAge, formatWeight } from '@/lib/animal-utils'
import { getWeaningDays } from '@/lib/animalBreedingConfig'
import { toDate } from '@/lib/dates'
import {
  Animal,
  AnimalStageKey,
  animal_gender_config,
  animal_stage_config,
  animal_status_colors,
  animal_status_labels,
  animals_types_labels,
} from '@/types/animals'
import { BreedingRecord } from '@/types/breedings'
import { BreedingActionHandlers } from '@/types/components/breeding'
import ModalBulkHealthAction from '../../ModalBulkHealthAction'
import ModalSaleForm from '../../ModalSaleForm'
import AnimalListView from './AnimalListView'
import { AnimalFilters, AnimalsFilters, useAnimalFilters } from './animals-filters'

interface AnimalsSectionProps {
  filters: AnimalFilters
  setFilters: React.Dispatch<React.SetStateAction<AnimalFilters>>
}

/**
 * Sección de Animales con sub-tabs: Todos, Etapas, Estadísticas
 */
const AnimalsSection: React.FC<AnimalsSectionProps> = ({ filters, setFilters }) => {
  const router = useRouter()
  const { animals, isLoading: isLoadingAnimals, wean, create, addRecord } = useAnimalCRUD()
  const {
    breedingRecords,
    updateBreedingRecord,
    deleteBreedingRecord,
    getBirthsWindow,
    getBirthsWindowSummary,
  } = useBreedingCRUD()

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

  const editRecord = (record: BreedingRecord) => router.push(`/monta/${record.id}/editar`)

  // --- Breeding handlers (from BreedingTabs) ---
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
  const handleRemoveFromBreeding = async (record: BreedingRecord, animalId: string) => {
    if (record.maleId === animalId) {
      await deleteBreedingRecord(record.id)
    } else {
      const updatedFemaleInfo = record.femaleBreedingInfo.filter((i) => i.femaleId !== animalId)
      if (updatedFemaleInfo.length === 0) {
        await deleteBreedingRecord(record.id)
      } else {
        await updateBreedingRecord(record.id, { femaleBreedingInfo: updatedFemaleInfo })
      }
    }
  }
  const handleUnconfirmPregnancy = async (record: BreedingRecord, femaleId: string) => {
    const updatedFemaleInfo = record.femaleBreedingInfo.map((info) =>
      info.femaleId === femaleId
        ? { ...info, pregnancyConfirmedDate: null, expectedBirthDate: null }
        : info,
    )
    await updateBreedingRecord(record.id, { femaleBreedingInfo: updatedFemaleInfo })
  }

  const handleWeanConfirm = async () => {
    if (!weanConfirm) return
    setIsWeaning(true)
    try {
      for (const a of weanConfirm.animals) {
        await wean(a.id, { stageDecision: weanConfirm.decision })
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

  const toggleWeanSelect = (id: string) => {
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
  const matchesEtapasFilters = (animal: Animal | undefined, { skipSearch = false } = {}) => {
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
  }

  // --- Montas filtradas por tipo/raza/género/búsqueda ---
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

  // --- Montas ordenadas ---
  const orderedBreedings = useMemo(() => {
    const needPregnancyConfirmation: BreedingRecord[] = []
    const needBirthConfirmation: BreedingRecord[] = []
    const finished: BreedingRecord[] = []

    filteredBreedingRecords.forEach((r) => {
      let hasPendingPregnancyConfirm = false
      let hasPendingBirth = false
      r.femaleBreedingInfo.forEach((f) => {
        if (!f.actualBirthDate) {
          if (f.pregnancyConfirmedDate) hasPendingBirth = true
          else hasPendingPregnancyConfirm = true
        }
      })
      if (hasPendingPregnancyConfirm) needPregnancyConfirmation.push(r)
      else if (hasPendingBirth) needBirthConfirmation.push(r)
      else finished.push(r)
    })

    const sortDesc = (a: BreedingRecord, b: BreedingRecord) =>
      (b.breedingDate?.getTime() || 0) - (a.breedingDate?.getTime() || 0)

    return {
      needPregnancyConfirmation: needPregnancyConfirmation.sort(sortDesc),
      needBirthConfirmation: needBirthConfirmation.sort(sortDesc),
      finished: finished.sort(sortDesc),
    }
  }, [filteredBreedingRecords])

  // --- Partos próximos ---
  const pregnantFemales = useMemo(
    () =>
      filteredBreedingRecords.flatMap((record) =>
        record.femaleBreedingInfo
          .filter((f) => f.pregnancyConfirmedDate && !f.actualBirthDate)
          .map((info) => ({
            record,
            info,
            animal: animals.find((a) => a.id === info.femaleId),
          }))
          .filter(({ animal, record: r }) => {
            if (!matchesEtapasFilters(animal, { skipSearch: true })) return false
            const q = filters.search.trim().toLowerCase()
            if (!q) return true
            // Coincide si el animal o el ID de monta matchean la búsqueda
            const num = animal?.animalNumber?.toLowerCase() || ''
            const name = animal?.name?.toLowerCase() || ''
            const brId = (r.breedingId || r.id || '').toLowerCase()
            return num.includes(q) || name.includes(q) || brId.includes(q)
          }),
      ),
    [filteredBreedingRecords, animals, filters],
  )
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
  const birthsSummary = useMemo(
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
    for (const record of filteredBreedingRecords) {
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
  }, [filteredBreedingRecords, animals, filters])

  type UnweanedRow = (typeof unweanedOffspring)[number]
  const destetesColumns: ColumnDef<UnweanedRow>[] = useMemo(
    () => [
      {
        key: 'number',
        label: '#',
        sortable: true,
        sortFn: (a, b) =>
          (a.animal.animalNumber || '').localeCompare(b.animal.animalNumber || '', 'es', {
            numeric: true,
          }),
        render: (row) => (
          <ModalAnimalDetails
            animal={row.animal}
            triggerComponent={
              <span className="font-medium text-gray-900 cursor-pointer hover:text-green-700 transition-colors">
                {row.animal.animalNumber}
              </span>
            }
          />
        ),
        className: 'whitespace-nowrap',
      },
      {
        key: 'mother',
        label: 'Madre',
        sortable: true,
        sortFn: (a, b) => {
          const mA = animals.find((an) => an.id === a.motherId)?.animalNumber || ''
          const mB = animals.find((an) => an.id === b.motherId)?.animalNumber || ''
          return mA.localeCompare(mB, 'es', { numeric: true })
        },
        render: (row) => {
          const mother = animals.find((an) => an.id === row.motherId)
          return mother ? (
            <ModalAnimalDetails
              animal={mother}
              triggerComponent={
                <span className="text-gray-700 cursor-pointer hover:text-green-700 transition-colors">
                  {mother.animalNumber}
                </span>
              }
            />
          ) : (
            <span className="text-gray-400">—</span>
          )
        },
        className: 'whitespace-nowrap',
      },
      {
        key: 'age',
        label: 'Edad',
        sortable: true,
        sortFn: (a, b) =>
          (a.animal.birthDate ? toDate(a.animal.birthDate).getTime() : 0) -
          (b.animal.birthDate ? toDate(b.animal.birthDate).getTime() : 0),
        render: (row) => {
          if (!row.animal.birthDate) return <span className="text-gray-400">—</span>
          const days = differenceInCalendarDays(new Date(), toDate(row.animal.birthDate))
          const months = Math.floor(days / 30)
          return <span className="text-gray-600">{months > 0 ? `${months}m` : `${days}d`}</span>
        },
        className: 'whitespace-nowrap',
      },
      {
        key: 'weanDate',
        label: 'Destete',
        sortable: true,
        sortFn: (a, b) => {
          if (a.daysUntilWean === null && b.daysUntilWean === null) return 0
          if (a.daysUntilWean === null) return 1
          if (b.daysUntilWean === null) return -1
          return a.daysUntilWean - b.daysUntilWean
        },
        render: (row) => {
          const isOverdue = row.daysUntilWean !== null && row.daysUntilWean < 0
          const isSoon =
            row.daysUntilWean !== null && row.daysUntilWean >= 0 && row.daysUntilWean <= 7
          return (
            <span
              className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium ${
                isOverdue
                  ? 'bg-red-100 text-red-700'
                  : isSoon
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-600'
              }`}
            >
              {row.daysUntilWean !== null
                ? row.daysUntilWean === 0
                  ? 'Hoy'
                  : row.daysUntilWean > 0
                    ? `En ${row.daysUntilWean}d`
                    : `Hace ${Math.abs(row.daysUntilWean)}d`
                : 'Sin fecha'}
            </span>
          )
        },
        className: 'whitespace-nowrap',
      },
    ],
    [animals],
  )

  // --- Etapas por stage ---
  const activeAnimals = useMemo(
    () => animals.filter((a) => (a.status ?? 'activo') === 'activo'),
    [animals],
  )
  const engordaAnimals = useMemo(
    () => activeAnimals.filter((a) => a.stage === 'engorda' && matchesEtapasFilters(a)),
    [activeAnimals, filters],
  )
  const juvenilAnimals = useMemo(
    () => activeAnimals.filter((a) => a.stage === 'juvenil' && matchesEtapasFilters(a)),
    [activeAnimals, filters],
  )
  // IDs de animales en montas activas (sin parto o sin destete completo)
  const animalsInBreeding = useMemo(() => {
    const ids = new Set<string>()
    for (const r of breedingRecords) {
      const hasActiveFemale = r.femaleBreedingInfo.some((f) => !f.actualBirthDate)
      if (hasActiveFemale) {
        ids.add(r.maleId)
        for (const f of r.femaleBreedingInfo) {
          ids.add(f.femaleId)
        }
      }
    }
    return ids
  }, [breedingRecords])

  // IDs de madres amamantando (tienen crías sin destetar)
  const nursingMotherIds = useMemo(() => {
    const ids = new Set<string>()
    for (const r of breedingRecords) {
      for (const fi of r.femaleBreedingInfo) {
        if (!fi.offspring || fi.offspring.length === 0) continue
        const hasUnweaned = fi.offspring.some((offId) => {
          const a = animals.find((an) => an.id === offId)
          return a && a.stage === 'cria' && a.status !== 'muerto' && a.status !== 'vendido'
        })
        if (hasUnweaned) ids.add(fi.femaleId)
      }
    }
    return ids
  }, [breedingRecords, animals])

  const reproductorAnimals = useMemo(
    () =>
      activeAnimals.filter(
        (a) =>
          a.stage === 'reproductor' &&
          matchesEtapasFilters(a) &&
          !animalsInBreeding.has(a.id) &&
          !nursingMotherIds.has(a.id),
      ),
    [activeAnimals, filters, animalsInBreeding, nursingMotherIds],
  )
  const descarteAnimals = useMemo(
    () => activeAnimals.filter((a) => a.stage === 'descarte' && matchesEtapasFilters(a)),
    [activeAnimals, filters],
  )

  const montasCount =
    orderedBreedings.needPregnancyConfirmation.length +
    orderedBreedings.needBirthConfirmation.length

  // --- Bulk selection actions ---
  const selectionActions = ({
    selectedAnimals: selected,
    clearSelection,
  }: {
    selectedAnimals: string[]
    clearSelection: () => void
    getSelectedAnimalsData: () => Animal[]
  }) => (
    <>
      <button
        onClick={() => {
          setBulkSelectedAnimals(selected)
          setBulkClearFn(() => clearSelection)
          setIsBulkHealthModalOpen(true)
        }}
        className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs hover:bg-green-700 transition-colors"
      >
        Aplicar Registro
      </button>
      <button
        onClick={() => {
          setBulkSelectedAnimals(selected)
          setBulkClearFn(() => clearSelection)
          setIsSaleModalOpen(true)
        }}
        className="bg-yellow-600 text-white px-3 py-1 rounded-lg text-xs hover:bg-yellow-700 transition-colors"
      >
        Crear Venta
      </button>
    </>
  )

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

  const [etapasGuideDismissed, setEtapasGuideDismissed] = useLocalPreference(
    'etapas_guide_dismissed',
    false,
  )

  // Tab: Monta
  const montaContent = (
    <div>
      {!etapasGuideDismissed && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 mb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="font-semibold">Como funciona el flujo de etapas</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-700">
                <li>
                  <strong>Monta</strong> — Registra el cruce entre un macho y una o varias hembras.
                </li>
                <li>
                  <strong>Confirmar gestacion</strong> — Confirma que la hembra quedo preñada y se
                  calcula la fecha estimada de parto.
                </li>
                <li>
                  <strong>Parto</strong> — Registra el nacimiento de las crias. Se crean
                  automaticamente como animales nuevos.
                </li>
                <li>
                  <strong>Destete</strong> — Cuando la cria esta lista, la destetas a engorda o
                  reproductor.
                </li>
                <li>
                  <strong>Descarte</strong> — Cuando un animal termina su ciclo reproductivo, esta
                  listo para venta, es muy viejo o tiene problemas de salud, se mueve a descarte.
                </li>
              </ol>
              <p className="text-blue-600">
                Empieza creando una monta con el boton <strong>&quot;Nueva Monta&quot;</strong>.
              </p>
            </div>
            <Button
              size="xs"
              variant="ghost"
              color="primary"
              icon="close"
              onClick={() => setEtapasGuideDismissed(true)}
              title="Cerrar guia"
            />
          </div>
        </div>
      )}
      <BreedingTable
        records={[
          ...orderedBreedings.needPregnancyConfirmation,
          ...orderedBreedings.needBirthConfirmation,
          ...orderedBreedings.finished,
        ]}
        animals={animals}
        onSelect={editRecord}
        onDelete={async (ids) => {
          for (const id of ids) await deleteBreedingRecord(id)
        }}
        onConfirmPregnancy={(record) => {
          setConfirmPregnancyRecord(record)
          setSelectedAnimal(null)
        }}
        toolbar={
          <div className="flex items-center gap-2">
            {etapasGuideDismissed && (
              <Button
                size="xs"
                variant="ghost"
                color="primary"
                icon="help"
                onClick={() => setEtapasGuideDismissed(false)}
                title="Ver guia de etapas"
              />
            )}
            <Button
              size="xs"
              color="success"
              icon="add"
              onClick={() => router.push('/monta/nueva')}
            >
              Nueva Monta
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
            onDeleteBirth={() => null}
          />
        )}
        onView={(row) => {
          const ViewModal = () => {
            const [open, setOpen] = useState(false)
            return (
              <>
                <Button size="xs" variant="ghost" color="primary" icon="view" onClick={() => setOpen(true)}>
                  Ver
                </Button>
                <Modal isOpen={open} onClose={() => setOpen(false)} title={`Monta ${row.record.breedingId || ''}`} size="lg">
                  <div className="p-2">
                    <BreedingCard
                      record={row.record}
                      animals={animals}
                      onEdit={(r) => { setOpen(false); editRecord(r) }}
                      onAddBirth={(r, fId) => { setOpen(false); handleOpenAddBirth(r, fId) }}
                      onConfirmPregnancy={(r, fId) => { setOpen(false); handleOpenConfirmPregnancy(r, fId) }}
                      onUnconfirmPregnancy={handleUnconfirmPregnancy}
                      onDelete={(rec) => { setOpen(false); deleteBreedingRecord(rec.id) }}
                      onRemoveFromBreeding={handleRemoveFromBreeding}
                      onDeleteBirth={() => null}
                    />
                  </div>
                </Modal>
              </>
            )
          }
          return <ViewModal />
        }}
      />
    </div>
  )

  // Partos ordenados por días restantes (atrasados primero, luego más próximos)
  type EnrichedPregnant = (typeof pregnantFemales)[number] & {
    expected: Date | null
    daysLeft: number | null
  }
  const enrichedPregnantFemales: EnrichedPregnant[] = useMemo(
    () =>
      pregnantFemales.map((entry) => {
        const expected = entry.info.expectedBirthDate ? toDate(entry.info.expectedBirthDate) : null
        const daysLeft = expected ? Math.round((expected.getTime() - Date.now()) / 86400000) : null
        return { ...entry, expected, daysLeft }
      }),
    [pregnantFemales],
  )

  const partosColumns: ColumnDef<EnrichedPregnant>[] = useMemo(
    () => [
      {
        key: 'number',
        label: 'Hembra',
        sortable: true,
        sortFn: (a, b) =>
          (a.animal?.animalNumber || '').localeCompare(b.animal?.animalNumber || '', 'es', {
            numeric: true,
          }),
        render: (row) =>
          row.animal ? (
            <ModalAnimalDetails
              animal={row.animal}
              triggerComponent={
                <span className="font-medium text-gray-900 cursor-pointer hover:text-green-700 transition-colors">
                  {row.animal.animalNumber}
                </span>
              }
            />
          ) : (
            <span className="text-gray-400">{row.info.femaleId}</span>
          ),
        className: 'whitespace-nowrap',
      },
      {
        key: 'monta',
        label: 'Monta',
        sortable: true,
        sortFn: (a, b) =>
          (a.record.breedingId || '').localeCompare(b.record.breedingId || '', 'es', {
            numeric: true,
          }),
        render: (row) => (
          <span className="text-gray-600">{row.record.breedingId || row.record.id}</span>
        ),
        className: 'whitespace-nowrap',
      },
      {
        key: 'expected',
        label: 'Parto esperado',
        sortable: true,
        sortFn: (a, b) => {
          if (a.daysLeft === null && b.daysLeft === null) return 0
          if (a.daysLeft === null) return 1
          if (b.daysLeft === null) return -1
          return a.daysLeft - b.daysLeft
        },
        render: (row) => (
          <span className="text-gray-600">
            {row.expected ? row.expected.toLocaleDateString('es-MX') : '—'}
          </span>
        ),
        className: 'whitespace-nowrap',
      },
      {
        key: 'status',
        label: 'Estado',
        sortable: true,
        sortFn: (a, b) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999),
        render: (row) => {
          const badgeColor =
            row.daysLeft !== null && row.daysLeft < 0
              ? 'bg-red-100 text-red-700'
              : row.daysLeft !== null && row.daysLeft <= 15
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-green-100 text-green-700'
          return (
            <span
              className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}
            >
              {row.daysLeft !== null
                ? row.daysLeft === 0
                  ? 'Hoy'
                  : row.daysLeft > 0
                    ? `En ${row.daysLeft}d`
                    : `Atrasado ${Math.abs(row.daysLeft)}d`
                : '—'}
            </span>
          )
        },
        className: 'whitespace-nowrap',
      },
    ],
    [],
  )

  // Tab: Partos próximos
  const partosContent = (
    <div>
      <DataTable
        title={`${animal_stage_config.partos_proximos.icon} Partos próximos`}
        data={enrichedPregnantFemales}
        columns={partosColumns}
        rowKey={(row) => row.record.id + row.info.femaleId}
        defaultSortKey="expected"
        sessionStorageKey="mg_last_parto_id"
        selectable
        emptyMessage="No hay partos próximos."
        onView={(row) =>
          row.animal ? (
            <ModalAnimalDetails
              animal={row.animal}
              triggerComponent={
                <Button size="xs" variant="ghost" color="primary" icon="view">
                  Ver
                </Button>
              }
            />
          ) : null
        }
        renderActions={(row) => (
          <>
            <Button
              size="xs"
              color="success"
              icon="baby"
              onClick={() => {
                setBirthRecord(row.record)
                setBirthFemaleId(row.info.femaleId)
              }}
            >
              Parto
            </Button>
            <Button
              size="xs"
              variant="ghost"
              color="primary"
              icon="edit"
              onClick={() => editRecord(row.record)}
            >
              Editar
            </Button>
            <ButtonConfirm
              openProps={{ size: 'xs', variant: 'ghost', color: 'error', icon: 'close' }}
              confirmProps={{ color: 'error' }}
              openLabel="Desconfirmar"
              confirmText={`¿Desconfirmar embarazo de ${row.animal?.animalNumber || row.info.femaleId}? Se perderá la fecha de parto esperada.`}
              confirmLabel="Desconfirmar"
              onConfirm={() => handleUnconfirmPregnancy(row.record, row.info.femaleId)}
            />
          </>
        )}
      />
    </div>
  )

  // Tab: Destetes próximos — misma vista que BreedingTabs > Destetes
  const destetesContent = (
    <div>
      <DataTable
        title={`${animal_stage_config.destetes_proximos.icon} Destetes próximos`}
        data={unweanedOffspring}
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
              onConfirm={() => wean(row.animal.id, { stageDecision: 'engorda' })}
              openProps={{ size: 'xs', variant: 'ghost', color: 'warning' }}
              confirmProps={{ color: 'warning' }}
            />
            <ButtonConfirm
              openLabel={`${animal_stage_config.reproductor.icon} Reproductor`}
              confirmLabel="Destetar a Reproductor"
              confirmText={`¿Destetar a #${row.animal.animalNumber} y moverlo a Reproductor?`}
              onConfirm={() => wean(row.animal.id, { stageDecision: 'reproductor' })}
              openProps={{ size: 'xs', variant: 'ghost', color: 'error' }}
              confirmProps={{ color: 'error' }}
            />
          </>
        )}
        emptyMessage="No hay crías pendientes de destete."
      />
    </div>
  )

  // ========================
  // SUB-TABS DE ETAPAS
  // ========================
  const etapaLabel = (key: AnimalStageKey, count: number) => {
    const cfg = animal_stage_config[key]
    return `${cfg.icon} ${cfg.label} (${count})`
  }

  const animalColumns: ColumnDef<Animal>[] = useMemo(
    () => [
      {
        key: 'animalNumber',
        label: '#',
        sortable: true,
        sortFn: (a, b) =>
          (a.animalNumber || '').localeCompare(b.animalNumber || '', 'es', { numeric: true }),
        render: (row) => (
          <ModalAnimalDetails
            animal={row}
            triggerComponent={
              <span className="font-medium text-gray-900 cursor-pointer hover:text-green-700 transition-colors">
                {row.animalNumber}
              </span>
            }
          />
        ),
        className: 'whitespace-nowrap',
        headerClassName: 'w-16',
      },
      {
        key: 'type',
        label: 'Especie',
        sortable: true,
        sortFn: (a, b) =>
          (animals_types_labels[a.type] || '').localeCompare(
            animals_types_labels[b.type] || '',
            'es',
          ),
        render: (row) => <span className="text-gray-700">{animals_types_labels[row.type]}</span>,
        className: 'whitespace-nowrap',
      },
      {
        key: 'breed',
        label: 'Raza',
        sortable: true,
        sortFn: (a, b) => (a.breed || '').localeCompare(b.breed || '', 'es'),
        render: (row) => <span className="text-gray-600">{row.breed || '—'}</span>,
        className: 'whitespace-nowrap hidden sm:table-cell',
        headerClassName: 'hidden sm:table-cell',
      },
      {
        key: 'gender',
        label: 'Gen',
        sortable: true,
        sortFn: (a, b) => a.gender.localeCompare(b.gender, 'es'),
        render: (row) => {
          const cfg = animal_gender_config[row.gender]
          return cfg ? (
            <span className={cfg.color} title={cfg.label}>
              {cfg.icon}
            </span>
          ) : null
        },
        className: 'whitespace-nowrap',
      },
      {
        key: 'age',
        label: 'Edad',
        sortable: true,
        sortFn: (a, b) => animalAge(a, { format: 'months' }) - animalAge(b, { format: 'months' }),
        render: (row) => {
          const months = animalAge(row, { format: 'months' })
          return <span className="text-gray-600">{months > 0 ? `${months} m` : '—'}</span>
        },
        className: 'whitespace-nowrap',
      },
      {
        key: 'weight',
        label: 'Peso',
        sortable: true,
        sortFn: (a, b) => {
          const wa = typeof a.weight === 'number' ? a.weight : Number(a.weight || 0)
          const wb = typeof b.weight === 'number' ? b.weight : Number(b.weight || 0)
          return wa - wb
        },
        render: (row) => (
          <span className="text-gray-600">{row.weight ? formatWeight(row.weight) : '—'}</span>
        ),
        className: 'whitespace-nowrap',
      },
      {
        key: 'status',
        label: 'Estado',
        sortable: true,
        sortFn: (a, b) =>
          (animal_status_labels[a.status || 'activo'] || '').localeCompare(
            animal_status_labels[b.status || 'activo'] || '',
            'es',
          ),
        render: (row) => {
          const status = row.status || 'activo'
          return (
            <span className={`text-xs font-medium ${animal_status_colors[status] || ''}`}>
              {animal_status_labels[status]}
            </span>
          )
        },
        className: 'whitespace-nowrap',
      },
    ],
    [],
  )

  const etapasTabs = [
    {
      label: etapaLabel('monta', montasCount),
      content: montaContent,
    },
    {
      label: etapaLabel('partos_proximos', pregnantFemales.length),
      badgeCount: birthsSummary.pastDueCount,
      content: partosContent,
    },
    {
      label: etapaLabel('destetes_proximos', unweanedOffspring.length),
      content: destetesContent,
    },
    {
      label: etapaLabel('engorda', engordaAnimals.length),
      content: (
        <DataTable
          title={`${animal_stage_config.engorda.icon} Engorda`}
          data={engordaAnimals}
          columns={animalColumns}
          rowKey={(row) => row.id}
          defaultSortKey="animalNumber"
          sessionStorageKey="mg_last_engorda_id"
          emptyMessage="No hay animales en engorda."
          onView={(row) => (
            <ModalAnimalDetails
              animal={row}
              triggerComponent={
                <Button size="xs" variant="ghost" color="primary" icon="view">
                  Ver
                </Button>
              }
            />
          )}
        />
      ),
    },
    {
      label: etapaLabel('juvenil', juvenilAnimals.length),
      content: (
        <DataTable
          title={`${animal_stage_config.juvenil.icon} Juvenil`}
          data={juvenilAnimals}
          columns={animalColumns}
          rowKey={(row) => row.id}
          defaultSortKey="animalNumber"
          sessionStorageKey="mg_last_juvenil_id"
          emptyMessage="No hay animales juveniles."
          onView={(row) => (
            <ModalAnimalDetails
              animal={row}
              triggerComponent={
                <Button size="xs" variant="ghost" color="primary" icon="view">
                  Ver
                </Button>
              }
            />
          )}
        />
      ),
    },
    {
      label: etapaLabel('reproductor', reproductorAnimals.length),
      content: (
        <DataTable
          title={`${animal_stage_config.reproductor.icon} Reproducción`}
          data={reproductorAnimals}
          columns={animalColumns}
          rowKey={(row) => row.id}
          defaultSortKey="animalNumber"
          sessionStorageKey="mg_last_reproductor_id"
          emptyMessage="No hay animales en reproducción."
          onView={(row) => (
            <ModalAnimalDetails
              animal={row}
              triggerComponent={
                <Button size="xs" variant="ghost" color="primary" icon="view">
                  Ver
                </Button>
              }
            />
          )}
        />
      ),
    },
    {
      label: etapaLabel('descarte', descarteAnimals.length),
      content: (
        <DataTable
          title={`${animal_stage_config.descarte.icon} Descarte`}
          data={descarteAnimals}
          columns={animalColumns}
          rowKey={(row) => row.id}
          defaultSortKey="animalNumber"
          sessionStorageKey="mg_last_descarte_id"
          emptyMessage="No hay animales en descarte."
          onView={(row) => (
            <ModalAnimalDetails
              animal={row}
              triggerComponent={
                <Button size="xs" variant="ghost" color="primary" icon="view">
                  Ver
                </Button>
              }
            />
          )}
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
        <>
          <AnimalsFilters
            filters={filters}
            setFilters={setFilters}
            filteredCount={filteredAnimals.length}
            activeFilterCount={activeFilterCount}
            availableTypes={availableTypes}
            availableBreeds={availableBreeds}
            availableStages={availableStages}
            availableGenders={availableGenders}
            formatStatLabel={formatStatLabel}
          />
          {isLoadingAnimals ? (
            <div className="bg-white rounded-lg shadow flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
              <span className="ml-3 text-gray-600">Cargando animales...</span>
            </div>
          ) : (
            <AnimalListView
              animals={filteredAnimals}
              enableSelection
              defaultView="cards"
              emptyMessage={
                allAnimals.length === 0
                  ? 'No tienes animales registrados. Comienza agregando tu primer animal.'
                  : 'No se encontraron animales. Intenta ajustar los filtros.'
              }
              selectionActions={selectionActions}
            />
          )}
        </>
      ),
    },
    {
      label: 'Etapas',
      content: (
        <div className="mt-2 space-y-3">
          <AnimalsFilters
            filters={filters}
            setFilters={setFilters}
            filteredCount={filteredAnimals.length}
            activeFilterCount={activeFilterCount}
            availableTypes={availableTypes}
            availableBreeds={availableBreeds}
            availableStages={availableStages}
            availableGenders={availableGenders}
            formatStatLabel={formatStatLabel}
          />
          <Tabs tabs={etapasTabs} tabsId="animals-etapas" />
        </div>
      ),
    },
    {
      label: 'Estadísticas',
      content: <StatisticsTab typeFilter={filters.type} />,
    },
  ]

  return (
    <>
      <Tabs tabs={animalSubTabs} tabsId="animals-section" />

      {/* Modals de bulk actions */}
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
        onSubmit={(r) => updateBreedingRecord(r.id, r)}
        isLoading={false}
        selectedAnimal={selectedAnimal}
      />

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
