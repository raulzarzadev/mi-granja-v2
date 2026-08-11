'use client'

import { addDays, differenceInCalendarDays, format, parseISO, toDate } from 'date-fns'
import { es } from 'date-fns/locale'
import { useState } from 'react'
import { useAnimalCRUD, WeanNextStage } from '@/hooks/useAnimalCRUD'
import { getWeaningDays } from '@/lib/animalBreedingConfig'
import { Animal } from '@/types/animals'
import Button from './buttons/Button'
import { Icon } from './Icon/icon'
import { Modal } from './Modal'

interface WeanedAnimalProps {
  animal: Animal
  onWean?: (animalId: string, weanDate: Date) => void
}

export const WeanedAnimal = ({ animal }: WeanedAnimalProps) => {
  const [showWeanModal, setShowWeanModal] = useState(false)

  if (!animal.birthDate) return null

  const raw = animal.birthDate
  const birthDate = raw instanceof Date ? raw : new Date(raw as string | number)
  if (Number.isNaN(birthDate.getTime())) return null

  const weaningDays = getWeaningDays(animal)
  const targetWeanDate = addDays(birthDate, weaningDays)
  const daysUntilWean = differenceInCalendarDays(targetWeanDate, new Date())

  // Determinar el estado del destete
  let statusColor = ''
  let statusBg = ''
  let statusBorder = ''
  let statusText = ''

  // Verificar si el animal necesita destete (edad y estado)
  const needWeaning = animal.stage === 'cria'
  if (!needWeaning) {
    return null
  }

  if (daysUntilWean < -10) {
    // Más de 10 días vencido - ROJO
    statusColor = 'text-red-900'
    statusBg = 'bg-red-50'
    statusBorder = 'border-red-300'
    statusText = `Vencido hace ${Math.abs(daysUntilWean)} días`
  } else if (daysUntilWean >= -10 && daysUntilWean <= 10) {
    // Entre -10 y +10 días - AMARILLO (próximo o recién vencido)
    statusColor = 'text-yellow-900'
    statusBg = 'bg-yellow-50'
    statusBorder = 'border-yellow-300'
    if (daysUntilWean < 0) {
      statusText = `Vencido hace ${Math.abs(daysUntilWean)} días`
    } else if (daysUntilWean === 0) {
      statusText = 'Hoy es el destete'
    } else {
      statusText = `En ${daysUntilWean} días`
    }
  } else {
    // Más de 10 días para el destete - VERDE
    statusColor = 'text-green-900'
    statusBg = 'bg-green-50'
    statusBorder = 'border-green-300'
    statusText = `En ${daysUntilWean} días`
  }

  return (
    <>
      <button
        type="button"
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusBg} ${statusBorder} ${statusColor} cursor-pointer hover:opacity-80 transition-opacity`}
        onClick={(e) => {
          e.stopPropagation()
          setShowWeanModal(true)
        }}
        title={`Destete: ${format(targetWeanDate, 'dd/MM/yyyy', { locale: es })}`}
      >
        <Icon icon="babyBottle" className="text-xs" />
        <span>{statusText}</span>
      </button>

      {showWeanModal && (
        <ModalWeanAnimal
          animal={animal}
          targetWeanDate={targetWeanDate}
          onClose={() => setShowWeanModal(false)}
        />
      )}
    </>
  )
}

export const WeanAnimalButton = ({ animal }: { animal: Animal }) => {
  const [showWeanModal, setShowWeanModal] = useState(false)
  const birthDate = animal.birthDate ? toDate(animal.birthDate) : null
  const targetWeanDate = birthDate ? addDays(birthDate, getWeaningDays(animal)) : new Date()

  return (
    <>
      <button
        type="button"
        onClick={() => setShowWeanModal(true)}
        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-800 transition-colors hover:border-amber-400 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
      >
        Destetar
      </button>
      {showWeanModal ? (
        <ModalWeanAnimal
          animal={animal}
          targetWeanDate={targetWeanDate}
          onClose={() => setShowWeanModal(false)}
        />
      ) : null}
    </>
  )
}

interface ModalWeanAnimalProps {
  animal: Animal
  targetWeanDate: Date
  onClose: () => void
  onWean?: (animalId: string, weanDate: Date) => void
}

const ModalWeanAnimal = ({ animal, targetWeanDate, onClose }: ModalWeanAnimalProps) => {
  const { wean } = useAnimalCRUD()

  const [weanDate, setWeanDate] = useState<Date>(
    animal.weanedAt ? toDate(animal.weanedAt) : new Date(),
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleWean = async (stageDecision: WeanNextStage) => {
    if (!wean) return
    setIsLoading(true)
    setError('')
    try {
      await wean(animal.id, {
        weanDate,
        stageDecision,
      })
      onClose()
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'No se pudo registrar el destete. Inténtalo de nuevo.',
      )
    } finally {
      setIsLoading(false)
    }
  }
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Registrar destete ${animal?.animalNumber}`}
      size="md"
      icon="babyBottle"
      iconClassName="text-lg text-green-600"
    >
      <div className="space-y-4">
        {/* <div className="flex items-center gap-3 mb-4">
          <Icon icon="babyBottle" className="text-3xl text-green-600" />
        </div> */}

        <div className="grid gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 sm:grid-cols-2">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">Animal:</span> {animal?.animalNumber}
          </p>
          <p className="text-sm text-blue-900">
            <span className="font-semibold">Destete objetivo:</span>{' '}
            {format(targetWeanDate, 'dd/MM/yyyy', { locale: es })}
          </p>
        </div>

        <form className="space-y-4">
          <div>
            <label htmlFor="weanDate" className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de destete {animal.weanedAt ? '(actual)' : ''}
            </label>
            <input
              type="date"
              id="weanDate"
              value={format(weanDate, 'yyyy-MM-dd')}
              onChange={(e) => setWeanDate(parseISO(e.target.value))}
              max={format(new Date(), 'yyyy-MM-dd')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              {animal.weanedAt
                ? 'Modifica la fecha si es necesario'
                : 'Selecciona la fecha en que se destetó'}
            </p>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              {error}
            </p>
          ) : null}

          <div className="grid gap-2 pt-2 sm:grid-cols-[auto_1fr_1fr]">
            <Button
              type="button"
              onClick={onClose}
              className="min-h-11 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              disabled={isLoading}
              variant="ghost"
              size="sm"
            >
              Cancelar
            </Button>
            <Button
              color="warning"
              onClick={(e) => {
                e.preventDefault()
                void handleWean('engorda')
              }}
              size="sm"
              disabled={isLoading}
              className="min-h-11"
            >
              🍖 A Engorda
            </Button>
            <Button
              onClick={(e) => {
                e.preventDefault()
                void handleWean('reproductor')
              }}
              color="success"
              size="sm"
              disabled={isLoading}
              className="min-h-11"
            >
              ❤️ A Reproducción
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
