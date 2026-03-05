'use client'

import React, { useState } from 'react'
import HealthRemindersCard from '@/components/HealthRemindersCard'
import ModalReminderForm from '@/components/ModalReminderForm'
import ReminderCard from '@/components/ReminderCard'
import Tabs from '@/components/Tabs'
import WeaningRemindersCard from '@/components/WeaningRemindersCard'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useReminders } from '@/hooks/useReminders'
import { Reminder } from '@/types'

const RemindersTab: React.FC = () => {
  const { animals } = useAnimalCRUD()
  const {
    reminders,
    isLoading,
    markAsCompleted,
    deleteReminder,
    getOverdueReminders,
    getTodayReminders,
    getUpcomingReminders,
  } = useReminders()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)

  const pendingReminders = reminders.filter((r) => !r.completed)
  const completedReminders = reminders.filter((r) => r.completed)
  const todayReminders = getTodayReminders()
  const overdueReminders = getOverdueReminders()
  const todayAndOverdue = [...overdueReminders, ...todayReminders]

  const openNew = () => {
    setEditingReminder(null)
    setIsModalOpen(true)
  }

  const editReminder = (r: Reminder) => {
    setEditingReminder(r)
    setIsModalOpen(true)
  }

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
      badgeCount: getUpcomingReminders().length,
      content: (
        <div className="space-y-4">
          {renderReminderGrid(getUpcomingReminders())}
        </div>
      ),
    },
    {
      label: '📋 Todos',
      badgeCount: pendingReminders.length,
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">
              Pendientes ({pendingReminders.length})
            </h3>
            <button
              onClick={openNew}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Nuevo Recordatorio
            </button>
          </div>
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
                <div className="mt-4">
                  {renderReminderGrid(completedReminders, false)}
                </div>
              )}
            </div>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <Tabs tabs={tabs} tabsId="reminders-tabs" />
      <ModalReminderForm
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingReminder(null)
        }}
        editingReminder={editingReminder}
      />
    </>
  )
}

export default RemindersTab
