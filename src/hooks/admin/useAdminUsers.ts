'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { User } from '@/types'

interface UseAdminUsersReturn {
  users: User[]
  isLoading: boolean
  error: string | null
  updateUserRoles: (userId: string, newRoles: string[]) => Promise<void>
  refreshUsers: () => Promise<void>
}

export const useAdminUsers = (): UseAdminUsersReturn => {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const usersSnapshot = await getDocs(collection(db, 'users'))
      const usersData: User[] = []

      usersSnapshot.forEach((doc) => {
        const data = doc.data()
        usersData.push({
          id: doc.id,
          email: data.email,
          farmName: data.farmName || '',
          roles: data.roles || ['farmer'],
          createdAt: data.createdAt?.toDate() || new Date()
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
        updatedAt: new Date()
      })

      // Actualizar el estado local
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? { ...user, roles: newRoles as ('admin' | 'farmer' | 'vet')[] }
            : user
        )
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
    refreshUsers: fetchUsers
  }
}
