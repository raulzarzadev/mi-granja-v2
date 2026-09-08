'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import BreedingForm from '@/components/BreedingForm'
import Button from '@/components/buttons/Button'
import InputSelectAnimals from '@/components/inputs/InputSelectAnimals'
import { Modal } from '@/components/Modal'
import ModalBirthForm from '@/components/ModalBirthForm'
import type { SaleCompletionSummary } from '@/components/ModalSaleForm'
import ModalSaleForm from '@/components/ModalSaleForm'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useBreedingCRUD } from '@/hooks/useBreedingCRUD'
import { useRecordMovements } from '@/hooks/useRecordMovements'
import { animalDeathReasonLabels } from '@/lib/animal-discharge'
import { activeUnweanedOffspring } from '@/lib/animal-utils'
import type { BirthRecord } from '@/types'
import type { AnimalDeathReason, AnimalRecord } from '@/types/animals'

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
  movementNotes?: string
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
    movementNotes: typeof draft.movementNotes === 'string' ? draft.movementNotes : '',
    deathDescription: typeof draft.deathDescription === 'string' ? draft.deathDescription : '',
    deathStep:
      draft.deathStep === 'review' || draft.deathStep === 'success' ? draft.deathStep : 'form',
    updatedAt: typeof draft.updatedAt === 'string' ? draft.updatedAt : new Date().toISOString(),
  }
}

const readNewRecordDrafts = (storageKey: string): NewRecordDraft[] => {
  if (typeof window === 'undefined') return []

  try {
    const rawDraft = window.localStorage.getItem(storageKey)
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
  const { animals } = useAnimalCRUD()
  const { breedingRecords } = useBreedingCRUD()
  const movements = useRecordMovements(animals)
  const busyRef = useRef(false)
  const [completedRecord, setCompletedRecord] = useState<AnimalRecord | null>(null)
  const [movementNotes, setMovementNotes] = useState('')
  const storageKey = `${NEW_RECORD_DRAFT_STORAGE_KEY}:${movements.context.userId}:${movements.context.farmId}`
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
  const [isUndoingDeath, setIsUndoingDeath] = useState(false)
  const [isActionSubmitting, setIsActionSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    // Claim the old unscoped drafts once; subsequent storage is isolated by account and farm.
    try {
      if (
        movements.context.userId &&
        movements.context.farmId &&
        !localStorage.getItem(storageKey)
      ) {
        const legacy = localStorage.getItem(NEW_RECORD_DRAFT_STORAGE_KEY)
        if (legacy) {
          localStorage.setItem(storageKey, legacy)
          localStorage.removeItem(NEW_RECORD_DRAFT_STORAGE_KEY)
          const breeding = localStorage.getItem(BREEDING_FORM_DRAFT_STORAGE_KEY)
          if (breeding) {
            localStorage.setItem(`${storageKey}:breeding:legacy`, breeding)
            localStorage.removeItem(BREEDING_FORM_DRAFT_STORAGE_KEY)
          }
          for (const draft of readNewRecordDrafts(storageKey)) {
            const oldKey = `${BREEDING_FORM_DRAFT_STORAGE_KEY}:${draft.id}`
            const value = localStorage.getItem(oldKey)
            if (value) {
              localStorage.setItem(`${storageKey}:breeding:${draft.id}`, value)
              localStorage.removeItem(oldKey)
            }
          }
        }
      }
    } catch (error) {
      console.warn('No se pudieron migrar los borradores', error)
    }
    setStoredDrafts(readNewRecordDrafts(storageKey))
    resetActionState()
    setIsOpen(false)
  }, [storageKey])

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
      if (record.status === 'finished') continue
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
    setMovementNotes('')
    setDeathStep('form')
    setCompletedRecord(null)
    setIsUndoingDeath(false)
    setIsActionSubmitting(false)
    setActionError(null)
  }

  const buildCurrentDraft = (): NewRecordDraft | null => {
    if (!selectedOption || completedRecord) return null
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
      movementNotes,
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
      window.localStorage.setItem(storageKey, JSON.stringify(nextDrafts))
      setStoredDrafts(nextDrafts)
      setActiveDraftId(draft.id)
    } catch (error) {
      console.warn('No se pudo guardar el borrador de nuevo registro', error)
    }
  }

  useEffect(() => {
    if (!isOpen || !selectedOption || completedRecord) return
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
    movementNotes,
    deathStep,
  ])

  const clearDraft = () => {
    const draftId = activeDraftId
    const nextDrafts = draftId
      ? storedDrafts.filter((storedDraft) => storedDraft.id !== draftId)
      : storedDrafts

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(nextDrafts))
        if (draftId) {
          window.localStorage.removeItem(`${storageKey}:breeding:${draftId}`)
          localStorage.removeItem(`${storageKey}:sale:${draftId}`)
          localStorage.removeItem(`${storageKey}:birth:${draftId}`)
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
    setDeathStep('form')
    setCompletedRecord(null)
    setMovementNotes(draft.movementNotes ?? '')
    setActionError(null)
    setIsDraftsOpen(false)
  }

  const removeStoredDraft = (draftId: string) => {
    const nextDrafts = storedDrafts.filter((draft) => draft.id !== draftId)

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(nextDrafts))
        window.localStorage.removeItem(`${storageKey}:breeding:${draftId}`)
        localStorage.removeItem(`${storageKey}:sale:${draftId}`)
        localStorage.removeItem(`${storageKey}:birth:${draftId}`)
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
    resetActionState()
    setSelectedOption(optionId)
    setSelectedAnimalIds([])
    setActiveDraftId(createDraftId())
    setIsMontaFormOpen(false)
    setActionError(null)
  }

  const closeModal = () => {
    if (busyRef.current) return
    persistCurrentDraft()
    setIsOpen(false)
    resetActionState()
  }

  const finishMovement = (record: AnimalRecord) => {
    setCompletedRecord(record)
    clearDraft()
    setIsBirthOpen(false)
    setIsSaleOpen(false)
    setIsMontaFormOpen(false)
    setIsOpen(true)
  }
  const perform = async (action: (id: string) => Promise<AnimalRecord>) => {
    if (busyRef.current) throw new Error('Ya hay un movimiento en proceso.')
    busyRef.current = true
    setIsActionSubmitting(true)
    setActionError(null)
    try {
      if (!activeDraftId) throw new Error('Abre un registro nuevo.')
      const record = await action(activeDraftId)
      finishMovement(record)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'No se pudo guardar el movimiento.')
      throw error
    } finally {
      busyRef.current = false
      setIsActionSubmitting(false)
    }
  }
  const handleWean = () =>
    perform((id) =>
      movements.wean(
        id,
        selectedAnimalIds,
        fromInputDate(actionDate),
        weaningDestination,
        movementNotes,
      ),
    ).catch(() => {})
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

  const confirmDeath = () =>
    perform((id) =>
      movements.death(
        id,
        selectedAnimalIds,
        fromInputDate(actionDate),
        deathReason as AnimalDeathReason,
        deathDescription.trim(),
      ),
    ).catch(() => {})
  const undoCompleted = async () => {
    if (!completedRecord || busyRef.current) return
    busyRef.current = true
    setIsUndoingDeath(true)
    try {
      await movements.undo(completedRecord)
      setCompletedRecord({ ...completedRecord, undoneAt: new Date() })
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'No se pudo deshacer.')
    } finally {
      busyRef.current = false
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
    setIsOpen(true)
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
    setIsOpen(true)
  }

  const handleBirthSubmit = (form: BirthRecord) =>
    perform((id) => movements.birth(id, form, selectedBirthRecord))
  const handleSaleCompleted = (summary: SaleCompletionSummary) =>
    perform((id) => movements.sale(id, summary))

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
        <fieldset disabled={isActionSubmitting || isUndoingDeath} className="min-w-0 space-y-4">
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

          {completedRecord ? (
            <div className="space-y-3" role="status">
              <p className="text-center text-lg font-semibold text-green-700">
                ✓ {completedRecord.undoneAt ? 'Movimiento deshecho' : completedRecord.title}
              </p>
              <p className="text-sm text-gray-700">{completedRecord.description}</p>
              {Object.entries(completedRecord.details ?? {}).map(([label, value]) => (
                <p key={label} className="text-sm">
                  <strong>{label}:</strong> {value}
                </p>
              ))}
              {actionError && (
                <p role="alert" className="text-sm text-red-700">
                  {actionError}
                </p>
              )}
              <div className="flex justify-end gap-2">
                {!completedRecord.undoneAt && (
                  <Button type="button" onClick={undoCompleted} disabled={isUndoingDeath}>
                    {isUndoingDeath ? 'Deshaciendo…' : '↶ Deshacer'}
                  </Button>
                )}
                <Button type="button" onClick={closeModal} disabled={isUndoingDeath}>
                  Cerrar
                </Button>
              </div>
            </div>
          ) : !selectedRecord ? (
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

              {isMontaFormOpen ? null : selectedOption === 'monta' ? (
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
                  animals={animals.filter(
                    (a) =>
                      (a.status ?? 'activo') === 'activo' &&
                      (selectedOption === 'destete'
                        ? a.stage === 'cria' && !a.isWeaned
                        : selectedOption === 'parto'
                          ? a.gender === 'hembra' && Boolean(a.pregnantAt)
                          : true),
                  )}
                  selectedIds={selectedAnimalIds}
                  onAdd={(animalId) => {
                    setSelectedAnimalIds((current) => [...current, animalId])
                    setActionError(null)
                  }}
                  onRemove={(animalId) =>
                    setSelectedAnimalIds((current) => current.filter((id) => id !== animalId))
                  }
                  mode={selectedOption === 'parto' ? 'single' : 'multi'}
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
                    Datos de {selectedRecord.label.toLowerCase()}
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
                      <label className="block text-sm">
                        Notas (opcional)
                        <textarea
                          value={movementNotes}
                          onChange={(e) => setMovementNotes(e.target.value)}
                          className="mt-1 w-full rounded border border-gray-300 p-2"
                        />
                      </label>
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
                          key={activeDraftId}
                          animals={animals}
                          initialAnimalIds={selectedAnimalIds}
                          draftStorageKey={`${storageKey}:breeding:${activeDraftId}`}
                          onSubmit={(data) => perform((id) => movements.breeding(id, data))}
                          onCancel={closeModal}
                          isLoading={isActionSubmitting}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {!isMontaFormOpen && !completedRecord && (
            <div className="flex justify-end border-t border-gray-200 pt-4">
              <Button type="button" color="neutral" variant="outline" onClick={closeModal}>
                Cancelar
              </Button>
            </div>
          )}
        </fieldset>
      </Modal>

      <ModalSaleForm
        isOpen={isSaleOpen}
        onClose={closeSaleForm}
        initialAnimalIds={selectedAnimalIds}
        initialStatus="completed"
        onCommit={handleSaleCompleted}
        draftStorageKey={`${storageKey}:sale:${activeDraftId}`}
      />

      <ModalBirthForm
        isOpen={isBirthOpen}
        onClose={closeBirthForm}
        breedingRecord={selectedBirthRecord}
        animals={animals}
        selectedFemaleId={selectedBirthAnimal?.id}
        onSubmit={handleBirthSubmit}
        draftStorageKey={`${storageKey}:birth:${activeDraftId}`}
      />
    </>
  )
}
