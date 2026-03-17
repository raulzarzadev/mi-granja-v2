'use client'

import { collection, getDocs } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '@/lib/firebase'
import { Reminder, User } from '@/types'
import { Animal, AnimalType } from '@/types/animals'

interface AdminStats {
  totalUsers: number
  totalAnimals: number
  totalBreedings: number
  totalReminders: number
  activeReminders: number
  totalFarms: number
  totalInvitations: number
  invitationsByStatus: Record<string, number>
  totalSales: number
  salesByStatus: Record<string, number>
  speciesBreakdown: { type: AnimalType; count: number }[]
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
    totalFarms: 0,
    totalInvitations: 0,
    invitationsByStatus: {},
    totalSales: 0,
    salesByStatus: {},
    speciesBreakdown: [],
    recentUsers: [],
    recentAnimals: [],
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStats((prev) => ({ ...prev, isLoading: true, error: null }))

        const [usersData, animalsData, breedingsData, remindersData, farmsData, invitationsData, salesData] =
          await Promise.all([
            getDocs(collection(db, 'users')),
            getDocs(collection(db, 'animals')),
            getDocs(collection(db, 'breedingRecords')),
            getDocs(collection(db, 'reminders')),
            getDocs(collection(db, 'farms')),
            getDocs(collection(db, 'farmInvitations')),
            getDocs(collection(db, 'sales')),
          ])

        // Usuarios
        const users: User[] = []
        usersData.forEach((doc) => {
          const data = doc.data()
          users.push({
            id: doc.id,
            email: data.email,
            farmName: data.farmName || '',
            roles: data.roles || ['farmer'],
            createdAt: data.createdAt?.toDate() || new Date(),
          })
        })

        // Animales + desglose por especie
        const animals: Animal[] = []
        const speciesMap = new Map<AnimalType, number>()
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
            updatedAt: data.updatedAt?.toDate() || new Date(),
          })
          const t = data.type as AnimalType
          speciesMap.set(t, (speciesMap.get(t) || 0) + 1)
        })

        const speciesBreakdown = Array.from(speciesMap.entries())
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count)

        // Recordatorios
        let activeCount = 0
        remindersData.forEach((doc) => {
          const data = doc.data()
          if (!data.completed) activeCount++
        })

        // Invitaciones por status
        const invitationsByStatus: Record<string, number> = {}
        invitationsData.forEach((doc) => {
          const status = doc.data().status || 'unknown'
          invitationsByStatus[status] = (invitationsByStatus[status] || 0) + 1
        })

        // Ventas por status
        const salesByStatus: Record<string, number> = {}
        salesData.forEach((doc) => {
          const status = doc.data().status || 'unknown'
          salesByStatus[status] = (salesByStatus[status] || 0) + 1
        })

        const recentUsers = users
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 5)

        const recentAnimals = animals
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 5)

        setStats({
          totalUsers: users.length,
          totalAnimals: animals.length,
          totalBreedings: breedingsData.size,
          totalReminders: remindersData.size,
          activeReminders: activeCount,
          totalFarms: farmsData.size,
          totalInvitations: invitationsData.size,
          invitationsByStatus,
          totalSales: salesData.size,
          salesByStatus,
          speciesBreakdown,
          recentUsers,
          recentAnimals,
          isLoading: false,
          error: null,
        })
      } catch (error) {
        console.error('Error fetching admin stats:', error)
        setStats((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Error al cargar estadísticas',
        }))
      }
    }

    fetchStats()
  }, [])

  return stats
}
