import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/features/store'
import { toDate, toLocalDateStart } from '@/lib/dates'
import { db } from '@/lib/firebase'
import { trackReminderCreated } from '@/lib/analytics/track'
import { Reminder } from '@/types'

/** Normaliza animalNumbers desde datos legacy (animalNumber) y nuevos (animalNumbers) */
function normalizeAnimalNumbers(data: Record<string, any>): string[] {
  if (Array.isArray(data.animalNumbers) && data.animalNumbers.length > 0) {
    return data.animalNumbers
  }
  if (data.animalNumber) {
    return [data.animalNumber]
  }
  return []
}

export const useReminders = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const { currentFarm } = useSelector((state: RootState) => state.farm)
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Cargar recordatorios — owned (farmerId==me) ∪ assigned (assigneeIds contains me)
  useEffect(() => {
    if (!user) {
      setReminders([])
      setIsLoading(false)
      return
    }

    const remindersCol = collection(db, 'reminders')
    const farmConstraint = currentFarm?.id ? [where('farmId', '==', currentFarm.id)] : []
    const ownedQ = query(
      remindersCol,
      ...farmConstraint,
      where('farmerId', '==', user.id),
      orderBy('dueDate', 'asc'),
    )
    const assignedQ = query(
      remindersCol,
      ...farmConstraint,
      where('assigneeIds', 'array-contains', user.id),
      orderBy('dueDate', 'asc'),
    )

    const ownedMap = new Map<string, Reminder>()
    const assignedMap = new Map<string, Reminder>()

    const mapDoc = (d: { id: string; data: () => Record<string, unknown> }): Reminder => {
      const data = d.data() as Record<string, any>
      const animalNumbers = normalizeAnimalNumbers(data)
      return {
        id: d.id,
        farmerId: data.farmerId,
        animalNumber: data.animalNumber,
        animalNumbers,
        title: data.title,
        description: data.description || '',
        dueDate: toLocalDateStart(data.dueDate),
        completed: data.completed || false,
        completionByAnimal: data.completionByAnimal || {},
        priority: data.priority || 'medium',
        type: data.type || 'other',
        assigneeIds: Array.isArray(data.assigneeIds) ? data.assigneeIds : undefined,
        notifiedAt: data.notifiedAt ? toDate(data.notifiedAt) : undefined,
        lastOverdueNotifiedAt: data.lastOverdueNotifiedAt
          ? toDate(data.lastOverdueNotifiedAt)
          : undefined,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      }
    }

    const merge = () => {
      const merged = new Map<string, Reminder>(ownedMap)
      assignedMap.forEach((value, key) => {
        if (!merged.has(key)) merged.set(key, value)
      })
      const list = Array.from(merged.values()).sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      )
      setReminders(list)
      setIsLoading(false)
    }

    const unsubOwned = onSnapshot(
      ownedQ,
      (snapshot) => {
        ownedMap.clear()
        snapshot.forEach((d) => {
          ownedMap.set(d.id, mapDoc(d))
        })
        merge()
      },
      (err) => console.error('owned reminders error:', err),
    )
    const unsubAssigned = onSnapshot(
      assignedQ,
      (snapshot) => {
        assignedMap.clear()
        snapshot.forEach((d) => {
          assignedMap.set(d.id, mapDoc(d))
        })
        merge()
      },
      (err) => console.error('assigned reminders error:', err),
    )

    return () => {
      unsubOwned()
      unsubAssigned()
    }
  }, [user, currentFarm?.id])

  // Crear recordatorio
  const createReminder = async (
    data: Omit<Reminder, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>,
  ) => {
    if (!user) throw new Error('Usuario no autenticado')
    if (!currentFarm?.id) throw new Error('Selecciona una granja primero')

    setIsSubmitting(true)
    try {
      const now = Timestamp.now()
      const animalNumbers = data.animalNumbers || (data.animalNumber ? [data.animalNumber] : [])

      // Inicializar completionByAnimal con todos en false
      const completionByAnimal: Record<string, boolean> = {}
      for (const num of animalNumbers) {
        completionByAnimal[num] = false
      }

      const docData: Record<string, unknown> = {
        farmerId: user.id,
        farmId: currentFarm.id,
        animalNumber: animalNumbers[0] || null, // compatibilidad legacy
        animalNumbers,
        title: data.title,
        description: data.description || '',
        dueDate: Timestamp.fromDate(new Date(data.dueDate)),
        completed: data.completed || false,
        completionByAnimal,
        priority: data.priority || 'medium',
        type: data.type || 'other',
        createdAt: now,
        updatedAt: now,
      }
      if (data.assigneeIds && data.assigneeIds.length > 0) {
        docData.assigneeIds = data.assigneeIds
      }

      await addDoc(collection(db, 'reminders'), docData)
      trackReminderCreated({
        reminder_type: data.type || 'other',
        priority: data.priority || 'medium',
        animal_count: animalNumbers.length,
      })
    } catch (error) {
      console.error('Error creating reminder:', error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  // Actualizar recordatorio
  const updateReminder = async (
    id: string,
    updates: Partial<Omit<Reminder, 'id' | 'farmerId' | 'createdAt'>>,
  ) => {
    setIsSubmitting(true)
    try {
      const docRef = doc(db, 'reminders', id)
      const updateData: Record<string, any> = {
        updatedAt: Timestamp.now(),
      }

      if (updates.title !== undefined) updateData.title = updates.title
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.completed !== undefined) updateData.completed = updates.completed
      if (updates.completionByAnimal !== undefined)
        updateData.completionByAnimal = updates.completionByAnimal
      if (updates.priority !== undefined) updateData.priority = updates.priority
      if (updates.type !== undefined) updateData.type = updates.type
      if (updates.animalNumber !== undefined) updateData.animalNumber = updates.animalNumber
      if (updates.animalNumbers !== undefined) updateData.animalNumbers = updates.animalNumbers
      if (updates.assigneeIds !== undefined) {
        updateData.assigneeIds =
          Array.isArray(updates.assigneeIds) && updates.assigneeIds.length > 0
            ? updates.assigneeIds
            : null
      }

      if (updates.dueDate) {
        updateData.dueDate = Timestamp.fromDate(new Date(updates.dueDate))
      }

      await updateDoc(docRef, updateData)
    } catch (error) {
      console.error('Error updating reminder:', error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  // Marcar completado total
  const markAsCompleted = async (id: string, completed: boolean = true) => {
    const reminder = reminders.find((r) => r.id === id)
    if (!reminder) return

    // Si se marca como completado, marcar todos los animales también
    const completionByAnimal = { ...(reminder.completionByAnimal || {}) }
    if (completed) {
      for (const num of reminder.animalNumbers || []) {
        completionByAnimal[num] = true
      }
    } else {
      for (const num of reminder.animalNumbers || []) {
        completionByAnimal[num] = false
      }
    }

    await updateReminder(id, { completed, completionByAnimal })
  }

  // Marcar completado para un animal específico
  const markAnimalCompleted = async (
    id: string,
    animalNumber: string,
    completed: boolean = true,
  ) => {
    const reminder = reminders.find((r) => r.id === id)
    if (!reminder) return

    const completionByAnimal = { ...(reminder.completionByAnimal || {}) }
    completionByAnimal[animalNumber] = completed

    // Verificar si todos los animales están completados
    const allNumbers = reminder.animalNumbers || []
    const allCompleted = allNumbers.length > 0 && allNumbers.every((num) => completionByAnimal[num])

    await updateReminder(id, {
      completionByAnimal,
      completed: allCompleted,
    })
  }

  // Eliminar recordatorio
  const deleteReminder = async (id: string) => {
    setIsSubmitting(true)
    try {
      await deleteDoc(doc(db, 'reminders', id))
    } catch (error) {
      console.error('Error deleting reminder:', error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  // Obtener recordatorios por animal (busca en animalNumbers array o legacy animalNumber)
  const getRemindersByAnimal = (animalNumber: string) => {
    return reminders.filter(
      (r) => r.animalNumbers?.includes(animalNumber) || r.animalNumber === animalNumber,
    )
  }

  // Obtener recordatorios pendientes
  const getPendingReminders = () => {
    return reminders.filter((reminder) => !reminder.completed)
  }

  // Obtener recordatorios vencidos
  const getOverdueReminders = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return reminders.filter((reminder) => !reminder.completed && new Date(reminder.dueDate) < today)
  }

  // Obtener recordatorios de hoy
  const getTodayReminders = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return reminders.filter((reminder) => {
      const dueDate = new Date(reminder.dueDate)
      return dueDate >= today && dueDate < tomorrow && !reminder.completed
    })
  }

  // Obtener recordatorios próximos (próximos 7 días)
  const getUpcomingReminders = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    return reminders.filter((reminder) => {
      const dueDate = new Date(reminder.dueDate)
      return dueDate >= today && dueDate <= nextWeek && !reminder.completed
    })
  }

  // Obtener estadísticas
  const getStats = () => {
    const pending = getPendingReminders().length
    const overdue = getOverdueReminders().length
    const today = getTodayReminders().length
    const upcoming = getUpcomingReminders().length
    const completed = reminders.filter((r) => r.completed).length

    return {
      total: reminders.length,
      pending,
      completed,
      overdue,
      today,
      upcoming,
    }
  }

  // Recordatorios asignados al usuario actual
  const getRemindersAssignedToMe = () => {
    if (!user) return []
    return reminders.filter((r) => {
      if (r.assigneeIds && r.assigneeIds.length > 0) return r.assigneeIds.includes(user.id)
      return r.farmerId === user.id
    })
  }

  // Conteo total para badge: hoy + atrasados (no completados)
  const getBadgeCount = () => getOverdueReminders().length + getTodayReminders().length

  return {
    reminders,
    isLoading,
    isSubmitting,
    createReminder,
    updateReminder,
    markAsCompleted,
    markAnimalCompleted,
    deleteReminder,
    getRemindersByAnimal,
    getPendingReminders,
    getOverdueReminders,
    getTodayReminders,
    getUpcomingReminders,
    getRemindersAssignedToMe,
    getBadgeCount,
    getStats,
  }
}
