'use client'

import { addDays, differenceInCalendarDays, format, toDate } from 'date-fns'
import { es } from 'date-fns/locale'
import { useState } from 'react'
import { setLoading } from '@/features/auth/authSlice'
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

  const birthDate = toDate(animal.birthDate)
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
    return <></>
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
      <div
        className={`mt-3 p-3 rounded-md border ${statusBg} ${statusBorder} ${statusColor} cursor-pointer hover:opacity-80 transition-opacity`}
        onClick={(e) => {
          e.stopPropagation()
          setShowWeanModal(true)
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon icon="babyBottle" className="text-lg" />
            <div>
              <div className="font-semibold text-sm">Destete objetivo</div>
            </div>
          </div>
          <div className="text-xs opacity-75">
            {format(targetWeanDate, 'dd/MM/yyyy', { locale: es })}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{statusText}</span>
            <span className="opacity-50">›</span>
          </div>
        </div>
      </div>

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

  const handleWean = async (stageDecision: WeanNextStage) => {
    if (!wean) return
    setIsLoading(true)

    await wean(animal.id, {
      weanDate,
      stageDecision,
    })

    onClose()
    setLoading(false)
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

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md flex justify-between">
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
              onChange={(e) => setWeanDate(new Date(e.target.value))}
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

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              disabled={isLoading}
              variant="ghost"
              size="sm"
            >
              Cancelar
            </Button>
            <div className="flex items-center gap-1">
              <Button
                color="success"
                onClick={(e) => {
                  e.preventDefault()
                  handleWean('engorda')
                }}
                size="sm"
              >
                Destetar→Engorda
              </Button>
              <Button
                onClick={(e) => {
                  e.preventDefault()
                  handleWean('reproductor')
                }}
                color="primary"
                size="sm"
              >
                Destetar→Repro
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  )
}
