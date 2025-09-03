'use client'

import React from 'react'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { addDays, differenceInCalendarDays, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { animals_types_labels } from '@/types/animals'
import { getWeaningDays } from '@/lib/animalBreedingConfig'

const WeaningRemindersCard: React.FC = () => {
  const { animals, wean } = useAnimalCRUD()

  const today = new Date()
  const UPCOMING_WINDOW_DAYS = 21
  const dueSoon = animals
    .filter((a) => a.status !== 'muerto' && a.status !== 'vendido')
    .filter((a) => !a.isWeaned && a.birthDate)
    .map((a) => {
      const due = addDays(a.birthDate as Date, getWeaningDays(a))
      const daysUntil = differenceInCalendarDays(due, today)
      return { animal: a, dueDate: due, daysUntil }
    })
    // Mostrar vencidos y próximos (ventana configurable)
    .filter((x) => x.daysUntil <= UPCOMING_WINDOW_DAYS)
    // Orden: más próximos primero; si vencidos, los más urgentes primero
    .sort((a, b) => a.daysUntil - b.daysUntil)

  // Mostrar siempre la tarjeta para que se vea la sección en el tab Recordatorios

  const handleWean = async (animalId: string) => {
    try {
      await wean(animalId)
    } catch (e) {
      console.error('Error marcando destete:', e)
    }
  }

  const urgencyColor = (daysUntil: number) => {
    if (daysUntil < -14) return 'bg-red-50 border-red-200 text-red-800'
    if (daysUntil < 0) return 'bg-orange-50 border-orange-200 text-orange-800'
    if (daysUntil <= 7) return 'bg-yellow-50 border-yellow-200 text-yellow-800'
    return 'bg-amber-50 border-amber-200 text-amber-800'
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🍼</span>
        <h3 className="text-lg font-semibold text-gray-900">
          Destete pendiente/próximo
        </h3>
        <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
          {dueSoon.length}
        </span>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {dueSoon.length === 0 && (
          <div className="p-3 rounded-lg border bg-gray-50 text-gray-600 text-sm">
            No hay destetes vencidos o próximos en los próximos{' '}
            {UPCOMING_WINDOW_DAYS} días.
          </div>
        )}
        {dueSoon.map(({ animal, dueDate, daysUntil }) => (
          <div
            key={animal.id}
            className={`p-3 rounded-lg border ${urgencyColor(daysUntil)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span>⚠️</span>
                  <span className="font-medium text-sm">
                    {animal.animalNumber || `#${animal.id.slice(0, 6)}`}
                  </span>
                  <span className="text-xs bg-white bg-opacity-50 px-2 py-1 rounded">
                    {animals_types_labels[animal.type]}
                  </span>
                </div>
                <div className="text-xs space-y-1">
                  {daysUntil < 0 ? (
                    <div>
                      Vencido hace <strong>{Math.abs(daysUntil)} días</strong>
                    </div>
                  ) : daysUntil === 0 ? (
                    <div>
                      <strong>Hoy</strong>
                    </div>
                  ) : (
                    <div>
                      En <strong>{daysUntil} días</strong>
                    </div>
                  )}
                  <div>
                    Fecha objetivo:{' '}
                    {format(new Date(dueDate), 'dd/MM/yyyy', { locale: es })}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleWean(animal.id)}
                className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-md bg-green-600 text-white hover:bg-green-700"
              >
                Marcar destetado
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default WeaningRemindersCard
