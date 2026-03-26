'use client'

import { collection, getDocs } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '@/lib/firebase'
import { User } from '@/types'
import { Animal, AnimalType } from '@/types/animals'
import { FarmCollaborator } from '@/types/collaborators'

export interface AdminFarmInfo {
  id: string
  name: string
  ownerId: string
  ownerEmail?: string
  animalCount: number
  collaborators: FarmCollaborator[]
  createdAt: Date
}

export interface AdminInvitationInfo {
  id: string
  farmId: string
  farmName?: string
  email: string
  role: string
  status: string
  createdAt: Date
}

export interface AdminSaleInfo {
  id: string
  farmId: string
  farmName?: string
  status: string
  animalCount: number
  pricePerKg?: number
  priceType?: string
  buyer?: string
  date?: Date
  createdAt: Date
}

export interface AdminStats {
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
  farms: AdminFarmInfo[]
  invitations: AdminInvitationInfo[]
  sales: AdminSaleInfo[]
  users: User[]
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
    farms: [],
    invitations: [],
    sales: [],
    users: [],
    recentUsers: [],
    recentAnimals: [],
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStats((prev) => ({ ...prev, isLoading: true, error: null }))

        const [
          usersData,
          animalsData,
          breedingsData,
          remindersData,
          farmsData,
          invitationsData,
          salesData,
        ] = await Promise.all([
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
        const userMap = new Map<string, User>()
        usersData.forEach((doc) => {
          const data = doc.data()
          const u: User = {
            id: doc.id,
            email: data.email,
            farmName: data.farmName || '',
            roles: data.roles || ['farmer'],
            createdAt: data.createdAt?.toDate() || new Date(),
          }
          users.push(u)
          userMap.set(doc.id, u)
        })

        // Animales + desglose por especie + conteo por granja
        const animals: Animal[] = []
        const speciesMap = new Map<AnimalType, number>()
        const animalsByFarm = new Map<string, number>()
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
          speciesMap.set(data.type, (speciesMap.get(data.type) || 0) + 1)
          if (data.farmId) {
            animalsByFarm.set(data.farmId, (animalsByFarm.get(data.farmId) || 0) + 1)
          }
        })

        const speciesBreakdown = Array.from(speciesMap.entries())
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count)

        // Granjas con detalles
        const farms: AdminFarmInfo[] = []
        const farmNameMap = new Map<string, string>()
        farmsData.forEach((doc) => {
          const data = doc.data()
          const owner = userMap.get(data.ownerId)
          farmNameMap.set(doc.id, data.name || doc.id)
          farms.push({
            id: doc.id,
            name: data.name || '',
            ownerId: data.ownerId,
            ownerEmail: owner?.email,
            animalCount: animalsByFarm.get(doc.id) || 0,
            collaborators: data.collaborators || [],
            createdAt: data.createdAt?.toDate() || new Date(),
          })
        })
        farms.sort((a, b) => b.animalCount - a.animalCount)

        // Recordatorios
        let activeCount = 0
        remindersData.forEach((doc) => {
          if (!doc.data().completed) activeCount++
        })

        // Invitaciones
        const invitationsByStatus: Record<string, number> = {}
        const invitations: AdminInvitationInfo[] = []
        invitationsData.forEach((doc) => {
          const data = doc.data()
          const status = data.status || 'unknown'
          invitationsByStatus[status] = (invitationsByStatus[status] || 0) + 1
          invitations.push({
            id: doc.id,
            farmId: data.farmId,
            farmName: farmNameMap.get(data.farmId),
            email: data.email,
            role: data.role,
            status,
            createdAt: data.createdAt?.toDate() || new Date(),
          })
        })
        invitations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

        // Ventas
        const salesByStatus: Record<string, number> = {}
        const salesList: AdminSaleInfo[] = []
        salesData.forEach((doc) => {
          const data = doc.data()
          const status = data.status || 'unknown'
          salesByStatus[status] = (salesByStatus[status] || 0) + 1
          salesList.push({
            id: doc.id,
            farmId: data.farmId,
            farmName: farmNameMap.get(data.farmId),
            status,
            animalCount: data.animals?.length || 0,
            pricePerKg: data.pricePerKg,
            priceType: data.priceType,
            buyer: data.buyer,
            date: data.date?.toDate?.(),
            createdAt: data.createdAt?.toDate() || new Date(),
          })
        })
        salesList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

        const recentUsers = [...users]
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 5)
        const recentAnimals = [...animals]
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
          farms,
          invitations,
          sales: salesList,
          users,
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
