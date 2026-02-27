'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { User, Reminder } from '@/types'
import { Animal } from '@/types/animals'

interface AdminStats {
  totalUsers: number
  totalAnimals: number
  totalBreedings: number
  totalReminders: number
  activeReminders: number
  recentUsers: User[]
  recentAnimals: Animal[]
  isLoading: boolean
  error: string | null
}

export const useAdminStats = (): AdminStats => {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalAnimals: 0,
    totalBreedings: 0,
    totalReminders: 0,
    activeReminders: 0,
    recentUsers: [],
    recentAnimals: [],
    isLoading: true,
    error: null
  })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStats((prev) => ({ ...prev, isLoading: true, error: null }))

        // Obtener estadísticas en paralelo
        const [usersData, animalsData, breedingsData, remindersData] =
          await Promise.all([
            // Usuarios
            getDocs(collection(db, 'users')),
            // Animales
            getDocs(collection(db, 'animals')),
            // Reproducciones
            getDocs(collection(db, 'breedingRecords')),
            // Recordatorios
            getDocs(collection(db, 'reminders'))
          ])

        // Procesar usuarios
        const users: User[] = []
        usersData.forEach((doc) => {
          const data = doc.data()
          users.push({
            id: doc.id,
            email: data.email,
            farmName: data.farmName || '',
            roles: data.roles || ['farmer'],
            createdAt: data.createdAt?.toDate() || new Date()
          })
        })

        // Procesar animales
        const animals: Animal[] = []
        animalsData.forEach((doc) => {
          const data = doc.data()
          animals.push({
            id: doc.id,
            farmerId: data.farmerId,
            animalNumber: data.animalNumber,
            type: data.type,
            stage: data.stage,
            gender: data.gender,
            weight: data.weight,
            age: data.age,
            birthDate: data.birthDate?.toDate(),
            notes: data.notes || '',
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          })
        })

        // Procesar recordatorios
        const reminders: Reminder[] = []
        let activeCount = 0
        remindersData.forEach((doc) => {
          const data = doc.data()
          const reminder: Reminder = {
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
          }
          reminders.push(reminder)
          if (!reminder.completed) activeCount++
        })

        // Obtener usuarios recientes
        const recentUsers = users
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 5)

        // Obtener animales recientes
        const recentAnimals = animals
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 5)

        setStats({
          totalUsers: users.length,
          totalAnimals: animals.length,
          totalBreedings: breedingsData.size,
          totalReminders: reminders.length,
          activeReminders: activeCount,
          recentUsers,
          recentAnimals,
          isLoading: false,
          error: null
        })
      } catch (error) {
        console.error('Error fetching admin stats:', error)
        setStats((prev) => ({
          ...prev,
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : 'Error al cargar estadísticas'
        }))
      }
    }

    fetchStats()
  }, [])

  return stats
}
