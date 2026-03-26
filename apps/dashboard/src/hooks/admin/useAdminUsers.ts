'use client'

import { collection, doc, getDocs, updateDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '@/lib/firebase'
import { User } from '@/types'
import { AnimalType } from '@/types/animals'

export interface AdminFarm {
  id: string
  name: string
  ownerId: string
  collaborators: { userId?: string; email?: string; role?: string }[]
  createdAt: Date
}

export interface AdminAnimalSummary {
  farmId: string
  type: AnimalType
  count: number
}

export interface AdminUser extends User {
  places: number
  farms: AdminFarm[]
  animalsByFarm: Map<string, AdminAnimalSummary[]>
  totalAnimals: number
}

interface UseAdminUsersReturn {
  users: AdminUser[]
  isLoading: boolean
  error: string | null
  updateUserRoles: (userId: string, newRoles: string[]) => Promise<void>
  refreshUsers: () => Promise<void>
}

export const useAdminUsers = (): UseAdminUsersReturn => {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [usersSnapshot, subsSnapshot, farmsSnapshot, animalsSnapshot] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'subscriptions')),
        getDocs(collection(db, 'farms')),
        getDocs(collection(db, 'animals')),
      ])

      // Mapear suscripciones por userId
      const subsMap = new Map<string, number>()
      subsSnapshot.forEach((doc) => {
        const data = doc.data()
        const userId = data.userId ?? doc.id
        subsMap.set(userId, data.places ?? 0)
      })

      // Mapear granjas por ownerId
      const farmsMap = new Map<string, AdminFarm[]>()
      farmsSnapshot.forEach((doc) => {
        const data = doc.data()
        const farm: AdminFarm = {
          id: doc.id,
          name: data.name || 'Sin nombre',
          ownerId: data.ownerId,
          collaborators: data.collaborators || [],
          createdAt: data.createdAt?.toDate() || new Date(),
        }
        const existing = farmsMap.get(data.ownerId) || []
        existing.push(farm)
        farmsMap.set(data.ownerId, existing)
      })

      // Mapear animales por farmId → tipo
      const animalsByFarmMap = new Map<string, Map<string, number>>()
      const animalCountByOwner = new Map<string, number>()
      animalsSnapshot.forEach((doc) => {
        const data = doc.data()
        const farmId = data.farmId
        const farmerId = data.farmerId
        if (farmId) {
          const typeMap = animalsByFarmMap.get(farmId) || new Map<string, number>()
          typeMap.set(data.type, (typeMap.get(data.type) || 0) + 1)
          animalsByFarmMap.set(farmId, typeMap)
        }
        if (farmerId) {
          animalCountByOwner.set(farmerId, (animalCountByOwner.get(farmerId) || 0) + 1)
        }
      })

      const usersData: AdminUser[] = []

      usersSnapshot.forEach((doc) => {
        const data = doc.data()
        const userId = doc.id
        const userFarms = farmsMap.get(userId) || []

        // Construir resumen de animales por granja
        const animalsByFarm = new Map<string, AdminAnimalSummary[]>()
        for (const farm of userFarms) {
          const typeMap = animalsByFarmMap.get(farm.id)
          if (typeMap) {
            const summaries: AdminAnimalSummary[] = []
            typeMap.forEach((count, type) => {
              summaries.push({ farmId: farm.id, type: type as AnimalType, count })
            })
            summaries.sort((a, b) => b.count - a.count)
            animalsByFarm.set(farm.id, summaries)
          }
        }

        usersData.push({
          id: userId,
          email: data.email,
          farmName: data.farmName || '',
          roles: data.roles || ['farmer'],
          createdAt: data.createdAt?.toDate() || new Date(),
          planType: data.planType,
          subscriptionStatus: data.subscriptionStatus,
          places: subsMap.get(userId) ?? 0,
          farms: userFarms,
          animalsByFarm,
          totalAnimals: animalCountByOwner.get(userId) || 0,
        })
      })

      setUsers(usersData)
    } catch (err) {
      console.error('Error fetching users:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios')
    } finally {
      setIsLoading(false)
    }
  }

  const updateUserRoles = async (userId: string, newRoles: string[]) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        roles: newRoles,
        updatedAt: new Date(),
      })

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? { ...user, roles: newRoles as ('admin' | 'farmer' | 'vet')[] }
            : user,
        ),
      )
    } catch (err) {
      console.error('Error updating user roles:', err)
      throw err
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  return {
    users,
    isLoading,
    error,
    updateUserRoles,
    refreshUsers: fetchUsers,
  }
}
