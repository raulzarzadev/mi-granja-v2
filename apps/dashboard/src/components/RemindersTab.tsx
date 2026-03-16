'use client'

import { useRouter } from 'next/navigation'
import React, { useMemo, useState } from 'react'
import HealthRemindersCard from '@/components/HealthRemindersCard'
import ReminderCard from '@/components/ReminderCard'
import Tabs from '@/components/Tabs'
import WeaningRemindersCard from '@/components/WeaningRemindersCard'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useReminders } from '@/hooks/useReminders'
import { Reminder } from '@/types'
import { AnimalType } from '@/types/animals'

interface RemindersTabProps {
  speciesFilter?: AnimalType | ''
}

const RemindersTab: React.FC<RemindersTabProps> = ({ speciesFilter = '' }) => {
  const router = useRouter()
  const { animals } = useAnimalCRUD()
  const {
    reminders,
    isLoading,
    markAsCompleted,
    markAnimalCompleted,
    deleteReminder,
    getOverdueReminders,
    getTodayReminders,
    getUpcomingReminders,
  } = useReminders()

  const [showCompleted, setShowCompleted] = useState(false)
  const [search, setSearch] = useState('')

  // Build a set of animal numbers that match the species filter
  const speciesAnimalNumbers = useMemo(() => {
    if (!speciesFilter) return null
    return new Set(animals.filter((a) => a.type === speciesFilter).map((a) => a.animalNumber))
  }, [animals, speciesFilter])

  // Filter reminders by species filter and search text
  const filteredReminders = useMemo(() => {
    let result = reminders

    // Apply species filter
    if (speciesAnimalNumbers) {
      result = result.filter((r) => {
        const nums = r.animalNumbers?.length
          ? r.animalNumbers
          : r.animalNumber
            ? [r.animalNumber]
            : []
        if (nums.length === 0) return false
        return nums.some((n) => speciesAnimalNumbers.has(n))
      })
    }

    // Apply search filter
    const q = search.trim().toLowerCase()
    if (!q) return result
    return result.filter((r) => {
      const parts = [
        r.title || '',
        r.description || '',
        r.animalNumber || '',
        ...(r.animalNumbers || []),
      ]
      return parts.join(' ').toLowerCase().includes(q)
    })
  }, [reminders, animals, search, speciesAnimalNumbers])

  const pendingReminders = filteredReminders.filter((r) => !r.completed)
  const completedReminders = filteredReminders.filter((r) => r.completed)
  const filteredIds = useMemo(
    () => new Set(filteredReminders.map((r) => r.id)),
    [filteredReminders],
  )
  const todayReminders = useMemo(() => {
    return getTodayReminders().filter((r) => filteredIds.has(r.id))
  }, [getTodayReminders, filteredIds])
  const overdueReminders = useMemo(() => {
    return getOverdueReminders().filter((r) => filteredIds.has(r.id))
  }, [getOverdueReminders, filteredIds])
  const todayAndOverdue = [...overdueReminders, ...todayReminders]

  const upcomingReminders = useMemo(() => {
    return getUpcomingReminders().filter((r) => filteredIds.has(r.id))
  }, [getUpcomingReminders, filteredIds])

  const editReminder = (r: Reminder) => router.push(`/recordatorio/${r.id}/editar`)

  const renderReminderGrid = (list: Reminder[], showComplete = true) => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
          <span className="ml-3 text-gray-600">Cargando recordatorios...</span>
        </div>
      )
    }

    if (list.length === 0) {
      return <p className="text-gray-500 text-sm py-4">No hay recordatorios en esta seccion.</p>
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((reminder) => (
          <ReminderCard
            key={reminder.id}
            reminder={reminder}
            animals={animals}
            onComplete={showComplete ? (r) => markAsCompleted(r.id) : undefined}
            onCompleteAnimal={
              showComplete
                ? (r, animalNum, completed) => markAnimalCompleted(r.id, animalNum, completed)
                : undefined
            }
            onEdit={editReminder}
            onDelete={(r) => deleteReminder(r.id)}
          />
        ))}
      </div>
    )
  }

  const tabs = [
    {
      label: '⏰ Hoy',
      badgeCount: todayAndOverdue.length,
      content: (
        <div className="space-y-6">
          {overdueReminders.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-red-700 mb-3 flex items-center gap-2">
                Vencidos
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                  {overdueReminders.length}
                </span>
              </h3>
              {renderReminderGrid(overdueReminders)}
            </div>
          )}
          <div>
            {overdueReminders.length > 0 && todayReminders.length > 0 && (
              <h3 className="text-sm font-medium text-gray-700 mb-3">Para hoy</h3>
            )}
            {todayAndOverdue.length === 0 ? (
              <p className="text-gray-500 text-sm py-4">No hay recordatorios para hoy.</p>
            ) : todayReminders.length > 0 ? (
              renderReminderGrid(todayReminders)
            ) : null}
          </div>
          <HealthRemindersCard />
        </div>
      ),
    },
    {
      label: '🍼 Destetes',
      content: <WeaningRemindersCard />,
    },
    {
      label: '🔔 Proximos',
      badgeCount: upcomingReminders.length,
      content: <div className="space-y-4">{renderReminderGrid(upcomingReminders)}</div>,
    },
    {
      label: '📋 Todos',
      badgeCount: pendingReminders.length,
      content: (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">
            Pendientes ({pendingReminders.length})
          </h3>
          {renderReminderGrid(pendingReminders)}

          {completedReminders.length > 0 && (
            <div className="pt-4 border-t">
              <button
                onClick={() => setShowCompleted((v) => !v)}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${showCompleted ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
                {showCompleted ? 'Ocultar' : 'Ver'} completados ({completedReminders.length})
              </button>
              {showCompleted && (
                <div className="mt-4">{renderReminderGrid(completedReminders, false)}</div>
              )}
            </div>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-3">
      {/* Search + add header */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 flex items-center gap-2">
          <input
            type="text"
            placeholder="Buscar por titulo, animal, descripcion..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="p-2 rounded-lg border border-red-300 bg-red-50 hover:bg-red-100 transition-colors"
              title="Limpiar búsqueda"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-5 h-5 text-red-500"
              >
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          )}
          <button
            onClick={() => router.push('/recordatorio/nuevo')}
            className="p-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
            title="Nuevo Recordatorio"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
          </button>
        </div>
        {search && (
          <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              <span className="font-semibold text-gray-700">{filteredReminders.length}</span> de{' '}
              {reminders.length} recordatorios
            </span>
          </div>
        )}
      </div>
      <Tabs tabs={tabs} tabsId="reminders-tabs" />
    </div>
  )
}

export default RemindersTab
