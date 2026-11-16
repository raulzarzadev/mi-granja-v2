'use client'

import { useFarmPendingTasks } from '@/hooks/useFarmPendingTasks'
import { useReminders } from '@/hooks/useReminders'

/**
 * Avisos que piden atención: recordatorios de hoy y vencidos más partos y destetes
 * vencidos (los próximos no cuentan). Lo comparten la campana y la pestaña Recordatorios.
 */
export function useNotificationsCount() {
  const { getBadgeCount } = useReminders()
  const overdueTasks = useFarmPendingTasks().filter((task) => task.daysUntil < 0)
  return { count: getBadgeCount() + overdueTasks.length, overdueTasks }
}
