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

  // Cargar recordatorios
  useEffect(() => {
    if (!user) {
      setReminders([])
      setIsLoading(false)
      return
    }

    const constraints = [where('farmerId', '==', user.id)]
    if (currentFarm?.id) constraints.push(where('farmId', '==', currentFarm.id))
    const q = query(collection(db, 'reminders'), ...constraints, orderBy('dueDate', 'asc'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const remindersData: Reminder[] = []
      snapshot.forEach((d) => {
        const data = d.data()
        const animalNumbers = normalizeAnimalNumbers(data)
        remindersData.push({
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
          createdAt: toDate(data.createdAt),
          updatedAt: toDate(data.updatedAt),
        })
      })
      setReminders(remindersData)
      setIsLoading(false)
    })

    return () => unsubscribe()
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

      const docData = {
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

      await addDoc(collection(db, 'reminders'), docData)
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
    getStats,
  }
}
