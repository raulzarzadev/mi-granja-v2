'use client'

import { collection, doc, getDocs, updateDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '@/lib/firebase'
import { User } from '@/types'

export interface AdminUser extends User {
  places: number
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

      const [usersSnapshot, subsSnapshot] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'subscriptions')),
      ])

      // Mapear suscripciones por userId
      const subsMap = new Map<string, number>()
      subsSnapshot.forEach((doc) => {
        const data = doc.data()
        const userId = data.userId ?? doc.id
        subsMap.set(userId, data.places ?? 0)
      })

      const usersData: AdminUser[] = []

      usersSnapshot.forEach((doc) => {
        const data = doc.data()
        usersData.push({
          id: doc.id,
          email: data.email,
          farmName: data.farmName || '',
          roles: data.roles || ['farmer'],
          createdAt: data.createdAt?.toDate() || new Date(),
          planType: data.planType,
          subscriptionStatus: data.subscriptionStatus,
          places: subsMap.get(doc.id) ?? 0,
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
