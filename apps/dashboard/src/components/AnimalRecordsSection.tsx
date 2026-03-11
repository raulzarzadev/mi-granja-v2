'use client'

import { useRouter } from 'next/navigation'
import React, { useMemo, useState } from 'react'
import ModalRecordDetail, { RecordDetailRow } from '@/components/ModalRecordDetail'
import RecordRow from '@/components/RecordRow'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useReminders } from '@/hooks/useReminders'
import { Animal, AnimalRecord, RecordType } from '@/types/animals'

interface Props {
  animal: Animal
}

const PAGE_SIZE = 5

const filterTypes: Array<{ value: RecordType | ''; label: string; icon: string }> = [
  { value: '', label: 'Todos', icon: '📋' },
  { value: 'weight', label: 'Peso', icon: '⚖️' },
  { value: 'health', label: 'Salud', icon: '🏥' },
  { value: 'note', label: 'Nota', icon: '📝' },
  { value: 'birth', label: 'Parto', icon: '🐣' },
]

const AnimalRecordsSection: React.FC<Props> = ({ animal }) => {
  const router = useRouter()
  const { animals } = useAnimalCRUD()
  const { getRemindersByAnimal, markAnimalCompleted } = useReminders()
  const [detailRecord, setDetailRecord] = useState<RecordDetailRow | null>(null)
  const [typeFilter, setTypeFilter] = useState<RecordType | ''>('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // Combinar records[] + weightRecords[] (para datos legacy sin record en records[])
  const allRecords: AnimalRecord[] = useMemo(() => {
    const records = [...(animal.records || [])]

    // Incluir weightRecords legacy que no tengan un record correspondiente en records[]
    if (animal.weightRecords) {
      const existingWeightDates = new Set(
        records.filter((r) => r.type === 'weight').map((r) => new Date(r.date).getTime()),
      )
      animal.weightRecords.forEach((wr) => {
        const wrTime = new Date(wr.date).getTime()
        if (!existingWeightDates.has(wrTime)) {
          records.push({
            id: `wr-${wrTime}`,
            type: 'weight',
            category: 'general',
            title: `${(wr.weight / 1000).toFixed(1)} kg`,
            date: wr.date,
            notes: wr.notes,
            createdAt: wr.date,
            createdBy: '',
          })
        }
      })
    }

    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [animal.records, animal.weightRecords])

  const filteredRecords = useMemo(() => {
    if (!typeFilter) return allRecords
    return allRecords.filter((r) => r.type === typeFilter)
  }, [allRecords, typeFilter])

  const visibleRecords = filteredRecords.slice(0, visibleCount)
  const hasMore = visibleCount < filteredRecords.length

  const animalReminders = useMemo(
    () => getRemindersByAnimal(animal.animalNumber),
    [getRemindersByAnimal, animal.animalNumber],
  )

  const pendingReminders = animalReminders.filter((r) => !r.completed)
  const completedReminders = animalReminders.filter((r) => r.completed)

  const openDetail = (rec: AnimalRecord) => {
    setDetailRecord({
      ...rec,
      animalId: animal.id,
      animalNumber: animal.animalNumber || 'Sin numero',
    })
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(date))
  }

  const getTimeLabel = (dueDate: Date) => {
    const now = new Date()
    const due = new Date(dueDate)
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return { text: `Vencido (${Math.abs(diffDays)}d)`, color: 'text-red-600' }
    if (diffDays === 0) return { text: 'Hoy', color: 'text-yellow-600' }
    if (diffDays === 1) return { text: 'Mañana', color: 'text-yellow-600' }
    return { text: `En ${diffDays}d`, color: 'text-gray-500' }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'medical':
        return '🏥'
      case 'breeding':
        return '🐣'
      case 'feeding':
        return '🌾'
      case 'weight':
        return '⚖️'
      default:
        return '📝'
    }
  }

  // Contar registros por tipo para badges
  const countByType = useMemo(() => {
    const counts: Record<string, number> = {}
    allRecords.forEach((r) => {
      counts[r.type] = (counts[r.type] || 0) + 1
    })
    return counts
  }, [allRecords])

  const handleFilterChange = (t: RecordType | '') => {
    setTypeFilter(t)
    setVisibleCount(PAGE_SIZE)
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Registros</h3>
        <button
          onClick={() => router.push(`/registro/nuevo?animalIds=${animal.id}`)}
          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700"
        >
          + Nuevo registro
        </button>
      </div>

      {/* Recordatorios pendientes del animal */}
      {pendingReminders.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-500 flex items-center gap-1.5">
            🔔 Recordatorios pendientes ({pendingReminders.length})
          </h4>
          {pendingReminders.map((reminder) => {
            const isCompletedForThisAnimal = reminder.completionByAnimal?.[animal.animalNumber]
            const allNumbers = reminder.animalNumbers || []
            const completionMap = reminder.completionByAnimal || {}
            const completedCount = allNumbers.filter((n) => completionMap[n]).length
            const timeInfo = getTimeLabel(reminder.dueDate)

            return (
              <div
                key={reminder.id}
                className={`border rounded-lg p-3 ${
                  isCompletedForThisAnimal
                    ? 'bg-green-50 border-green-200'
                    : new Date(reminder.dueDate) < new Date()
                      ? 'bg-red-50 border-red-200'
                      : 'bg-amber-50 border-amber-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{getTypeIcon(reminder.type)}</span>
                      <span
                        className={`text-sm font-medium ${isCompletedForThisAnimal ? 'line-through text-gray-400' : 'text-gray-900'}`}
                      >
                        {reminder.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">{formatDate(reminder.dueDate)}</span>
                      <span className={`text-xs font-medium ${timeInfo.color}`}>
                        {timeInfo.text}
                      </span>
                      {allNumbers.length > 1 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                          {completedCount}/{allNumbers.length} animales
                        </span>
                      )}
                    </div>
                  </div>

                  {!isCompletedForThisAnimal ? (
                    <button
                      type="button"
                      onClick={() => markAnimalCompleted(reminder.id, animal.animalNumber, true)}
                      className="flex-shrink-0 px-2.5 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                      title={allNumbers.length > 1 ? 'Marcar este animal como hecho' : 'Completar'}
                    >
                      ✓ Hecho
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => markAnimalCompleted(reminder.id, animal.animalNumber, false)}
                      className="flex-shrink-0 px-2.5 py-1 border border-gray-300 text-gray-500 rounded text-xs hover:bg-gray-50 transition-colors"
                      title="Desmarcar"
                    >
                      Deshacer
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Filtros por tipo */}
      {allRecords.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {filterTypes.map((ft) => {
            const isActive = typeFilter === ft.value
            const count = ft.value ? countByType[ft.value] || 0 : allRecords.length
            return (
              <button
                key={ft.value || 'all'}
                type="button"
                onClick={() => handleFilterChange(ft.value)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{ft.icon}</span>
                {ft.label}
                <span className={`ml-0.5 ${isActive ? 'text-blue-200' : 'text-gray-400'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Registros */}
      {filteredRecords.length === 0 && pendingReminders.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📋</div>
          <p>{typeFilter ? 'No hay registros de este tipo' : 'No hay registros aun'}</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <p className="text-sm text-gray-400 py-4">No hay registros de este tipo.</p>
      ) : (
        <div className="space-y-2">
          {visibleRecords.map((rec) => (
            <RecordRow key={rec.id} rec={rec} onClick={() => openDetail(rec)} />
          ))}

          {hasMore && (
            <button
              type="button"
              onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
              className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Ver más ({filteredRecords.length - visibleCount} restantes)
            </button>
          )}
        </div>
      )}

      {/* Recordatorios completados (colapsable) */}
      {completedReminders.length > 0 && (
        <details className="text-sm">
          <summary className="text-gray-400 cursor-pointer hover:text-gray-600">
            {completedReminders.length} recordatorio{completedReminders.length !== 1 ? 's' : ''}{' '}
            completado{completedReminders.length !== 1 ? 's' : ''}
          </summary>
          <div className="mt-2 space-y-1">
            {completedReminders.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded bg-gray-50 text-gray-400"
              >
                <span className="text-green-400">✓</span>
                <span className="line-through text-xs">{r.title}</span>
                <span className="text-[10px] ml-auto">{formatDate(r.dueDate)}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Modal detalle de registro */}
      <ModalRecordDetail
        isOpen={!!detailRecord}
        onClose={() => setDetailRecord(null)}
        record={detailRecord}
        animals={animals}
      />
    </div>
  )
}

export default AnimalRecordsSection
