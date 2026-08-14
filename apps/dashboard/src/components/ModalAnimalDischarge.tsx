'use client'

import { useState } from 'react'
import Button from '@/components/buttons/Button'
import DateTimeInput from '@/components/inputs/DateTimeInput'
import { Modal } from '@/components/Modal'
import ModalSaleForm from '@/components/ModalSaleForm'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { animalDeathReasonLabels, buildDeathStatusNotes } from '@/lib/animal-discharge'
import type { Animal, AnimalDeathReason } from '@/types/animals'

interface ModalAnimalDischargeProps {
  animal: Animal
  triggerClassName?: string
}

type DischargeReason = 'death' | 'sale'

const deathReasons = Object.entries(animalDeathReasonLabels) as [AnimalDeathReason, string][]

export default function ModalAnimalDischarge({
  animal,
  triggerClassName = '',
}: ModalAnimalDischargeProps) {
  const { markStatus } = useAnimalCRUD()
  const [isOpen, setIsOpen] = useState(false)
  const [isSaleOpen, setIsSaleOpen] = useState(false)
  const [reason, setReason] = useState<DischargeReason | null>(null)
  const [deathReason, setDeathReason] = useState<AnimalDeathReason | null>(null)
  const [date, setDate] = useState<Date>(new Date())
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setReason(null)
    setDeathReason(null)
    setDate(new Date())
    setDescription('')
    setError(null)
  }

  const close = () => {
    setIsOpen(false)
    reset()
  }

  const continueToSale = () => {
    close()
    setIsSaleOpen(true)
  }

  const registerDeath = async () => {
    if (!deathReason) {
      setError('Selecciona la causa de muerte.')
      return
    }
    if (!description.trim()) {
      setError('Describe brevemente lo ocurrido.')
      return
    }
    if (date.getTime() > Date.now()) {
      setError('La fecha de la muerte no puede estar en el futuro.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await markStatus(animal.id, {
        status: 'muerto',
        statusAt: date,
        statusNotes: buildDeathStatusNotes(deathReason, description),
        deathInfo: {
          reason: deathReason,
          date,
          description: description.trim(),
        },
      })
      close()
    } catch (cause) {
      console.error('Error registering animal death:', cause)
      setError('No se pudo registrar la baja. Intenta nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        color="warning"
        variant="outline"
        className={`min-h-11 w-full whitespace-nowrap sm:w-auto ${triggerClassName}`}
        onClick={() => setIsOpen(true)}
      >
        Dar de baja
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={close}
        title={`Dar de baja #${animal.animalNumber}`}
        size="md"
      >
        <div className="space-y-5">
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-gray-900">Motivo de la baja</legend>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={reason === 'death'}
                onClick={() => {
                  setReason('death')
                  setError(null)
                }}
                className={`min-h-14 rounded-xl border-2 px-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 ${
                  reason === 'death'
                    ? 'border-red-600 bg-red-50 text-red-800'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-red-300 hover:bg-red-50'
                }`}
              >
                💀 Muerte
              </button>
              <button
                type="button"
                aria-pressed={reason === 'sale'}
                onClick={() => {
                  setReason('sale')
                  setError(null)
                }}
                className={`min-h-14 rounded-xl border-2 px-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 ${
                  reason === 'sale'
                    ? 'border-green-600 bg-green-50 text-green-800'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-green-300 hover:bg-green-50'
                }`}
              >
                💲 Venta
              </button>
            </div>
          </fieldset>

          {reason === 'death' ? (
            <div className="space-y-4 border-t border-gray-200 pt-4">
              <fieldset>
                <legend className="mb-2 text-sm font-semibold text-gray-900">
                  Causa de muerte
                </legend>
                <div className="grid gap-2 min-[420px]:grid-cols-2">
                  {deathReasons.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={deathReason === value}
                      onClick={() => {
                        setDeathReason(value)
                        setError(null)
                      }}
                      className={`min-h-11 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-1 ${
                        deathReason === value
                          ? 'border-red-600 bg-red-50 text-red-800'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <DateTimeInput
                value={date}
                onChange={(value) => value && setDate(value)}
                type="date"
                label="Fecha de la muerte"
                required
              />

              <div>
                <label
                  htmlFor={`death-description-${animal.id}`}
                  className="mb-2 block text-sm font-semibold text-gray-900"
                >
                  Descripción de los hechos <span className="text-red-600">*</span>
                </label>
                <textarea
                  id={`death-description-${animal.id}`}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="Describe síntomas, circunstancias y cualquier observación relevante."
                  className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-200"
                />
              </div>
            </div>
          ) : null}

          {reason === 'sale' ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-900">Registrar como venta</p>
              <p className="mt-1 text-sm leading-5 text-green-800">
                Capturarás la fecha, precio y peso. La venta quedará integrada en estadísticas y
                registros.
              </p>
            </div>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {error}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 border-t border-gray-200 pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              color="neutral"
              variant="outline"
              onClick={close}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            {reason === 'death' ? (
              <Button type="button" color="error" onClick={registerDeath} disabled={isSubmitting}>
                {isSubmitting ? 'Registrando…' : 'Registrar muerte'}
              </Button>
            ) : null}
            {reason === 'sale' ? (
              <Button type="button" color="success" onClick={continueToSale}>
                Continuar con venta
              </Button>
            ) : null}
          </div>
        </div>
      </Modal>

      <ModalSaleForm
        isOpen={isSaleOpen}
        onClose={() => setIsSaleOpen(false)}
        initialAnimalId={animal.id}
        initialStatus="completed"
      />
    </>
  )
}
