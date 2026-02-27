'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Reminder } from '@/types'

interface UseAdminRemindersReturn {
  reminders: Reminder[]
  isLoading: boolean
  error: string | null
  refreshReminders: () => Promise<void>
}

export const useAdminReminders = (): UseAdminRemindersReturn => {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReminders = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const remindersSnapshot = await getDocs(collection(db, 'reminders'))
      const remindersData: Reminder[] = []

      remindersSnapshot.forEach((doc) => {
        const data = doc.data()
        remindersData.push({
          id: doc.id,
          farmerId: data.farmerId,
          animalNumber: data.animalNumber,
          title: data.title,
          description: data.description || '',
          dueDate: data.dueDate?.toDate() || new Date(),
          completed: data.completed || false,
          priority: data.priority || 'medium',
          type: data.type || 'other',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        })
      })

      // Ordenar por fecha de vencimiento (más próximos primero)
      remindersData.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())

      setReminders(remindersData)
    } catch (err) {
      console.error('Error fetching reminders:', err)
      setError(
        err instanceof Error ? err.message : 'Error al cargar recordatorios'
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchReminders()
  }, [])

  return {
    reminders,
    isLoading,
    error,
    refreshReminders: fetchReminders
  }
}
