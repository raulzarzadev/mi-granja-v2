import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { RootState } from '@/features/store'
import { Reminder } from '@/types'

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
    const q = query(
      collection(db, 'reminders'),
      ...constraints,
      orderBy('dueDate', 'asc')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const remindersData: Reminder[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        remindersData.push({
          id: doc.id,
          farmerId: data.farmerId,
          animalNumber: data.animalNumber,
          title: data.title,
          description: data.description || '',
          dueDate: data.dueDate.toDate(),
          completed: data.completed || false,
          priority: data.priority || 'medium',
          type: data.type || 'other',
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate()
        })
      })
      setReminders(remindersData)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [user, currentFarm?.id])

  // Crear recordatorio
  const createReminder = async (
    data: Omit<Reminder, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!user) throw new Error('Usuario no autenticado')
    if (!currentFarm?.id) throw new Error('Selecciona una granja primero')

    setIsSubmitting(true)
    try {
      const now = Timestamp.now()
      const docData = {
        farmerId: user.id,
        farmId: currentFarm.id,
        animalNumber: data.animalNumber || null,
        title: data.title,
        description: data.description || '',
        dueDate: Timestamp.fromDate(new Date(data.dueDate)),
        completed: data.completed || false,
        priority: data.priority || 'medium',
        type: data.type || 'other',
        createdAt: now,
        updatedAt: now
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
    updates: Partial<Omit<Reminder, 'id' | 'farmerId' | 'createdAt'>>
  ) => {
    setIsSubmitting(true)
    try {
      const docRef = doc(db, 'reminders', id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: Record<string, any> = {
        updatedAt: Timestamp.now()
      }

      if (updates.title !== undefined) updateData.title = updates.title
      if (updates.description !== undefined)
        updateData.description = updates.description
      if (updates.completed !== undefined)
        updateData.completed = updates.completed
      if (updates.priority !== undefined) updateData.priority = updates.priority
      if (updates.type !== undefined) updateData.type = updates.type
      if (updates.animalNumber !== undefined)
        updateData.animalNumber = updates.animalNumber

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

  // Marcar como completado
  const markAsCompleted = async (id: string, completed: boolean = true) => {
    await updateReminder(id, { completed })
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

  // Obtener recordatorios por animal
  const getRemindersByAnimal = (animalNumber: string) => {
    return reminders.filter(
      (reminder) => reminder.animalNumber === animalNumber
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

    return reminders.filter(
      (reminder) => !reminder.completed && new Date(reminder.dueDate) < today
    )
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
      upcoming
    }
  }

  return {
    reminders,
    isLoading,
    isSubmitting,
    createReminder,
    updateReminder,
    markAsCompleted,
    deleteReminder,
    getRemindersByAnimal,
    getPendingReminders,
    getOverdueReminders,
    getTodayReminders,
    getUpcomingReminders,
    getStats
  }
}
