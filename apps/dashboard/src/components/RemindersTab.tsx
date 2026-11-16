'use client'

import { useRouter } from 'next/navigation'
import React, { useMemo, useState } from 'react'
import FarmTaskRegister from '@/components/FarmTaskRegister'
import FarmTaskRow from '@/components/FarmTaskRow'
import FirstReminderEmptyState from '@/components/FirstReminderEmptyState'
import HealthRemindersCard from '@/components/HealthRemindersCard'
import { EmojiIcon } from '@/components/Icon/emoji-icons'
import ReminderRow from '@/components/ReminderRow'
import { type FarmPendingTask, useFarmPendingTasks } from '@/hooks/useFarmPendingTasks'
import { useReminders } from '@/hooks/useReminders'
import { normalizeAnimalSearch, valuesMatchSearch } from '@/lib/animal-search'
import { Reminder } from '@/types'

const startOfDay = (offsetDays = 0) => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + offsetDays)
  return date
}

const byDueDate = (a: Reminder, b: Reminder) =>
  new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()

/**
 * Lista única de pendientes: partos y destetes sin registrar (vencidos y de la
 * próxima semana) junto a los recordatorios, agrupados en vencidos, hoy y
 * próximos; completados colapsados al final.
 */
const RemindersTab: React.FC = () => {
  const router = useRouter()
  const { reminders, isLoading } = useReminders()

  const farmTasks = useFarmPendingTasks()
  const [registering, setRegistering] = useState<FarmPendingTask | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!normalizeAnimalSearch(search)) return reminders
    return reminders.filter((r) =>
      valuesMatchSearch(
        [r.title || '', r.description || '', r.animalNumber || '', ...(r.animalNumbers || [])],
        search,
      ),
    )
  }, [reminders, search])

  const groups = useMemo(() => {
    const today = startOfDay().getTime()
    const pending = filtered.filter((r) => !r.completed).sort(byDueDate)
    return {
      pending,
      overdueCount: pending.filter((r) => new Date(r.dueDate).getTime() < today).length,
      completed: filtered.filter((r) => r.completed).sort((a, b) => byDueDate(b, a)),
    }
  }, [filtered])

  const taskGroups = useMemo(() => {
    const tasks = normalizeAnimalSearch(search)
      ? farmTasks.filter((t) =>
          valuesMatchSearch([t.animal.animalNumber || '', t.animal.name || '', t.kind], search),
        )
      : farmTasks
    return {
      partos: tasks.filter((t) => t.kind === 'parto'),
      destetes: tasks.filter((t) => t.kind === 'destete'),
    }
  }, [farmTasks, search])

  const renderList = (list: Reminder[]) => (
    <div className="flex flex-col gap-2">
      {list.map((reminder) => (
        <ReminderRow key={reminder.id} reminder={reminder} />
      ))}
    </div>
  )

  const overdueTasks = (tasks: FarmPendingTask[]) => tasks.filter((t) => t.daysUntil < 0).length

  /** Grupo colapsable; cerrado por defecto, el encabezado muestra conteo y vencidos. */
  const group = (
    emoji: string,
    title: string,
    count: number,
    overdue: number,
    content: React.ReactNode,
  ) => (
    <details className="group rounded-lg border border-gray-200 bg-white">
      <summary className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none list-none hover:bg-gray-50 rounded-lg [&::-webkit-details-marker]:hidden">
        <span className="text-gray-400 transition-transform group-open:rotate-90">▸</span>
        <EmojiIcon emoji={emoji} />
        <span className="text-sm font-semibold text-gray-800">{title}</span>
        <span className="text-xs text-gray-400">({count})</span>
        {overdue > 0 && (
          <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
            {overdue} vencido{overdue !== 1 ? 's' : ''}
          </span>
        )}
      </summary>
      <div className="px-3 pb-3">
        {count === 0 ? <p className="text-sm text-gray-400">Nada pendiente.</p> : content}
      </div>
    </details>
  )

  const taskList = (tasks: FarmPendingTask[]) => (
    <div className="flex flex-col gap-2">
      {tasks.map((task) => (
        <FarmTaskRow key={task.id} task={task} onRegister={setRegistering} />
      ))}
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        <span className="ml-3 text-gray-600">Cargando recordatorios...</span>
      </div>
    )
  }

  // Granja sin recordatorios: solo el estado vacío (más los seguimientos de sanidad, si hay)
  if (reminders.length === 0 && farmTasks.length === 0) {
    return (
      <div className="space-y-4">
        <FirstReminderEmptyState />
        <HealthRemindersCard />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <input
          type="search"
          placeholder="Buscar por título, animal, descripción..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          type="button"
          onClick={() => router.push('/recordatorio/nuevo')}
          className="p-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors cursor-pointer"
          title="Nuevo recordatorio"
          aria-label="Nuevo recordatorio"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
            aria-hidden="true"
          >
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
        </button>
      </div>

      {group(
        '🤰',
        'Partos',
        taskGroups.partos.length,
        overdueTasks(taskGroups.partos),
        taskList(taskGroups.partos),
      )}
      {group(
        '🍼',
        'Destetes',
        taskGroups.destetes.length,
        overdueTasks(taskGroups.destetes),
        taskList(taskGroups.destetes),
      )}
      {group(
        '⏰',
        'Recordatorios',
        groups.pending.length,
        groups.overdueCount,
        renderList(groups.pending),
      )}

      <HealthRemindersCard />

      {groups.completed.length > 0 && (
        <section className="pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => setShowCompleted((v) => !v)}
            aria-expanded={showCompleted}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 cursor-pointer"
          >
            <span className={`transition-transform ${showCompleted ? 'rotate-90' : ''}`}>▸</span>
            Completados ({groups.completed.length})
          </button>
          {showCompleted && <div className="mt-3">{renderList(groups.completed)}</div>}
        </section>
      )}
      {registering && <FarmTaskRegister task={registering} onClose={() => setRegistering(null)} />}
    </div>
  )
}

export default RemindersTab
