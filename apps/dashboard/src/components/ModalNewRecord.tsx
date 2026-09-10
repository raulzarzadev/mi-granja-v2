'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import BreedingForm from '@/components/BreedingForm'
import Button from '@/components/buttons/Button'
import InputSelectAnimals from '@/components/inputs/InputSelectAnimals'
import { Modal } from '@/components/Modal'
import ModalAnimalListReader from '@/components/ModalAnimalListReader'
import ModalBirthForm from '@/components/ModalBirthForm'
import type { SaleCompletionSummary } from '@/components/ModalSaleForm'
import ModalSaleForm from '@/components/ModalSaleForm'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useBreedingCRUD } from '@/hooks/useBreedingCRUD'
import { useRecordMovements } from '@/hooks/useRecordMovements'
import {
  trackNewRecordCompleted,
  trackNewRecordDraftRestored,
  trackNewRecordDraftSaved,
  trackNewRecordFailed,
  trackNewRecordOpened,
  trackNewRecordSubmitted,
  trackNewRecordTypeSelected,
  trackNewRecordUndone,
} from '@/lib/analytics/track'
import { animalDeathReasonLabels } from '@/lib/animal-discharge'
import { ANIMAL_LIST_READER_ENABLED } from '@/lib/animal-list-feature'
import { activeUnweanedOffspring } from '@/lib/animal-utils'
import { breedingWarnings } from '@/lib/breeding-warnings'
import type { BirthRecord } from '@/types'
import {
  type AnimalDeathReason,
  type AnimalRecord,
  type MilkingSession,
  type RecordSeverity,
  record_category_icons,
  record_category_labels,
  record_severities,
  record_severity_labels,
} from '@/types/animals'

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
  {
    id: 'peso',
    label: 'Peso',
    description: 'Registra el peso actual de un animal y lo agrega a su historial.',
    icon: '⚖️',
    activeClass: 'border-violet-500 bg-violet-50 text-violet-900',
  },
  {
    id: 'leche',
    label: 'Leche',
    description: 'Registra una sesión de ordeño y la cantidad obtenida.',
    icon: '🥛',
    activeClass: 'border-cyan-500 bg-cyan-50 text-cyan-900',
  },
  {
    id: 'sanidad',
    label: 'Sanidad',
    description: 'Registra vacunas, desparasitación, tratamientos y revisiones.',
    icon: '🏥',
    activeClass: 'border-emerald-500 bg-emerald-50 text-emerald-900',
  },
] as const

type RecordOptionId = (typeof recordOptions)[number]['id']
const sanitaryCategories = [
  'vaccine',
  'deworming',
  'treatment',
  'illness',
  'injury',
  'supplement',
  'surgery',
  'observation',
  'other',
] as const
type SanitaryCategory = (typeof sanitaryCategories)[number]
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
  weightValue: string
  milkAmount: string
  milkSession: MilkingSession
  sanitaryCategory: SanitaryCategory
  sanitaryTitle: string
  sanitaryDescription: string
  sanitaryNextDueDate: string
  sanitaryBatch: string
  sanitaryVeterinarian: string
  sanitaryCost: string
  sanitaryTreatment: string
  sanitarySeverity: '' | RecordSeverity
  sanitaryIsResolved: boolean
  sanitaryResolvedDate: string
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

const isSanitaryCategory = (value: unknown): value is SanitaryCategory =>
  sanitaryCategories.some((category) => category === value)

const isRecordSeverity = (value: unknown): value is RecordSeverity =>
  record_severities.some((severity) => severity === value)

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
    weightValue: typeof draft.weightValue === 'string' ? draft.weightValue : '',
    milkAmount: typeof draft.milkAmount === 'string' ? draft.milkAmount : '',
    milkSession:
      draft.milkSession === 'afternoon' || draft.milkSession === 'evening'
        ? draft.milkSession
        : 'morning',
    sanitaryCategory: isSanitaryCategory(draft.sanitaryCategory)
      ? draft.sanitaryCategory
      : 'vaccine',
    sanitaryTitle: typeof draft.sanitaryTitle === 'string' ? draft.sanitaryTitle : '',
    sanitaryDescription:
      typeof draft.sanitaryDescription === 'string' ? draft.sanitaryDescription : '',
    sanitaryNextDueDate:
      typeof draft.sanitaryNextDueDate === 'string' ? draft.sanitaryNextDueDate : '',
    sanitaryBatch: typeof draft.sanitaryBatch === 'string' ? draft.sanitaryBatch : '',
    sanitaryVeterinarian:
      typeof draft.sanitaryVeterinarian === 'string' ? draft.sanitaryVeterinarian : '',
    sanitaryCost: typeof draft.sanitaryCost === 'string' ? draft.sanitaryCost : '',
    sanitaryTreatment: typeof draft.sanitaryTreatment === 'string' ? draft.sanitaryTreatment : '',
    sanitarySeverity: isRecordSeverity(draft.sanitarySeverity) ? draft.sanitarySeverity : '',
    sanitaryIsResolved: draft.sanitaryIsResolved === true,
    sanitaryResolvedDate:
      typeof draft.sanitaryResolvedDate === 'string' ? draft.sanitaryResolvedDate : '',
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

interface ModalNewRecordProps {
  initialAnimalIds?: string[]
  trigger?: (open: () => void) => ReactNode
}

export default function ModalNewRecord({ initialAnimalIds = [], trigger }: ModalNewRecordProps) {
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
  const [isAnimalListReaderOpen, setIsAnimalListReaderOpen] = useState(false)
  const [onlyAvailableMontaFemales, setOnlyAvailableMontaFemales] = useState(true)
  const [isSaleOpen, setIsSaleOpen] = useState(false)
  const [isBirthOpen, setIsBirthOpen] = useState(false)
  const [actionDate, setActionDate] = useState(() => toInputDate(new Date()))
  const [weaningDestination, setWeaningDestination] = useState<WeaningDestination>('reproductor')
  const [deathReason, setDeathReason] = useState<AnimalDeathReason | ''>('')
  const [deathDescription, setDeathDescription] = useState('')
  const [deathStep, setDeathStep] = useState<DeathStep>('form')
  const [weightValue, setWeightValue] = useState('')
  const [milkAmount, setMilkAmount] = useState('')
  const [milkSession, setMilkSession] = useState<MilkingSession>('morning')
  const [sanitaryCategory, setSanitaryCategory] = useState<SanitaryCategory>('vaccine')
  const [sanitaryTitle, setSanitaryTitle] = useState('')
  const [sanitaryDescription, setSanitaryDescription] = useState('')
  const [sanitaryNextDueDate, setSanitaryNextDueDate] = useState('')
  const [sanitaryBatch, setSanitaryBatch] = useState('')
  const [sanitaryVeterinarian, setSanitaryVeterinarian] = useState('')
  const [sanitaryCost, setSanitaryCost] = useState('')
  const [sanitaryTreatment, setSanitaryTreatment] = useState('')
  const [sanitarySeverity, setSanitarySeverity] = useState<'' | RecordSeverity>('')
  const [sanitaryIsResolved, setSanitaryIsResolved] = useState(false)
  const [sanitaryResolvedDate, setSanitaryResolvedDate] = useState('')
  const [isUndoingMovement, setIsUndoingMovement] = useState(false)
  const [isActionSubmitting, setIsActionSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const initialAnimalIdsKey = initialAnimalIds.join('|')
  const preselectedAnimalIds = useMemo(
    () => [...new Set(initialAnimalIdsKey.split('|').filter(Boolean))],
    [initialAnimalIdsKey],
  )

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
  const selectableAnimals = useMemo(
    () =>
      animals.filter((animal) => {
        if ((animal.status ?? 'activo') !== 'activo') return false
        if (selectedOption === 'destete') return animal.stage === 'cria' && !animal.isWeaned
        if (selectedOption === 'parto')
          return animal.gender === 'hembra' && Boolean(animal.pregnantAt)
        if (selectedOption === 'leche') return animal.gender === 'hembra'
        return true
      }),
    [animals, selectedOption],
  )
  const getInitialAnimalIdsForOption = (optionId: RecordOptionId) => {
    const eligibleAnimalIds = new Set(
      animals
        .filter((animal) => {
          if ((animal.status ?? 'activo') !== 'activo') return false
          if (optionId === 'destete') return animal.stage === 'cria' && !animal.isWeaned
          if (optionId === 'parto') return animal.gender === 'hembra' && Boolean(animal.pregnantAt)
          if (optionId === 'leche') return animal.gender === 'hembra'
          if (optionId === 'monta') {
            return animal.gender === 'hembra' || animal.computedStage === 'reproductor'
          }
          return true
        })
        .map((animal) => animal.id),
    )

    return preselectedAnimalIds.filter((animalId) => eligibleAnimalIds.has(animalId))
  }
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
      if (selectedOption === 'monta' && selectedMontaMale && animal.gender === 'hembra') {
        for (const [index, message] of breedingWarnings(
          animal,
          selectedMontaMale,
          animals,
        ).entries()) {
          addRecommendation(
            `${animal.id}-compatibility-${index}`,
            `#${animal.animalNumber}: ${message}`,
          )
        }
      }
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
  }, [animals, breedingRecords, selectedAnimals, selectedOption, selectedMontaMale])

  const resetActionState = () => {
    setSelectedOption(null)
    setSelectedAnimalIds(preselectedAnimalIds)
    setActiveDraftId(null)
    setIsMontaFormOpen(false)
    setIsAnimalListReaderOpen(false)
    setIsSaleOpen(false)
    setIsBirthOpen(false)
    setActionDate(toInputDate(new Date()))
    setWeaningDestination('reproductor')
    setDeathReason('')
    setDeathDescription('')
    setWeightValue('')
    setMilkAmount('')
    setMilkSession('morning')
    setSanitaryCategory('vaccine')
    setSanitaryTitle('')
    setSanitaryDescription('')
    setSanitaryNextDueDate('')
    setSanitaryBatch('')
    setSanitaryVeterinarian('')
    setSanitaryCost('')
    setSanitaryTreatment('')
    setSanitarySeverity('')
    setSanitaryIsResolved(false)
    setSanitaryResolvedDate('')
    setMovementNotes('')
    setDeathStep('form')
    setCompletedRecord(null)
    setIsUndoingMovement(false)
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
      weightValue,
      milkAmount,
      milkSession,
      sanitaryCategory,
      sanitaryTitle,
      sanitaryDescription,
      sanitaryNextDueDate,
      sanitaryBatch,
      sanitaryVeterinarian,
      sanitaryCost,
      sanitaryTreatment,
      sanitarySeverity,
      sanitaryIsResolved,
      sanitaryResolvedDate,
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
    weightValue,
    milkAmount,
    milkSession,
    sanitaryCategory,
    sanitaryTitle,
    sanitaryDescription,
    sanitaryNextDueDate,
    sanitaryBatch,
    sanitaryVeterinarian,
    sanitaryCost,
    sanitaryTreatment,
    sanitarySeverity,
    sanitaryIsResolved,
    sanitaryResolvedDate,
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
    trackNewRecordDraftRestored(draft.selectedOption)
    setActiveDraftId(draft.id)
    setSelectedOption(draft.selectedOption)
    setSelectedAnimalIds(draft.selectedAnimalIds)
    setIsMontaFormOpen(draft.isMontaFormOpen)
    setActionDate(draft.actionDate)
    setWeaningDestination(draft.weaningDestination)
    setDeathReason(draft.deathReason)
    setDeathDescription(draft.deathDescription)
    setWeightValue(draft.weightValue ?? '')
    setMilkAmount(draft.milkAmount ?? '')
    setMilkSession(draft.milkSession ?? 'morning')
    setSanitaryCategory(draft.sanitaryCategory ?? 'vaccine')
    setSanitaryTitle(draft.sanitaryTitle ?? '')
    setSanitaryDescription(draft.sanitaryDescription ?? '')
    setSanitaryNextDueDate(draft.sanitaryNextDueDate ?? '')
    setSanitaryBatch(draft.sanitaryBatch ?? '')
    setSanitaryVeterinarian(draft.sanitaryVeterinarian ?? '')
    setSanitaryCost(draft.sanitaryCost ?? '')
    setSanitaryTreatment(draft.sanitaryTreatment ?? '')
    setSanitarySeverity(draft.sanitarySeverity ?? '')
    setSanitaryIsResolved(draft.sanitaryIsResolved ?? false)
    setSanitaryResolvedDate(draft.sanitaryResolvedDate ?? '')
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
    trackNewRecordTypeSelected(optionId)
    resetActionState()
    setSelectedOption(optionId)
    setSelectedAnimalIds(getInitialAnimalIdsForOption(optionId))
    setActiveDraftId(createDraftId())
    setIsMontaFormOpen(false)
    setActionError(null)
  }

  const closeModal = () => {
    if (busyRef.current) return
    const draft = buildCurrentDraft()
    if (draft) {
      trackNewRecordDraftSaved({
        record_type: draft.selectedOption,
        animal_count: draft.selectedAnimalIds.length,
      })
    }
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
      const recordType = selectedOption ?? 'unknown'
      trackNewRecordSubmitted({ record_type: recordType, animal_count: selectedAnimalIds.length })
      const record = await action(activeDraftId)
      trackNewRecordCompleted({ record_type: recordType, animal_count: selectedAnimalIds.length })
      finishMovement(record)
    } catch (error) {
      trackNewRecordFailed({
        record_type: selectedOption ?? 'unknown',
        animal_count: selectedAnimalIds.length,
      })
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
  const registerWeight = () => {
    const grams = Number(weightValue.replace(',', '.')) * 1000
    perform((id) =>
      movements.weight(
        id,
        selectedAnimalIds[0],
        fromInputDate(actionDate),
        Math.round(grams),
        movementNotes.trim(),
      ),
    ).catch(() => {})
  }
  const registerMilk = () => {
    const amountMl = Number(milkAmount.replace(',', '.')) * 1000
    perform((id) =>
      movements.milk(
        id,
        selectedAnimalIds[0],
        fromInputDate(actionDate),
        Math.round(amountMl),
        milkSession,
        movementNotes.trim(),
      ),
    ).catch(() => {})
  }
  const registerSanitary = () => {
    if (!sanitaryTitle.trim()) {
      setActionError('Ingresa el nombre de la vacuna, medicamento o atención.')
      return
    }

    const parsedCost = sanitaryCost.trim() ? Number(sanitaryCost.replace(',', '.')) : undefined
    if (parsedCost != null && (!Number.isFinite(parsedCost) || parsedCost < 0)) {
      setActionError('Ingresa un costo válido.')
      return
    }

    perform((id) =>
      movements.health(id, selectedAnimalIds, {
        category: sanitaryCategory,
        title: sanitaryTitle,
        date: fromInputDate(actionDate),
        description: sanitaryDescription,
        nextDueDate: sanitaryNextDueDate ? fromInputDate(sanitaryNextDueDate) : undefined,
        batch: sanitaryBatch,
        veterinarian: sanitaryVeterinarian,
        cost: parsedCost,
        treatment: sanitaryTreatment,
        severity: sanitarySeverity || undefined,
        isResolved: sanitaryIsResolved,
        resolvedDate:
          sanitaryIsResolved && sanitaryResolvedDate
            ? fromInputDate(sanitaryResolvedDate)
            : undefined,
      }),
    ).catch(() => {})
  }
  const undoCompleted = async () => {
    if (!completedRecord || busyRef.current) return
    busyRef.current = true
    setIsUndoingMovement(true)
    try {
      await movements.undo(completedRecord)
      trackNewRecordUndone({
        record_type: completedRecord.eventType ?? completedRecord.type,
        animal_count: completedRecord.appliedToAnimals?.length ?? 0,
      })
      setCompletedRecord({ ...completedRecord, undoneAt: new Date() })
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'No se pudo deshacer.')
    } finally {
      busyRef.current = false
      setIsUndoingMovement(false)
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
  const openNewRecordModal = () => {
    trackNewRecordOpened(storedDrafts.length)
    setSelectedAnimalIds(preselectedAnimalIds)
    setIsOpen(true)
  }

  return (
    <>
      {trigger ? (
        trigger(openNewRecordModal)
      ) : (
        <Button
          type="button"
          size="sm"
          color="primary"
          icon="add"
          className="min-h-11 whitespace-nowrap"
          onClick={openNewRecordModal}
          aria-label="Abrir opciones de nuevo registro"
        >
          Nuevo Registro{storedDrafts.length > 0 ? ` (${storedDrafts.length})` : ''}
        </Button>
      )}

      <Modal isOpen={isOpen} onClose={closeModal} title="Nuevo Registro" size="md">
        <fieldset disabled={isActionSubmitting || isUndoingMovement} className="min-w-0 space-y-4">
          {storedDrafts.length > 0 && (
            <div className="flex flex-col items-end gap-2 pb-2 text-right">
              <button
                type="button"
                aria-expanded={isDraftsOpen}
                aria-label={`${isDraftsOpen ? 'Ocultar' : 'Ver'} borradores (${storedDrafts.length})`}
                onClick={() => setIsDraftsOpen((open) => !open)}
                className="min-h-8 cursor-pointer rounded-md border-0 bg-transparent px-1 text-sm font-medium text-gray-600 underline-offset-2 hover:text-gray-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
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
                    const label = option?.label ?? 'Registro'

                    return (
                      <div
                        key={draft.id}
                        className="inline-flex min-h-9 items-center rounded-full border border-gray-200 bg-gray-50 text-sm text-gray-700"
                      >
                        <button
                          type="button"
                          onClick={() => restoreStoredDraft(draft)}
                          className="min-h-9 cursor-pointer rounded-l-full px-3 text-left transition-colors hover:bg-gray-100 hover:text-gray-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-inset"
                        >
                          {label}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeStoredDraft(draft.id)}
                          aria-label={`Eliminar borrador de ${label}`}
                          className="mr-1 flex size-7 cursor-pointer items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
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
                  <button
                    type="button"
                    onClick={undoCompleted}
                    disabled={isUndoingMovement}
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 disabled:opacity-50"
                  >
                    <svg
                      aria-hidden="true"
                      className="h-5 w-5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 14 4 9l5-5" />
                      <path d="M4 9h10.5a4.5 4.5 0 0 1 0 9H13" />
                    </svg>
                    {isUndoingMovement ? 'Deshaciendo…' : 'Deshacer'}
                  </button>
                )}
                <Button type="button" onClick={closeModal} disabled={isUndoingMovement}>
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
                      secondaryLabel={(animal) =>
                        breedingWarnings(animal, selectedMontaMale, animals).join(' · ')
                      }
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
                  animals={selectableAnimals}
                  selectedIds={selectedAnimalIds}
                  onAdd={(animalId) => {
                    setSelectedAnimalIds((current) => [...current, animalId])
                    setActionError(null)
                  }}
                  onRemove={(animalId) =>
                    setSelectedAnimalIds((current) => current.filter((id) => id !== animalId))
                  }
                  mode={
                    selectedOption === 'parto' ||
                    selectedOption === 'peso' ||
                    selectedOption === 'leche'
                      ? 'single'
                      : 'multi'
                  }
                  label="Animales a los que aplica"
                  placeholder="Buscar por número, nombre, tipo o raza..."
                  searchAction={
                    ANIMAL_LIST_READER_ENABLED && (
                      <button
                        type="button"
                        onClick={() => setIsAnimalListReaderOpen(true)}
                        aria-label="Leer lista de aretes con imágenes"
                        title="Leer lista de aretes con imágenes"
                        className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border border-green-300 bg-green-50 px-2 text-lg text-green-700 transition hover:border-green-500 hover:bg-green-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
                      >
                        <span aria-hidden="true">✨</span>
                      </button>
                    )
                  }
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

                  {selectedOption === 'peso' && (
                    <div className="space-y-3">
                      <div>
                        <label
                          htmlFor="new-record-weight-date"
                          className="mb-1 block text-sm font-medium text-gray-700"
                        >
                          Fecha del pesaje
                        </label>
                        <input
                          id="new-record-weight-date"
                          type="date"
                          value={actionDate}
                          max={toInputDate(new Date())}
                          onChange={(event) => setActionDate(event.target.value)}
                          className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-base outline-none transition focus:border-violet-600 focus:ring-2 focus:ring-violet-200"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="new-record-weight-value"
                          className="mb-1 block text-sm font-medium text-gray-700"
                        >
                          Peso (kg)
                        </label>
                        <input
                          id="new-record-weight-value"
                          type="number"
                          inputMode="decimal"
                          min="0.1"
                          step="0.1"
                          value={weightValue}
                          onChange={(event) => setWeightValue(event.target.value)}
                          placeholder="Ej. 32.5"
                          className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-base outline-none transition focus:border-violet-600 focus:ring-2 focus:ring-violet-200"
                        />
                      </div>
                      <label className="block text-sm">
                        Notas (opcional)
                        <textarea
                          value={movementNotes}
                          onChange={(event) => setMovementNotes(event.target.value)}
                          rows={2}
                          className="mt-1 w-full resize-y rounded-lg border border-gray-300 p-2"
                          placeholder="Condición o comentario del pesaje..."
                        />
                      </label>
                      <Button
                        type="button"
                        color="info"
                        onClick={registerWeight}
                        disabled={isActionSubmitting || !weightValue}
                        className="w-full"
                      >
                        {isActionSubmitting ? 'Registrando...' : 'Registrar peso'}
                      </Button>
                    </div>
                  )}

                  {selectedOption === 'leche' && (
                    <div className="space-y-3">
                      <div>
                        <label
                          htmlFor="new-record-milk-date"
                          className="mb-1 block text-sm font-medium text-gray-700"
                        >
                          Fecha del ordeño
                        </label>
                        <input
                          id="new-record-milk-date"
                          type="date"
                          value={actionDate}
                          max={toInputDate(new Date())}
                          onChange={(event) => setActionDate(event.target.value)}
                          className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-base outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="new-record-milk-amount"
                          className="mb-1 block text-sm font-medium text-gray-700"
                        >
                          Cantidad (litros)
                        </label>
                        <input
                          id="new-record-milk-amount"
                          type="number"
                          inputMode="decimal"
                          min="0.01"
                          step="0.01"
                          value={milkAmount}
                          onChange={(event) => setMilkAmount(event.target.value)}
                          placeholder="Ej. 8.5"
                          className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-base outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200"
                        />
                      </div>
                      <fieldset>
                        <legend className="mb-2 text-sm font-medium text-gray-700">Turno</legend>
                        <div className="grid grid-cols-3 gap-2">
                          {(
                            [
                              ['morning', '🌅 Mañana'],
                              ['afternoon', '☀️ Tarde'],
                              ['evening', '🌙 Noche'],
                            ] as const
                          ).map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              aria-pressed={milkSession === value}
                              onClick={() => setMilkSession(value)}
                              className={`min-h-11 rounded-lg border px-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2 ${
                                milkSession === value
                                  ? 'border-cyan-600 bg-cyan-100 text-cyan-900'
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
                          onChange={(event) => setMovementNotes(event.target.value)}
                          rows={2}
                          className="mt-1 w-full resize-y rounded-lg border border-gray-300 p-2"
                          placeholder="Calidad, incidencia o destino de la leche..."
                        />
                      </label>
                      <Button
                        type="button"
                        color="info"
                        onClick={registerMilk}
                        disabled={isActionSubmitting || !milkAmount}
                        className="w-full"
                      >
                        {isActionSubmitting ? 'Registrando...' : 'Registrar leche'}
                      </Button>
                    </div>
                  )}

                  {selectedOption === 'sanidad' && (
                    <div className="space-y-3">
                      <div>
                        <label
                          htmlFor="new-record-health-category"
                          className="mb-1 block text-sm font-medium text-gray-700"
                        >
                          Tipo de atención sanitaria
                        </label>
                        <select
                          id="new-record-health-category"
                          value={sanitaryCategory}
                          onChange={(event) =>
                            setSanitaryCategory(event.target.value as SanitaryCategory)
                          }
                          className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-base outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                        >
                          {sanitaryCategories.map((category) => (
                            <option key={category} value={category}>
                              {record_category_icons[category]} {record_category_labels[category]}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="new-record-health-title"
                          className="mb-1 block text-sm font-medium text-gray-700"
                        >
                          Producto o atención
                        </label>
                        <input
                          id="new-record-health-title"
                          type="text"
                          value={sanitaryTitle}
                          onChange={(event) => setSanitaryTitle(event.target.value)}
                          placeholder={
                            sanitaryCategory === 'vaccine'
                              ? 'Ej. Vacuna clostridial'
                              : sanitaryCategory === 'deworming'
                                ? 'Ej. Ivermectina'
                                : 'Ej. Revisión veterinaria'
                          }
                          className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-base outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="new-record-health-date"
                          className="mb-1 block text-sm font-medium text-gray-700"
                        >
                          Fecha de aplicación
                        </label>
                        <input
                          id="new-record-health-date"
                          type="date"
                          value={actionDate}
                          max={toInputDate(new Date())}
                          onChange={(event) => setActionDate(event.target.value)}
                          className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-base outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                        />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor="new-record-health-next-date"
                            className="mb-1 block text-sm font-medium text-gray-700"
                          >
                            Próxima dosis o revisión (opcional)
                          </label>
                          <input
                            id="new-record-health-next-date"
                            type="date"
                            value={sanitaryNextDueDate}
                            onChange={(event) => setSanitaryNextDueDate(event.target.value)}
                            className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-base outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="new-record-health-batch"
                            className="mb-1 block text-sm font-medium text-gray-700"
                          >
                            Lote o producto (opcional)
                          </label>
                          <input
                            id="new-record-health-batch"
                            type="text"
                            value={sanitaryBatch}
                            onChange={(event) => setSanitaryBatch(event.target.value)}
                            placeholder="Lote, marca o presentación"
                            className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-base outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="new-record-health-veterinarian"
                            className="mb-1 block text-sm font-medium text-gray-700"
                          >
                            Veterinario (opcional)
                          </label>
                          <input
                            id="new-record-health-veterinarian"
                            type="text"
                            value={sanitaryVeterinarian}
                            onChange={(event) => setSanitaryVeterinarian(event.target.value)}
                            placeholder="Nombre del responsable"
                            className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-base outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="new-record-health-cost"
                            className="mb-1 block text-sm font-medium text-gray-700"
                          >
                            Costo (opcional)
                          </label>
                          <input
                            id="new-record-health-cost"
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            value={sanitaryCost}
                            onChange={(event) => setSanitaryCost(event.target.value)}
                            placeholder="$0.00"
                            className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-base outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                          />
                        </div>
                      </div>

                      {(['illness', 'injury', 'treatment', 'surgery'] as const).includes(
                        sanitaryCategory as 'illness' | 'injury' | 'treatment' | 'surgery',
                      ) && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label
                              htmlFor="new-record-health-severity"
                              className="mb-1 block text-sm font-medium text-gray-700"
                            >
                              Severidad (opcional)
                            </label>
                            <select
                              id="new-record-health-severity"
                              value={sanitarySeverity}
                              onChange={(event) =>
                                setSanitarySeverity(event.target.value as '' | RecordSeverity)
                              }
                              className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-base outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                            >
                              <option value="">Sin especificar</option>
                              {record_severities.map((severity) => (
                                <option key={severity} value={severity}>
                                  {record_severity_labels[severity]}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label
                              htmlFor="new-record-health-treatment"
                              className="mb-1 block text-sm font-medium text-gray-700"
                            >
                              Tratamiento (opcional)
                            </label>
                            <input
                              id="new-record-health-treatment"
                              type="text"
                              value={sanitaryTreatment}
                              onChange={(event) => setSanitaryTreatment(event.target.value)}
                              placeholder="Medicamento o indicación"
                              className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-base outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                            />
                          </div>
                          <label className="inline-flex min-h-11 items-center gap-2 text-sm text-gray-700 sm:col-span-2">
                            <input
                              type="checkbox"
                              checked={sanitaryIsResolved}
                              onChange={(event) => setSanitaryIsResolved(event.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500"
                            />
                            Caso resuelto
                          </label>
                          {sanitaryIsResolved && (
                            <div>
                              <label
                                htmlFor="new-record-health-resolved-date"
                                className="mb-1 block text-sm font-medium text-gray-700"
                              >
                                Fecha de resolución
                              </label>
                              <input
                                id="new-record-health-resolved-date"
                                type="date"
                                value={sanitaryResolvedDate}
                                max={toInputDate(new Date())}
                                onChange={(event) => setSanitaryResolvedDate(event.target.value)}
                                className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-base outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      <div>
                        <label
                          htmlFor="new-record-health-description"
                          className="mb-1 block text-sm font-medium text-gray-700"
                        >
                          Descripción (opcional)
                        </label>
                        <textarea
                          id="new-record-health-description"
                          value={sanitaryDescription}
                          onChange={(event) => setSanitaryDescription(event.target.value)}
                          rows={3}
                          placeholder="Observaciones, dosis o indicaciones..."
                          className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-base outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                        />
                      </div>

                      <Button
                        type="button"
                        color="success"
                        onClick={registerSanitary}
                        disabled={isActionSubmitting}
                        className="w-full"
                      >
                        {isActionSubmitting ? 'Registrando...' : 'Registrar sanidad'}
                      </Button>
                    </div>
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

      <ModalAnimalListReader
        isOpen={ANIMAL_LIST_READER_ENABLED && isAnimalListReaderOpen}
        onClose={() => setIsAnimalListReaderOpen(false)}
        farmId={movements.context.farmId}
        animals={selectableAnimals}
        selectedIds={selectedAnimalIds}
        onApply={(animalIds) => {
          setSelectedAnimalIds((current) => [...new Set([...current, ...animalIds])])
          setActionError(null)
        }}
      />

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
