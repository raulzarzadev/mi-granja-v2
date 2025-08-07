import { db } from '@/lib/firebase'
import { Farm } from '@/types'
import { RootState } from '@reduxjs/toolkit/query'
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore'
import { useCallback, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

export const useFarms = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const [farms, setFarms] = useState<Farm[]>([])
  const [currentFarm, setCurrentFarm] = useState<Farm | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadFarms = useCallback(async () => {
    if (!user) {
      setFarms([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const farmsQuery = query(
        collection(db, 'farms'),
        where('ownerId', '==', user.id),
        orderBy('createdAt', 'desc')
      )
      const snapshot = await getDocs(farmsQuery)
      const farmsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as Farm[]
      setFarms(farmsData)
      setCurrentFarm(farmsData[0] || null)
    } catch (err) {
      console.error('Error loading farms:', err)
      setError('Error al cargar las granjas.')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadFarms()
  }, [loadFarms])

  return {
    farms,
    isLoading,
    error,
    reloadFarms: loadFarms,
    currentFarm,
    setCurrentFarm
  }
}
