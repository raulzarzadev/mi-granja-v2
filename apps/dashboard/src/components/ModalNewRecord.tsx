'use client'

import { useEffect, useMemo, useState } from 'react'
import BreedingForm from '@/components/BreedingForm'
import Button from '@/components/buttons/Button'
import InputSelectAnimals from '@/components/inputs/InputSelectAnimals'
import { Modal } from '@/components/Modal'
import ModalBirthForm from '@/components/ModalBirthForm'
import type { SaleCompletionSummary } from '@/components/ModalSaleForm'
import ModalSaleForm from '@/components/ModalSaleForm'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useBreedingCRUD } from '@/hooks/useBreedingCRUD'
import { animalDeathReasonLabels, buildDeathStatusNotes } from '@/lib/animal-discharge'
import { activeUnweanedOffspring } from '@/lib/animal-utils'
import type { BirthRecord } from '@/types'
import type { Animal, AnimalDeathReason, AnimalRecord } from '@/types/animals'
import type { BreedingRecord } from '@/types/breedings'

const recordOptions = [
  {
    id: 'monta',
    label: 'Empadre',
    description: 'Inicia un empadre entre un macho y una o más hembras.',
    icon: '🐐',
    activeClass: 'border-amber-400 bg-amber-50 text-amber-900',
  },
  {
    id: 'destete',
    label: 'Destete',
    description: 'Registra el cambio de etapa de una cría.',
    icon: '🍼',
    activeClass: 'border-green-500 bg-green-50 text-green-900',
  },
  {
    id: 'parto',
    label: 'Parto',
    description: 'Registra el nacimiento de las crías de una hembra.',
    icon: '🐣',
    activeClass: 'border-blue-500 bg-blue-50 text-blue-900',
  },
  {
    id: 'muerte',
    label: 'Muerte',
    description: 'Registra la baja de un animal por muerte.',
    icon: '💀',
    activeClass: 'border-red-500 bg-red-50 text-red-900',
  },
  {
    id: 'venta',
    label: 'Venta',
    description: 'Registra la salida de uno o más animales por venta.',
    icon: '💰',
    activeClass: 'border-teal-500 bg-teal-50 text-teal-900',
  },
] as const

type RecordOptionId = (typeof recordOptions)[number]['id']
type WeaningDestination = 'engorda' | 'reproductor'
type DeathStep = 'form' | 'review' | 'success'
type AnimalDeathSnapshot = Pick<
  Animal,
  'id' | 'status' | 'statusAt' | 'statusNotes' | 'deathInfo' | 'soldInfo' | 'lostInfo' | 'records'
>
type ActionRecordData = Omit<
  AnimalRecord,
  'id' | 'createdAt' | 'createdBy' | 'appliedToAnimals' | 'isBulkApplication'
>
type ActionRecommendation = {
  key: string
  message: string
}

type NewRecordDraft = {
  id: string
  version: 1
  selectedOption: RecordOptionId
  selectedAnimalIds: string[]
  isMontaFormOpen: boolean
  actionDate: string
  weaningDestination: WeaningDestination
  deathReason: AnimalDeathReason | ''
  deathDescription: string
  deathStep: DeathStep
  updatedAt: string
}

const NEW_RECORD_DRAFT_STORAGE_KEY = 'mi-granja:new-record-draft:v1'
export const BREEDING_FORM_DRAFT_STORAGE_KEY = `${NEW_RECORD_DRAFT_STORAGE_KEY}:breeding-form`

const createDraftId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const isRecordOptionId = (value: unknown): value is RecordOptionId =>
  recordOptions.some((option) => option.id === value)

const normalizeNewRecordDraft = (
  value: unknown,
  fallbackId = createDraftId(),
): NewRecordDraft | null => {
  if (!value || typeof value !== 'object') return null

  const draft = value as Partial<NewRecordDraft>
  if (
    draft.version !== 1 ||
    !isRecordOptionId(draft.selectedOption) ||
    !Array.isArray(draft.selectedAnimalIds)
  ) {
    return null
  }

  return {
    id: typeof draft.id === 'string' ? draft.id : fallbackId,
    version: 1,
    selectedOption: draft.selectedOption,
    selectedAnimalIds: draft.selectedAnimalIds.filter(
      (animalId): animalId is string => typeof animalId === 'string',
    ),
    isMontaFormOpen: draft.isMontaFormOpen === true,
    actionDate: typeof draft.actionDate === 'string' ? draft.actionDate : '',
    weaningDestination: draft.weaningDestination === 'engorda' ? 'engorda' : 'reproductor',
    deathReason: typeof draft.deathReason === 'string' ? draft.deathReason : '',
    deathDescription: typeof draft.deathDescription === 'string' ? draft.deathDescription : '',
    deathStep:
      draft.deathStep === 'review' || draft.deathStep === 'success' ? draft.deathStep : 'form',
    updatedAt: typeof draft.updatedAt === 'string' ? draft.updatedAt : new Date().toISOString(),
  }
}

const readNewRecordDrafts = (): NewRecordDraft[] => {
  if (typeof window === 'undefined') return []

  try {
    const rawDraft = window.localStorage.getItem(NEW_RECORD_DRAFT_STORAGE_KEY)
    if (!rawDraft) return []

    const parsedDrafts: unknown = JSON.parse(rawDraft)
    if (Array.isArray(parsedDrafts)) {
      return parsedDrafts
        .map((draft) => normalizeNewRecordDraft(draft))
        .filter((draft): draft is NewRecordDraft => draft !== null)
    }

    const legacyDraft = normalizeNewRecordDraft(parsedDrafts, 'legacy')
    return legacyDraft ? [legacyDraft] : []
  } catch (error) {
    console.warn('No se pudo leer el borrador de nuevo registro', error)
    return []
  }
}

const getBreedingFormDraftStorageKey = (draftId: string) =>
  draftId === 'legacy'
    ? BREEDING_FORM_DRAFT_STORAGE_KEY
    : `${BREEDING_FORM_DRAFT_STORAGE_KEY}:${draftId}`

const toInputDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const fromInputDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const formatInputDate = (value: string) =>
  fromInputDate(value).toLocaleDateString('es-MX', {
    dateStyle: 'long',
  })

export default function ModalNewRecord() {
  const { animals, addRecord, addBulkRecord, create, markStatus, update, wean } = useAnimalCRUD()
  const {
    breedingRecords,
    createBreedingRecord,
    isSubmitting: isBreedingSubmitting,
    updateBreedingRecord,
  } = useBreedingCRUD()

  const [isOpen, setIsOpen] = useState(false)
  const [storedDrafts, setStoredDrafts] = useState<NewRecordDraft[]>([])
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null)
  const [isDraftsOpen, setIsDraftsOpen] = useState(false)
  const [selectedOption, setSelectedOption] = useState<RecordOptionId | null>(null)
  const [selectedAnimalIds, setSelectedAnimalIds] = useState<string[]>([])
  const [isMontaFormOpen, setIsMontaFormOpen] = useState(false)
  const [onlyAvailableMontaFemales, setOnlyAvailableMontaFemales] = useState(true)
  const [isSaleOpen, setIsSaleOpen] = useState(false)
  const [isBirthOpen, setIsBirthOpen] = useState(false)
  const [actionDate, setActionDate] = useState(() => toInputDate(new Date()))
  const [weaningDestination, setWeaningDestination] = useState<WeaningDestination>('reproductor')
  const [deathReason, setDeathReason] = useState<AnimalDeathReason | ''>('')
  const [deathDescription, setDeathDescription] = useState('')
  const [deathStep, setDeathStep] = useState<DeathStep>('form')
  const [deathPreviousStates, setDeathPreviousStates] = useState<
    Record<string, AnimalDeathSnapshot>
  >({})
  const [isUndoingDeath, setIsUndoingDeath] = useState(false)
  const [isActionSubmitting, setIsActionSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    setStoredDrafts(readNewRecordDrafts())
  }, [])

  const addActionRecord = async (animalIds: string[], recordData: ActionRecordData) => {
    const ids = Array.from(new Set(animalIds.filter(Boolean)))
    if (ids.length === 0) throw new Error('No se han seleccionado animales')

    const recordId =
      ids.length === 1 ? await addRecord(ids[0], recordData) : await addBulkRecord(ids, recordData)
    if (!recordId) throw new Error('No se pudo guardar el registro del evento')
    return recordId
  }

  const selectedRecord = recordOptions.find((option) => option.id === selectedOption)
  const selectedAnimals = useMemo(
    () => animals.filter((animal) => selectedAnimalIds.includes(animal.id)),
    [animals, selectedAnimalIds],
  )
  const selectedMontaMale = useMemo(
    () =>
      selectedOption === 'monta'
        ? selectedAnimals.find((animal) => animal.gender === 'macho')
        : undefined,
    [selectedAnimals, selectedOption],
  )
  const selectedMontaFemaleIds = useMemo(
    () =>
      selectedOption === 'monta'
        ? selectedAnimalIds.filter((animalId) => animalId !== selectedMontaMale?.id)
        : [],
    [selectedAnimalIds, selectedMontaMale, selectedOption],
  )
  const montaMales = useMemo(
    () =>
      animals.filter(
        (animal) =>
          (animal.status ?? 'activo') === 'activo' &&
          animal.gender === 'macho' &&
          animal.computedStage === 'reproductor',
      ),
    [animals],
  )
  const montaFemales = useMemo(
    () =>
      animals.filter(
        (animal) =>
          (animal.status ?? 'activo') === 'activo' &&
          animal.gender === 'hembra' &&
          animal.computedStage === 'reproductor' &&
          (!selectedMontaMale || animal.type === selectedMontaMale.type),
      ),
    [animals, selectedMontaMale],
  )
  const busyMontaFemaleIds = useMemo(() => {
    const ids = new Set<string>()
    for (const record of breedingRecords) {
      for (const femaleInfo of record.femaleBreedingInfo) {
        if (!femaleInfo.actualBirthDate) ids.add(femaleInfo.femaleId)
      }
    }
    return ids
  }, [breedingRecords])
  const availableMontaFemaleIds = useMemo(
    () =>
      new Set(
        montaFemales
          .filter(
            (animal) =>
              !animal.pregnantAt && !animal.birthedAt && !busyMontaFemaleIds.has(animal.id),
          )
          .map((animal) => animal.id),
      ),
    [busyMontaFemaleIds, montaFemales],
  )
  const selectedBirthAnimal = selectedAnimalIds.length === 1 ? selectedAnimals[0] : undefined
  const selectedBirthRecord = useMemo(() => {
    if (!selectedBirthAnimal) return null
    return (
      breedingRecords.find(
        (record) => record.id === selectedBirthAnimal.pregnantBreedingRecordId,
      ) ??
      breedingRecords.find((record) => {
        const info = record.femaleBreedingInfo.find(
          (femaleInfo) => femaleInfo.femaleId === selectedBirthAnimal.id,
        )
        return Boolean(info && !info.actualBirthDate)
      }) ??
      null
    )
  }, [breedingRecords, selectedBirthAnimal])

  const hasSelectedActionAnimals =
    selectedOption === 'monta'
      ? Boolean(selectedMontaMale && selectedMontaFemaleIds.length > 0)
      : selectedAnimalIds.length > 0

  const actionRecommendations = useMemo<ActionRecommendation[]>(() => {
    if (!selectedOption || selectedAnimals.length === 0) return []

    const recommendations: ActionRecommendation[] = []
    const seen = new Set<string>()
    const addRecommendation = (key: string, message: string) => {
      if (seen.has(key)) return
      seen.add(key)
      recommendations.push({ key, message })
    }

    for (const animal of selectedAnimals) {
      const offspring = [
        ...activeUnweanedOffspring({ farmAnimals: animals, motherId: animal.id }),
        ...(animal.animalNumber
          ? activeUnweanedOffspring({ farmAnimals: animals, motherId: animal.animalNumber })
          : []),
      ].filter(
        (candidate, index, all) => all.findIndex((item) => item.id === candidate.id) === index,
      )
      const offspringNumbers = offspring.map((candidate) => candidate.animalNumber).join(', ')
      const hasActiveBreeding = breedingRecords.some((breedingRecord) => {
        if (breedingRecord.status === 'finished') return false
        const isMale =
          breedingRecord.maleId === animal.id || breedingRecord.maleId === animal.animalNumber
        const isFemale = breedingRecord.femaleBreedingInfo.some(
          (femaleInfo) =>
            (femaleInfo.femaleId === animal.id || femaleInfo.femaleId === animal.animalNumber) &&
            !femaleInfo.actualBirthDate,
        )
        return isMale || isFemale
      })

      if (selectedOption === 'muerte') {
        if (offspring.length > 0) {
          addRecommendation(
            `${animal.id}-offspring`,
            `${animal.animalNumber} tiene ${offspring.length} cría${offspring.length === 1 ? '' : 's'} sin destetar${offspringNumbers ? ` (${offspringNumbers})` : ''}. Verifica que tengan los cuidados necesarios antes de registrar la muerte.`,
          )
        }
        if (animal.pregnantAt) {
          addRecommendation(
            `${animal.id}-pregnancy`,
            `${animal.animalNumber} tiene gestación activa. Verifica el manejo de la gestación antes de darlo de baja.`,
          )
        }
        if (animal.lactationStatus === 'active') {
          addRecommendation(
            `${animal.id}-lactation`,
            `${animal.animalNumber} tiene lactancia activa. Verifica el cuidado de sus crías y el suministro de leche.`,
          )
        }
        if (hasActiveBreeding) {
          addRecommendation(
            `${animal.id}-breeding`,
            `${animal.animalNumber} participa en un empadre activo. Revisa el empadre antes de darlo de baja.`,
          )
        }
      }

      if (selectedOption === 'venta') {
        if (offspring.length > 0) {
          addRecommendation(
            `${animal.id}-offspring`,
            `${animal.animalNumber} tiene ${offspring.length} cría${offspring.length === 1 ? '' : 's'} sin destetar${offspringNumbers ? ` (${offspringNumbers})` : ''}. Verifica la separación y sus cuidados antes de registrar la venta.`,
          )
        }
        if (animal.pregnantAt || animal.lactationStatus === 'active') {
          addRecommendation(
            `${animal.id}-reproductive-state`,
            `${animal.animalNumber} tiene ${animal.pregnantAt ? 'gestación' : 'lactancia'} activa. Confirma que la venta sea correcta para su estado reproductivo.`,
          )
        }
        if (hasActiveBreeding) {
          addRecommendation(
            `${animal.id}-breeding`,
            `${animal.animalNumber} participa en un empadre activo. Revisa el empadre antes de registrar la venta.`,
          )
        }
      }

      if (selectedOption === 'destete' && offspring.length === 0 && animal.stage !== 'cria') {
        addRecommendation(
          `${animal.id}-stage`,
          `${animal.animalNumber} no aparece como cría activa sin destetar. Verifica la selección antes de registrar el destete.`,
        )
      }

      if (selectedOption === 'parto' && offspring.length > 0) {
        addRecommendation(
          `${animal.id}-offspring`,
          `${animal.animalNumber} ya tiene ${offspring.length} cría${offspring.length === 1 ? '' : 's'} sin destetar. Confirma que el parto corresponda a la gestación actual.`,
        )
      }

      if (selectedOption === 'monta' && animal.pregnantAt) {
        addRecommendation(
          `${animal.id}-pregnancy`,
          `${animal.animalNumber} tiene gestación activa. Verifica antes de incluirla en un nuevo empadre.`,
        )
      }
      if (selectedOption === 'monta' && hasActiveBreeding) {
        addRecommendation(
          `${animal.id}-breeding`,
          `${animal.animalNumber} ya participa en un empadre activo. Verifica antes de iniciar otro.`,
        )
      }
    }

    return recommendations
  }, [animals, breedingRecords, selectedAnimals, selectedOption])

  const resetActionState = () => {
    setSelectedOption(null)
    setSelectedAnimalIds([])
    setActiveDraftId(null)
    setIsMontaFormOpen(false)
    setIsSaleOpen(false)
    setIsBirthOpen(false)
    setActionDate(toInputDate(new Date()))
    setWeaningDestination('reproductor')
    setDeathReason('')
    setDeathDescription('')
    setDeathStep('form')
    setDeathPreviousStates({})
    setIsUndoingDeath(false)
    setIsActionSubmitting(false)
    setActionError(null)
  }

  const buildCurrentDraft = (): NewRecordDraft | null => {
    if (!selectedOption) return null
    return {
      id: activeDraftId ?? createDraftId(),
      version: 1,
      selectedOption,
      selectedAnimalIds,
      isMontaFormOpen,
      actionDate,
      weaningDestination,
      deathReason,
      deathDescription,
      deathStep,
      updatedAt: new Date().toISOString(),
    }
  }

  const persistCurrentDraft = () => {
    const draft = buildCurrentDraft()
    if (!draft || typeof window === 'undefined') return

    try {
      const nextDrafts = [
        draft,
        ...storedDrafts.filter((storedDraft) => storedDraft.id !== draft.id),
      ]
      window.localStorage.setItem(NEW_RECORD_DRAFT_STORAGE_KEY, JSON.stringify(nextDrafts))
      setStoredDrafts(nextDrafts)
      setActiveDraftId(draft.id)
    } catch (error) {
      console.warn('No se pudo guardar el borrador de nuevo registro', error)
    }
  }

  useEffect(() => {
    if (!isOpen || !selectedOption) return
    persistCurrentDraft()
    // El borrador se actualiza mientras el usuario completa el formulario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isOpen,
    selectedOption,
    activeDraftId,
    selectedAnimalIds,
    isMontaFormOpen,
    actionDate,
    weaningDestination,
    deathReason,
    deathDescription,
    deathStep,
  ])

  const clearDraft = () => {
    const draftId = activeDraftId
    const nextDrafts = draftId
      ? storedDrafts.filter((storedDraft) => storedDraft.id !== draftId)
      : storedDrafts

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(NEW_RECORD_DRAFT_STORAGE_KEY, JSON.stringify(nextDrafts))
        if (draftId) {
          window.localStorage.removeItem(getBreedingFormDraftStorageKey(draftId))
        }
      } catch (error) {
        console.warn('No se pudo eliminar el borrador de nuevo registro', error)
      }
    }
    setStoredDrafts(nextDrafts)
    setActiveDraftId(null)
  }

  const restoreStoredDraft = (draft: NewRecordDraft) => {
    setActiveDraftId(draft.id)
    setSelectedOption(draft.selectedOption)
    setSelectedAnimalIds(draft.selectedAnimalIds)
    setIsMontaFormOpen(draft.isMontaFormOpen)
    setActionDate(draft.actionDate)
    setWeaningDestination(draft.weaningDestination)
    setDeathReason(draft.deathReason)
    setDeathDescription(draft.deathDescription)
    setDeathStep(draft.deathStep)
    setActionError(null)
    setIsDraftsOpen(false)
  }

  const removeStoredDraft = (draftId: string) => {
    const nextDrafts = storedDrafts.filter((draft) => draft.id !== draftId)

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(NEW_RECORD_DRAFT_STORAGE_KEY, JSON.stringify(nextDrafts))
        window.localStorage.removeItem(getBreedingFormDraftStorageKey(draftId))
      } catch (error) {
        console.warn('No se pudo eliminar el borrador de nuevo registro', error)
      }
    }

    setStoredDrafts(nextDrafts)
    if (activeDraftId === draftId) {
      resetActionState()
    }
  }

  const selectRecordOption = (optionId: RecordOptionId) => {
    setSelectedOption(optionId)
    setSelectedAnimalIds([])
    setActiveDraftId(createDraftId())
    setIsMontaFormOpen(false)
    setActionError(null)
  }

  const closeModal = () => {
    persistCurrentDraft()
    setIsOpen(false)
    resetActionState()
  }

  const completeAndCloseModal = () => {
    clearDraft()
    setIsOpen(false)
    resetActionState()
  }

  const handleWean = async () => {
    if (!actionDate) {
      setActionError('Selecciona la fecha del destete.')
      return
    }

    setIsActionSubmitting(true)
    setActionError(null)
    let updatedAnimalCount = 0
    try {
      const weanDate = fromInputDate(actionDate)
      for (const animalId of selectedAnimalIds) {
        await wean(animalId, { weanDate, stageDecision: weaningDestination })
        updatedAnimalCount += 1
      }
      await addActionRecord(selectedAnimalIds, {
        type: 'event',
        category: 'other',
        eventType: 'destete',
        title: 'Destete registrado',
        description: `Destino: ${weaningDestination === 'engorda' ? 'Engorda' : 'Reproducción'}`,
        date: weanDate,
      })
      completeAndCloseModal()
    } catch (error) {
      console.error('Error registrando destete múltiple:', error)
      setActionError(
        updatedAnimalCount > 0
          ? 'El destete se aplicó, pero no se pudo guardar el historial. Revisa Registros.'
          : 'No se pudo registrar el destete. Revisa los animales seleccionados.',
      )
    } finally {
      setIsActionSubmitting(false)
    }
  }

  const reviewDeath = () => {
    if (!deathReason) {
      setActionError('Selecciona la causa de muerte.')
      return
    }
    if (!actionDate) {
      setActionError('Selecciona la fecha de la muerte.')
      return
    }
    if (fromInputDate(actionDate).getTime() > fromInputDate(toInputDate(new Date())).getTime()) {
      setActionError('La fecha de la muerte no puede estar en el futuro.')
      return
    }

    setActionError(null)
    setDeathStep('review')
  }

  const restoreAnimalState = async (snapshot: AnimalDeathSnapshot) => {
    await update(snapshot.id, {
      status: snapshot.status ?? 'activo',
      // Null limpia los datos creados por la baja cuando antes no existían.
      statusAt: snapshot.statusAt ?? null,
      statusNotes: snapshot.statusNotes ?? null,
      deathInfo: snapshot.deathInfo ?? null,
      soldInfo: snapshot.soldInfo ?? null,
      lostInfo: snapshot.lostInfo ?? null,
      records: snapshot.records ?? [],
    } as Partial<Animal>)
  }

  const confirmDeath = async () => {
    if (!deathReason || !actionDate) return

    setIsActionSubmitting(true)
    setActionError(null)
    const date = fromInputDate(actionDate)
    const description = deathDescription.trim()
    const previousStates = Object.fromEntries(
      selectedAnimals.map((animal) => [
        animal.id,
        {
          id: animal.id,
          status: animal.status,
          statusAt: animal.statusAt,
          statusNotes: animal.statusNotes,
          deathInfo: animal.deathInfo,
          soldInfo: animal.soldInfo,
          lostInfo: animal.lostInfo,
          records: animal.records,
        },
      ]),
    ) as Record<string, AnimalDeathSnapshot>
    setDeathPreviousStates(previousStates)

    const updatedIds: string[] = []
    try {
      for (const animalId of selectedAnimalIds) {
        await markStatus(animalId, {
          status: 'muerto',
          statusAt: date,
          statusNotes: description
            ? buildDeathStatusNotes(deathReason, description)
            : animalDeathReasonLabels[deathReason],
          deathInfo: { reason: deathReason, date, description },
        })
        updatedIds.push(animalId)
      }
      await addActionRecord(selectedAnimalIds, {
        type: 'event',
        category: 'other',
        eventType: 'muerte',
        title: 'Muerte registrada',
        description: description || undefined,
        notes: animalDeathReasonLabels[deathReason],
        date,
        undoData: {
          action: 'muerte',
          previousAnimalStates: Object.values(previousStates).map((snapshot) => ({
            id: snapshot.id,
            ...(snapshot.status ? { status: snapshot.status } : {}),
            ...(snapshot.statusAt ? { statusAt: snapshot.statusAt } : {}),
            ...(snapshot.statusNotes ? { statusNotes: snapshot.statusNotes } : {}),
            ...(snapshot.deathInfo ? { deathInfo: snapshot.deathInfo } : {}),
            ...(snapshot.soldInfo ? { soldInfo: snapshot.soldInfo } : {}),
            ...(snapshot.lostInfo ? { lostInfo: snapshot.lostInfo } : {}),
          })),
        },
      })
      setDeathStep('success')
    } catch (error) {
      console.error('Error registrando muertes múltiples:', error)
      try {
        await Promise.all(
          updatedIds.map((animalId) => {
            const snapshot = previousStates[animalId]
            return snapshot ? restoreAnimalState(snapshot) : Promise.resolve()
          }),
        )
      } catch (rollbackError) {
        console.error('Error revirtiendo muertes parciales:', rollbackError)
      }
      setDeathPreviousStates({})
      setActionError('No se pudo registrar la muerte. Intenta nuevamente.')
    } finally {
      setIsActionSubmitting(false)
    }
  }

  const undoDeath = async () => {
    const snapshots = Object.values(deathPreviousStates)
    if (snapshots.length === 0) return

    setIsUndoingDeath(true)
    setActionError(null)
    try {
      await Promise.all(snapshots.map(restoreAnimalState))
      setDeathPreviousStates({})
      setDeathStep('form')
    } catch (error) {
      console.error('Error deshaciendo muertes múltiples:', error)
      setActionError('No se pudo deshacer el registro. Intenta nuevamente.')
    } finally {
      setIsUndoingDeath(false)
    }
  }

  const openSaleForm = () => {
    setActionError(null)
    persistCurrentDraft()
    setIsOpen(false)
    setIsSaleOpen(true)
  }

  const closeSaleForm = () => {
    setIsSaleOpen(false)
    closeModal()
  }

  const openBirthForm = () => {
    if (selectedAnimalIds.length !== 1) {
      setActionError('El parto se registra para una sola hembra a la vez.')
      return
    }
    if (!selectedBirthAnimal?.pregnantAt) {
      setActionError('Selecciona una hembra con gestación activa para registrar el parto.')
      return
    }
    setActionError(null)
    persistCurrentDraft()
    setIsOpen(false)
    setIsBirthOpen(true)
  }

  const closeBirthForm = () => {
    setIsBirthOpen(false)
    closeModal()
  }

  const handleBirthSubmit = async (form: BirthRecord) => {
    const mother = animals.find((animal) => animal.id === form.animalId)
    if (!mother) throw new Error('Madre no encontrada')

    const [year, month, day] = form.birthDate.split('-').map(Number)
    const [hours, minutes] = form.birthTime.split(':').map(Number)
    const actualDate = new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0)
    const offspringIds: string[] = []

    for (const offspring of form.offspring) {
      const weight =
        typeof offspring.weight === 'string'
          ? offspring.weight === ''
            ? null
            : Number.parseFloat(offspring.weight)
          : (offspring.weight ?? null)
      const notes = [
        offspring.color ? `Color: ${offspring.color}` : null,
        offspring.healthIssues ? `Salud: ${offspring.healthIssues}` : null,
      ].filter(Boolean)
      const isDead = offspring.status === 'muerto'

      const createdId = await create({
        animalNumber: offspring.animalNumber.trim(),
        type: mother.type,
        stage: 'cria',
        weight,
        birthDate: actualDate,
        gender: offspring.gender,
        motherId: mother.id,
        fatherId: selectedBirthRecord?.maleId ?? mother.pregnantBy ?? undefined,
        ...(notes.length > 0 && { notes: notes.join(' · ') }),
        ...(isDead && { status: 'muerto' as const, statusAt: actualDate }),
      })
      if (createdId) offspringIds.push(createdId)
    }

    if (selectedBirthRecord?.femaleBreedingInfo.some((info) => info.femaleId === form.animalId)) {
      const updatedFemaleInfo = selectedBirthRecord.femaleBreedingInfo.map((info) =>
        info.femaleId === form.animalId
          ? {
              ...info,
              actualBirthDate: actualDate,
              offspring: [...(info.offspring || []), ...offspringIds],
            }
          : info,
      )
      await updateBreedingRecord(selectedBirthRecord.id, { femaleBreedingInfo: updatedFemaleInfo })
    }

    await update(form.animalId, {
      birthedAt: actualDate,
      lactationStatus: 'active',
      lactationPurpose:
        mother.lactationPurpose === 'dairy' ? 'dual' : (mother.lactationPurpose ?? 'offspring'),
      driedAt: null,
      pregnantAt: null,
      pregnantBy: null,
      pregnantBreedingRecordId: null,
      pregnantBreedingId: null,
    })

    const offspringSummary = form.offspring
      .map(
        (offspring) =>
          `#${offspring.animalNumber} (${offspring.gender}${offspring.weight ? `, ${offspring.weight}kg` : ''})`,
      )
      .join(', ')
    await addRecord(form.animalId, {
      type: 'birth',
      category: 'general',
      title: `Parto: ${form.totalOffspring} cría${form.totalOffspring > 1 ? 's' : ''}`,
      description: offspringSummary,
      date: actualDate,
      notes: form.notes || undefined,
      eventType: 'parto',
    })
  }

  const handleSaleCompleted = async (summary: SaleCompletionSummary) => {
    const price = (summary.pricePerKg / 100).toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    const total = (summary.totalPriceCentavos / 100).toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

    await addActionRecord(summary.animalIds, {
      type: 'event',
      category: 'other',
      eventType: 'venta',
      title: 'Venta registrada',
      description: `Precio: $${price}/kg · Total: $${total}`,
      notes: summary.buyer
        ? `Comprador: ${summary.buyer}${summary.notes ? ` · ${summary.notes}` : ''}`
        : summary.notes,
      date: summary.date,
    })
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        color="primary"
        icon="add"
        className="min-h-11 whitespace-nowrap"
        onClick={() => setIsOpen(true)}
        aria-label="Abrir opciones de nuevo registro"
      >
        Nuevo Registro{storedDrafts.length > 0 ? ` (${storedDrafts.length})` : ''}
      </Button>

      <Modal isOpen={isOpen} onClose={closeModal} title="Nuevo Registro" size="md">
        <div className="space-y-4">
          {storedDrafts.length > 0 && (
            <div className="-mb-2 space-y-1 text-right">
              <button
                type="button"
                aria-expanded={isDraftsOpen}
                onClick={() => setIsDraftsOpen((open) => !open)}
                className="min-h-8 px-1 text-sm font-medium text-gray-600 underline-offset-2 hover:text-gray-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
              >
                {isDraftsOpen ? 'Ocultar borradores' : 'Ver borradores'} ({storedDrafts.length})
              </button>

              {isDraftsOpen && (
                <div
                  className="flex flex-wrap justify-end gap-1.5"
                  aria-label="Borradores guardados"
                >
                  {storedDrafts.map((draft) => {
                    const option = recordOptions.find(
                      (record) => record.id === draft.selectedOption,
                    )
                    const label =
                      draft.selectedOption === 'monta' ? 'Monta' : (option?.label ?? 'Registro')

                    return (
                      <div
                        key={draft.id}
                        className="inline-flex min-h-9 items-center rounded-full border border-gray-200 bg-gray-50 text-sm text-gray-700"
                      >
                        <button
                          type="button"
                          onClick={() => restoreStoredDraft(draft)}
                          className="min-h-9 px-3 text-left hover:text-gray-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-inset"
                        >
                          {label}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeStoredDraft(draft.id)}
                          aria-label={`Eliminar borrador de ${label}`}
                          className="mr-1 flex size-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
                        >
                          ×
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {!selectedRecord ? (
            <>
              <p className="text-sm leading-5 text-gray-600">
                Selecciona el tipo de evento que quieres registrar.
              </p>

              <div
                className="grid gap-3 sm:grid-cols-2"
                role="group"
                aria-label="Tipos de registro"
              >
                {recordOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => selectRecordOption(option.id)}
                    className="flex min-h-24 items-start gap-3 rounded-xl border-2 border-gray-200 bg-white p-3 text-left text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                  >
                    <span className="mt-0.5 text-2xl leading-none" aria-hidden="true">
                      {option.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold">{option.label}</span>
                      <span className="mt-1 block text-xs leading-4 text-gray-600">
                        {option.description}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div
                className={`flex items-center gap-3 rounded-xl border-2 p-3 ${selectedRecord.activeClass}`}
              >
                <span className="text-2xl leading-none" aria-hidden="true">
                  {selectedRecord.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{selectedRecord.label}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOption(null)
                    setSelectedAnimalIds([])
                    setIsMontaFormOpen(false)
                    setActionError(null)
                  }}
                  className="min-h-11 shrink-0 rounded-lg px-3 text-sm font-semibold underline-offset-2 transition-colors hover:bg-black/5 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2"
                >
                  ← Cambiar
                </button>
              </div>

              {selectedOption === 'monta' ? (
                <div className="space-y-3">
                  <InputSelectAnimals
                    animals={montaMales}
                    selectedIds={selectedMontaMale ? [selectedMontaMale.id] : []}
                    onAdd={(animalId) => {
                      setSelectedAnimalIds([animalId])
                      setActionError(null)
                    }}
                    onRemove={() => setSelectedAnimalIds([])}
                    mode="single"
                    label="1. Macho reproductor"
                    placeholder="Buscar macho reproductor..."
                    compactDropdown
                  />

                  {selectedMontaMale ? (
                    <InputSelectAnimals
                      animals={montaFemales}
                      selectedIds={selectedMontaFemaleIds}
                      onAdd={(animalId) => {
                        setSelectedAnimalIds((current) =>
                          current.includes(animalId) ? current : [...current, animalId],
                        )
                        setActionError(null)
                      }}
                      onRemove={(animalId) =>
                        setSelectedAnimalIds((current) => current.filter((id) => id !== animalId))
                      }
                      mode="multi"
                      label={`2. Hembras ${selectedMontaMale.type}`}
                      placeholder={`Buscar hembra ${selectedMontaMale.type}...`}
                      filterFn={
                        onlyAvailableMontaFemales
                          ? (animal) => availableMontaFemaleIds.has(animal.id)
                          : undefined
                      }
                      inputAccessory={
                        <label className="inline-flex min-h-9 cursor-pointer select-none items-center gap-2 rounded-md px-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={onlyAvailableMontaFemales}
                            onChange={(event) => setOnlyAvailableMontaFemales(event.target.checked)}
                            aria-label="Mostrar solo hembras disponibles"
                            className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
                          />
                          Solo hembras disponibles
                          <span className="text-gray-400">({availableMontaFemaleIds.size})</span>
                        </label>
                      }
                      compactDropdown
                    />
                  ) : (
                    <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                      Selecciona primero el macho reproductor para habilitar las hembras
                      compatibles.
                    </p>
                  )}
                </div>
              ) : (
                <InputSelectAnimals
                  animals={animals}
                  selectedIds={selectedAnimalIds}
                  onAdd={(animalId) => {
                    setSelectedAnimalIds((current) => [...current, animalId])
                    setActionError(null)
                  }}
                  onRemove={(animalId) =>
                    setSelectedAnimalIds((current) => current.filter((id) => id !== animalId))
                  }
                  mode="multi"
                  label="Animales a los que aplica"
                  placeholder="Buscar por número, nombre, tipo o raza..."
                  compactDropdown
                />
              )}

              {actionRecommendations.length > 0 && (
                <aside
                  role="status"
                  aria-label="Recomendaciones para el registro"
                  className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-900"
                >
                  <p className="text-sm font-semibold">⚠️ Revisa antes de continuar</p>
                  <ul className="mt-1.5 space-y-1 text-sm leading-5">
                    {actionRecommendations.map((recommendation) => (
                      <li key={recommendation.key}>{recommendation.message}</li>
                    ))}
                  </ul>
                </aside>
              )}

              {hasSelectedActionAnimals && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <p className="mb-3 text-sm font-semibold text-gray-900">
                    Configura el {selectedRecord.label.toLowerCase()}
                    <span className="ml-1 font-normal text-gray-500">
                      ({selectedAnimalIds.length} animal{selectedAnimalIds.length === 1 ? '' : 'es'}
                      )
                    </span>
                  </p>

                  {actionError && (
                    <p
                      role="alert"
                      className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                    >
                      {actionError}
                    </p>
                  )}

                  {selectedOption === 'destete' && (
                    <div className="space-y-3">
                      <div>
                        <label
                          htmlFor="new-record-wean-date"
                          className="mb-1 block text-sm font-medium text-gray-700"
                        >
                          Fecha del destete
                        </label>
                        <input
                          id="new-record-wean-date"
                          type="date"
                          value={actionDate}
                          onChange={(event) => setActionDate(event.target.value)}
                          className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-base outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-200"
                        />
                      </div>
                      <fieldset>
                        <legend className="mb-2 text-sm font-medium text-gray-700">Destino</legend>
                        <div className="grid grid-cols-2 gap-2">
                          {(
                            [
                              ['reproductor', 'Reproducción'],
                              ['engorda', 'Engorda'],
                            ] as const
                          ).map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              aria-pressed={weaningDestination === value}
                              onClick={() => setWeaningDestination(value)}
                              className={`min-h-11 rounded-lg border px-3 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 ${
                                weaningDestination === value
                                  ? 'border-green-600 bg-green-100 text-green-800'
                                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </fieldset>
                      <Button
                        type="button"
                        color="success"
                        onClick={handleWean}
                        disabled={isActionSubmitting}
                        className="w-full"
                      >
                        {isActionSubmitting ? 'Registrando...' : 'Registrar destete'}
                      </Button>
                    </div>
                  )}

                  {selectedOption === 'muerte' && (
                    <>
                      {deathStep === 'form' && (
                        <div className="space-y-3">
                          <div>
                            <label
                              htmlFor="new-record-death-date"
                              className="mb-1 block text-sm font-medium text-gray-700"
                            >
                              Fecha de la muerte
                            </label>
                            <input
                              id="new-record-death-date"
                              type="date"
                              value={actionDate}
                              max={toInputDate(new Date())}
                              onChange={(event) => setActionDate(event.target.value)}
                              className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-base outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-200"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor="new-record-death-reason"
                              className="mb-1 block text-sm font-medium text-gray-700"
                            >
                              Causa de muerte
                            </label>
                            <select
                              id="new-record-death-reason"
                              value={deathReason}
                              onChange={(event) =>
                                setDeathReason(event.target.value as AnimalDeathReason | '')
                              }
                              className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-base outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-200"
                            >
                              <option value="">Selecciona una causa</option>
                              {Object.entries(animalDeathReasonLabels).map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label
                              htmlFor="new-record-death-description"
                              className="mb-1 block text-sm font-medium text-gray-700"
                            >
                              Descripción (opcional)
                            </label>
                            <textarea
                              id="new-record-death-description"
                              value={deathDescription}
                              onChange={(event) => setDeathDescription(event.target.value)}
                              rows={3}
                              placeholder="Describe brevemente lo ocurrido..."
                              className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-base outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-200"
                            />
                          </div>
                          <Button
                            type="button"
                            color="error"
                            onClick={reviewDeath}
                            disabled={isActionSubmitting}
                            className="w-full"
                          >
                            Registrar muerte
                          </Button>
                        </div>
                      )}

                      {deathStep === 'review' && (
                        <div className="space-y-3">
                          <div className="rounded-lg border border-red-200 bg-white p-3">
                            <h4 className="text-sm font-semibold text-gray-900">
                              Revisa el registro
                            </h4>
                            <dl className="mt-3 space-y-2 text-sm">
                              <div>
                                <dt className="font-medium text-gray-500">Animales</dt>
                                <dd className="mt-1 flex flex-wrap gap-1.5 text-gray-900">
                                  {selectedAnimals.map((animal) => (
                                    <span
                                      key={animal.id}
                                      className="rounded-full bg-gray-100 px-2.5 py-1 font-medium"
                                    >
                                      {animal.animalNumber}
                                    </span>
                                  ))}
                                </dd>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <dt className="font-medium text-gray-500">Fecha</dt>
                                  <dd className="text-gray-900">{formatInputDate(actionDate)}</dd>
                                </div>
                                <div>
                                  <dt className="font-medium text-gray-500">Causa</dt>
                                  <dd className="text-gray-900">
                                    {deathReason ? animalDeathReasonLabels[deathReason] : '—'}
                                  </dd>
                                </div>
                              </div>
                              <div>
                                <dt className="font-medium text-gray-500">Descripción</dt>
                                <dd className="whitespace-pre-wrap text-gray-900">
                                  {deathDescription.trim() || 'Sin descripción'}
                                </dd>
                              </div>
                            </dl>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              type="button"
                              color="neutral"
                              variant="outline"
                              onClick={() => setDeathStep('form')}
                              disabled={isActionSubmitting}
                            >
                              Volver
                            </Button>
                            <Button
                              type="button"
                              color="error"
                              onClick={confirmDeath}
                              disabled={isActionSubmitting}
                            >
                              {isActionSubmitting ? (
                                <span className="inline-flex items-center gap-2">
                                  <span
                                    className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                                    aria-hidden="true"
                                  />
                                  Registrando...
                                </span>
                              ) : (
                                'Confirmar muerte'
                              )}
                            </Button>
                          </div>
                        </div>
                      )}

                      {deathStep === 'success' && (
                        <div className="space-y-4 text-center" aria-live="polite">
                          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              fill="none"
                              className="h-8 w-8"
                              stroke="currentColor"
                              strokeWidth="2.5"
                            >
                              <path
                                d="m5 12 4.5 4.5L19 7"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                          <div>
                            <h4 className="text-base font-semibold text-green-800">
                              Muerte registrada
                            </h4>
                            <p className="mt-1 text-sm text-gray-600">
                              Se actualizó el estado de {selectedAnimalIds.length}{' '}
                              {selectedAnimalIds.length === 1 ? 'animal' : 'animales'}.
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              type="button"
                              color="warning"
                              variant="outline"
                              onClick={undoDeath}
                              disabled={isUndoingDeath}
                            >
                              {isUndoingDeath ? 'Deshaciendo...' : 'Deshacer'}
                            </Button>
                            <Button
                              type="button"
                              color="neutral"
                              variant="outline"
                              onClick={completeAndCloseModal}
                            >
                              Cerrar
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {selectedOption === 'venta' && (
                    <div className="space-y-3">
                      <p className="text-sm leading-5 text-gray-600">
                        Se abrirá el formulario de venta con estos animales ya seleccionados.
                      </p>
                      <Button
                        type="button"
                        color="success"
                        onClick={openSaleForm}
                        className="w-full"
                      >
                        Continuar con la venta
                      </Button>
                    </div>
                  )}

                  {selectedOption === 'parto' && (
                    <div className="space-y-3">
                      <p className="text-sm leading-5 text-gray-600">
                        Selecciona una sola hembra con gestación activa para capturar sus crías.
                      </p>
                      {selectedBirthAnimal && !selectedBirthAnimal.pregnantAt && (
                        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                          El animal seleccionado no tiene una gestación activa.
                        </p>
                      )}
                      <Button type="button" color="info" onClick={openBirthForm} className="w-full">
                        Continuar con el parto
                      </Button>
                    </div>
                  )}

                  {selectedOption === 'monta' && (
                    <div className="space-y-3">
                      {!isMontaFormOpen ? (
                        <>
                          <p className="text-sm leading-5 text-gray-600">
                            Usa los animales seleccionados como propuesta de macho y hembras del
                            empadre.
                          </p>
                          <Button
                            type="button"
                            color="warning"
                            onClick={() => setIsMontaFormOpen(true)}
                            className="w-full"
                          >
                            Continuar con el empadre
                          </Button>
                        </>
                      ) : (
                        <BreedingForm
                          key={selectedAnimalIds.join('|')}
                          animals={animals}
                          initialAnimalIds={selectedAnimalIds}
                          draftStorageKey={getBreedingFormDraftStorageKey(activeDraftId ?? 'new')}
                          onSubmit={async (
                            data: Omit<
                              BreedingRecord,
                              'id' | 'farmerId' | 'createdAt' | 'updatedAt'
                            >,
                          ) => {
                            let breedingSaved = false
                            try {
                              await createBreedingRecord(data)
                              breedingSaved = true
                              const femaleIds = data.femaleBreedingInfo.map(
                                (femaleInfo) => femaleInfo.femaleId,
                              )
                              await addActionRecord([data.maleId, ...femaleIds], {
                                type: 'event',
                                category: 'other',
                                eventType: 'monta',
                                title: data.breedingId
                                  ? `Empadre · ${data.breedingId}`
                                  : 'Empadre registrado',
                                description: `${femaleIds.length} hembra${femaleIds.length === 1 ? '' : 's'}`,
                                notes: data.notes,
                                date: data.breedingDate ?? new Date(),
                              })
                              completeAndCloseModal()
                            } catch (error) {
                              console.error('Error registrando la monta en el historial:', error)
                              setActionError(
                                breedingSaved
                                  ? 'El empadre se guardó, pero no se pudo agregar al historial. Intenta nuevamente.'
                                  : 'No se pudo registrar la monta. Intenta nuevamente.',
                              )
                              throw error
                            }
                          }}
                          onCancel={closeModal}
                          isLoading={isBreedingSubmitting}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {!isMontaFormOpen && (
            <div className="flex justify-end border-t border-gray-200 pt-4">
              <Button type="button" color="neutral" variant="outline" onClick={closeModal}>
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </Modal>

      <ModalSaleForm
        isOpen={isSaleOpen}
        onClose={closeSaleForm}
        initialAnimalIds={selectedAnimalIds}
        initialStatus="completed"
        onCompleted={handleSaleCompleted}
      />

      <ModalBirthForm
        isOpen={isBirthOpen}
        onClose={closeBirthForm}
        breedingRecord={selectedBirthRecord}
        animals={animals}
        selectedFemaleId={selectedBirthAnimal?.id}
        onSubmit={handleBirthSubmit}
      />
    </>
  )
}
