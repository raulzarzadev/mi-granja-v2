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
import { Modal } from '@/components/Modal'
import ModalAnimalDetails from '@/components/ModalAnimalDetails'
import ModalBirthForm from '@/components/ModalBirthForm'
import ModalConfirmPregnancy from '@/components/ModalConfirmPregnancy'
import StatisticsTab from '@/components/StatisticsTab'
import Tabs from '@/components/Tabs'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useBreedingCRUD } from '@/hooks/useBreedingCRUD'
import { useLocalPreference } from '@/hooks/useLocalPreference'
import { getWeaningDays } from '@/lib/animalBreedingConfig'
import { toDate } from '@/lib/dates'
import { Animal, AnimalStageKey, animal_stage_config } from '@/types/animals'
import { BreedingRecord } from '@/types/breedings'
import { BreedingActionHandlers } from '@/types/components/breeding'
import ModalBulkHealthAction from '../../ModalBulkHealthAction'
import ModalSaleForm from '../../ModalSaleForm'
import AnimalListView from './AnimalListView'
import { AnimalsFilters, useAnimalFilters } from './animals-filters'

/**
 * Sección de Animales con sub-tabs: Todos, Etapas, Estadísticas
 */
const AnimalsSection: React.FC = () => {
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
    filters,
    setFilters,
    filteredAnimals,
    animals: allAnimals,
    formatStatLabel,
    activeFilterCount,
    availableTypes,
    availableBreeds,
    availableStages,
    availableGenders,
  } = useAnimalFilters()

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
  const [montasViewMode, setMontasViewMode] = useLocalPreference<'cards' | 'table'>(
    'montas_view_mode',
    'cards',
  )
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
  const matchesEtapasFilters = (animal: Animal | undefined) => {
    if (!animal) return false
    if (filters.type && animal.type !== filters.type) return false
    if (filters.breed && animal.breed !== filters.breed) return false
    if (filters.gender && animal.gender !== filters.gender) return false
    const q = filters.search.trim().toLowerCase()
    if (q) {
      const num = animal.animalNumber?.toLowerCase() || ''
      const name = animal.name?.toLowerCase() || ''
      const notes = animal.notes?.toLowerCase() || ''
      if (!num.includes(q) && !name.includes(q) && !notes.includes(q)) return false
    }
    return true
  }

  // --- Montas ordenadas ---
  const orderedBreedings = useMemo(() => {
    const needPregnancyConfirmation: BreedingRecord[] = []
    const needBirthConfirmation: BreedingRecord[] = []
    const finished: BreedingRecord[] = []

    breedingRecords.forEach((r) => {
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
  }, [breedingRecords])

  // --- Partos próximos ---
  const pregnantFemales = useMemo(
    () =>
      breedingRecords.flatMap((record) =>
        record.femaleBreedingInfo
          .filter((f) => f.pregnancyConfirmedDate && !f.actualBirthDate)
          .map((info) => ({
            record,
            info,
            animal: animals.find((a) => a.id === info.femaleId),
          }))
          .filter(({ animal }) => matchesEtapasFilters(animal)),
      ),
    [breedingRecords, animals, filters],
  )
  const birthsWindow = getBirthsWindow(14)
  const birthsSummary = getBirthsWindowSummary(14)

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
            matchesEtapasFilters(a)
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
    return result.sort((a, b) => {
      if (a.daysUntilWean === null && b.daysUntilWean === null) return 0
      if (a.daysUntilWean === null) return 1
      if (b.daysUntilWean === null) return -1
      return a.daysUntilWean - b.daysUntilWean
    })
  }, [breedingRecords, animals, filters])

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
  const reproductorAnimals = useMemo(
    () => activeAnimals.filter((a) => a.stage === 'reproductor' && matchesEtapasFilters(a)),
    [activeAnimals, filters],
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

  // Tab: Monta — misma vista que BreedingTabs > Montas
  const montaContent = (
    <div className="space-y-8">
      {!etapasGuideDismissed && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
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
                Empieza creando una monta con el boton{' '}
                <strong>&quot;Nueva Monta&quot;</strong>.
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
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{animal_stage_config.monta.icon} Monta</h3>
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
            </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setMontasViewMode('cards')}
                className={`p-1.5 transition-colors cursor-pointer ${
                  montasViewMode === 'cards'
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
                title="Vista de tarjetas"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.25 2A2.25 2.25 0 0 0 2 4.25v2.5A2.25 2.25 0 0 0 4.25 9h2.5A2.25 2.25 0 0 0 9 6.75v-2.5A2.25 2.25 0 0 0 6.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 2 13.25v2.5A2.25 2.25 0 0 0 4.25 18h2.5A2.25 2.25 0 0 0 9 15.75v-2.5A2.25 2.25 0 0 0 6.75 11h-2.5Zm9-9A2.25 2.25 0 0 0 11 4.25v2.5A2.25 2.25 0 0 0 13.25 9h2.5A2.25 2.25 0 0 0 18 6.75v-2.5A2.25 2.25 0 0 0 15.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 11 13.25v2.5A2.25 2.25 0 0 0 13.25 18h2.5A2.25 2.25 0 0 0 18 15.75v-2.5A2.25 2.25 0 0 0 15.75 11h-2.5Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              <button
                onClick={() => setMontasViewMode('table')}
                className={`p-1.5 transition-colors cursor-pointer ${
                  montasViewMode === 'table'
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
                title="Vista de tabla"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M2 3.75A.75.75 0 0 1 2.75 3h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 3.75Zm0 4.167a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Zm0 4.166a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Zm0 4.167a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
            <Button
              size="xs"
              color="success"
              icon="add"
              onClick={() => router.push('/monta/nueva')}
            >
              Nueva Monta
            </Button>
          </div>
        </div>

        {montasViewMode === 'table' ? (
          <BreedingTable
            records={[
              ...orderedBreedings.needPregnancyConfirmation,
              ...orderedBreedings.needBirthConfirmation,
              ...orderedBreedings.finished,
            ]}
            animals={animals}
            onSelect={editRecord}
            onDelete={(ids) => {
              for (const id of ids) deleteBreedingRecord(id)
            }}
          />
        ) : (
          <>
            {orderedBreedings.needPregnancyConfirmation.length === 0 &&
            orderedBreedings.needBirthConfirmation.length === 0 ? (
              <p className="text-sm text-gray-500">No hay montas pendientes.</p>
            ) : (
              <div className="space-y-8">
                {orderedBreedings.needPregnancyConfirmation.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <span>Por confirmar gestacion</span>
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                        {orderedBreedings.needPregnancyConfirmation.length}
                      </span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {orderedBreedings.needPregnancyConfirmation.map((r) => (
                        <BreedingCard
                          key={r.id}
                          record={r}
                          animals={animals}
                          onEdit={editRecord}
                          onAddBirth={handleOpenAddBirth}
                          onConfirmPregnancy={(record, femaleId) =>
                            handleOpenConfirmPregnancy(record, femaleId)
                          }
                          onUnconfirmPregnancy={handleUnconfirmPregnancy}
                          onDelete={(rec) => deleteBreedingRecord(rec.id)}
                          onRemoveFromBreeding={handleRemoveFromBreeding}
                          onDeleteBirth={() => null}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {orderedBreedings.needBirthConfirmation.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <span>Partos próximos</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        {orderedBreedings.needBirthConfirmation.length}
                      </span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {orderedBreedings.needBirthConfirmation.map((r) => (
                        <BreedingCard
                          key={r.id}
                          record={r}
                          animals={animals}
                          onEdit={editRecord}
                          onAddBirth={handleOpenAddBirth}
                          onConfirmPregnancy={setConfirmPregnancyRecord}
                          onUnconfirmPregnancy={handleUnconfirmPregnancy}
                          onDelete={(rec) => deleteBreedingRecord(rec.id)}
                          onRemoveFromBreeding={handleRemoveFromBreeding}
                          onDeleteBirth={() => null}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-3">Montas Finalizadas</h3>
              {orderedBreedings.finished.length === 0 ? (
                <p className="text-sm text-gray-500">No hay montas finalizadas.</p>
              ) : (
                <details className="group">
                  <summary className="cursor-pointer text-sm text-gray-700 hover:text-gray-900 flex items-center gap-2">
                    Ver mas ({orderedBreedings.finished.length})
                  </summary>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {orderedBreedings.finished.map((r) => (
                      <BreedingCard
                        key={r.id}
                        record={r}
                        animals={animals}
                        onEdit={editRecord}
                        onAddBirth={handleOpenAddBirth}
                        onConfirmPregnancy={setConfirmPregnancyRecord}
                        onUnconfirmPregnancy={handleUnconfirmPregnancy}
                        onDelete={(rec) => deleteBreedingRecord(rec.id)}
                        onRemoveFromBreeding={handleRemoveFromBreeding}
                        onDeleteBirth={() => null}
                      />
                    ))}
                  </div>
                </details>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )

  // Tab: Partos próximos — misma vista que BreedingTabs > Partos próximos
  const partosContent = (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">
        {animal_stage_config.partos_proximos.icon} Partos próximos
      </h3>
      {(birthsWindow.pastDue.length > 0 || birthsWindow.upcoming.length > 0) && (
        <div className="bg-white rounded-lg shadow p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Próximos / Atrasados</h4>
          <BirthsWindowSummary
            pastDue={birthsWindow.pastDue}
            upcoming={birthsWindow.upcoming}
            days={birthsSummary.windowDays}
            animals={animals}
            onSelectRecord={(r, femaleId) => {
              setBirthRecord(r)
              setBirthFemaleId(femaleId)
            }}
          />
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4">
        {pregnantFemales.length === 0 ? (
          <p className="text-sm text-gray-500">No hay partos próximos.</p>
        ) : (
          <ul className="divide-y">
            {pregnantFemales.map(({ record, info, animal }) => {
              const expected = info.expectedBirthDate ? toDate(info.expectedBirthDate) : null
              const daysLeft = expected
                ? Math.round((expected.getTime() - Date.now()) / 86400000)
                : null
              return (
                <li
                  key={record.id + info.femaleId}
                  className="py-3 flex flex-col sm:flex-row sm:items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg">
                        {animal?.type === 'oveja'
                          ? '🐑'
                          : animal?.type === 'cabra'
                            ? '🐐'
                            : animal?.type?.includes('vaca')
                              ? '🐄'
                              : '🐾'}
                      </span>
                      <span className="font-medium">{animal?.animalNumber || info.femaleId}</span>
                      {expected && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            daysLeft !== null && daysLeft < 0
                              ? 'bg-red-100 text-red-700'
                              : daysLeft !== null && daysLeft <= 7
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {expected.toLocaleDateString()} (
                          {daysLeft !== null
                            ? daysLeft === 0
                              ? 'Hoy'
                              : daysLeft > 0
                                ? `En ${daysLeft}d`
                                : `Atrasado ${Math.abs(daysLeft)}d`
                            : '—'}
                          )
                        </span>
                      )}
                      {info.pregnancyConfirmedDate && (
                        <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded">
                          Confirmado
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      Monta: {record.id}{' '}
                      {record.breedingDate && (
                        <>· {toDate(record.breedingDate).toLocaleDateString()}</>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="text-xs bg-green-600 hover:bg-green-700 text-white font-medium px-3 py-1.5 rounded-lg shadow-sm cursor-pointer transition-colors"
                      onClick={() => {
                        setBirthRecord(record)
                        setBirthFemaleId(info.femaleId)
                      }}
                    >
                      Registrar parto
                    </button>
                    <button
                      className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1.5 rounded cursor-pointer transition-colors"
                      onClick={() => editRecord(record)}
                    >
                      Ver monta
                    </button>
                    <button
                      className="text-xs text-gray-400 hover:text-red-500 px-2 py-1.5 rounded cursor-pointer transition-colors"
                      onClick={() => handleUnconfirmPregnancy(record, info.femaleId)}
                    >
                      Desconfirmar
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )

  // Tab: Destetes próximos — misma vista que BreedingTabs > Destetes
  const destetesContent = (
    <div>
      <h3 className="text-lg font-semibold mb-3">
        {animal_stage_config.destetes_proximos.icon} Destetes próximos
      </h3>
      <div className="bg-white rounded-lg shadow">
        {unweanedOffspring.length === 0 ? (
          <p className="text-sm text-gray-500 p-4">No hay crías pendientes de destete.</p>
        ) : (
          <>
            {/* Toolbar de selección */}
            <div className="px-4 py-2.5 border-b border-gray-100 space-y-2 flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={
                    selectedWeanIds.size === unweanedOffspring.length &&
                    unweanedOffspring.length > 0
                  }
                  onChange={() => {
                    if (selectedWeanIds.size === unweanedOffspring.length) {
                      setSelectedWeanIds(new Set())
                    } else {
                      setSelectedWeanIds(new Set(unweanedOffspring.map(({ animal: a }) => a.id)))
                    }
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                />
                {selectedWeanIds.size > 0
                  ? `${selectedWeanIds.size} seleccionados`
                  : 'Seleccionar todos'}
              </label>

              {selectedWeanIds.size > 0 && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button size="sm" color="warning" onClick={() => openBulkWean('engorda')}>
                    {animal_stage_config.engorda.icon} Destetar ({selectedWeanIds.size}) a Engorda
                  </Button>
                  <Button size="sm" color="error" onClick={() => openBulkWean('reproductor')}>
                    {animal_stage_config.reproductor.icon} Destetar ({selectedWeanIds.size}) a
                    Reproductor
                  </Button>
                </div>
              )}
            </div>

            <ul className="divide-y px-4">
              {unweanedOffspring.map(({ animal: a, motherId, daysUntilWean }) => {
                const mother = animals.find((an) => an.id === motherId)
                const isOverdue = daysUntilWean !== null && daysUntilWean < 0
                const isSoon = daysUntilWean !== null && daysUntilWean >= 0 && daysUntilWean <= 7
                const isSelected = selectedWeanIds.has(a.id)
                return (
                  <li key={a.id} className="py-3 flex items-center gap-3 flex-wrap sm:flex-nowrap">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleWeanSelect(a.id)}
                      className="w-4 h-4 shrink-0 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                    />
                    <ModalAnimalDetails
                      animal={a}
                      triggerComponent={
                        <div className="cursor-pointer hover:bg-gray-50 rounded-lg p-1 transition-colors">
                          <AnimalBadges animal={a} />
                        </div>
                      }
                    />
                    <span
                      className={`text-xs px-2 py-0.5 rounded whitespace-nowrap ${
                        isOverdue
                          ? 'bg-red-100 text-red-700'
                          : isSoon
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {daysUntilWean !== null
                        ? daysUntilWean === 0
                          ? 'Hoy'
                          : daysUntilWean > 0
                            ? `En ${daysUntilWean}d`
                            : `Hace ${Math.abs(daysUntilWean)}d`
                        : 'Sin fecha'}
                    </span>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                      M: {mother?.animalNumber || '—'}
                    </span>
                    <div className="flex items-center gap-2 shrink-0 ml-auto">
                      <ButtonConfirm
                        openLabel={`${animal_stage_config.engorda.icon} Destetar a Engorda`}
                        confirmLabel={`${animal_stage_config.engorda.icon} Destetar a Engorda`}
                        confirmText={`¿Destetar a #${a.animalNumber} y moverlo a Engorda?`}
                        onConfirm={() => wean(a.id, { stageDecision: 'engorda' })}
                        openProps={{
                          size: 'sm',
                          color: 'warning',
                          variant: 'outline',
                          className: '!px-2 !py-1 !text-xs',
                        }}
                        confirmProps={{ color: 'warning' }}
                      />
                      <ButtonConfirm
                        openLabel={`${animal_stage_config.reproductor.icon} Destetar a Reproductor`}
                        confirmLabel={`${animal_stage_config.reproductor.icon} Destetar a Reproductor`}
                        confirmText={`¿Destetar a #${a.animalNumber} y moverlo a Reproductor? (pasará por etapa Juvenil primero)`}
                        onConfirm={() => wean(a.id, { stageDecision: 'reproductor' })}
                        openProps={{
                          size: 'sm',
                          color: 'error',
                          variant: 'outline',
                          className: '!px-2 !py-1 !text-xs',
                        }}
                        confirmProps={{ color: 'error' }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  )

  // ========================
  // SUB-TABS DE ETAPAS
  // ========================
  const etapaLabel = (key: AnimalStageKey, count: number) => {
    const cfg = animal_stage_config[key]
    return `${cfg.icon} ${cfg.label} (${count})`
  }

  const etapaTitle = (key: AnimalStageKey) => {
    const cfg = animal_stage_config[key]
    return (
      <h3 className="text-lg font-semibold mb-3">
        {cfg.icon} {cfg.label}
      </h3>
    )
  }

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
        <div>
          {etapaTitle('engorda')}
          <AnimalListView animals={engordaAnimals} emptyMessage="No hay animales en engorda." />
        </div>
      ),
    },
    {
      label: etapaLabel('juvenil', juvenilAnimals.length),
      content: (
        <div>
          {etapaTitle('juvenil')}
          <AnimalListView animals={juvenilAnimals} emptyMessage="No hay animales juveniles." />
        </div>
      ),
    },
    {
      label: etapaLabel('reproductor', reproductorAnimals.length),
      content: (
        <div>
          {etapaTitle('reproductor')}
          <AnimalListView
            animals={reproductorAnimals}
            emptyMessage="No hay animales en reproducción."
          />
        </div>
      ),
    },
    {
      label: etapaLabel('descarte', descarteAnimals.length),
      content: (
        <div>
          {etapaTitle('descarte')}
          <AnimalListView animals={descarteAnimals} emptyMessage="No hay animales en descarte." />
        </div>
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
      content: <StatisticsTab />,
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
