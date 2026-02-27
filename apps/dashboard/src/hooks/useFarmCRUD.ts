'use client'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '@/features/store'
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Farm, FarmArea } from '@/types/farm'
import {
  setLoading,
  setError,
  setFarms,
  setMyFarms,
  setInvitationFarms,
  addFarm,
  updateFarm as updateFarmState,
  removeFarm,
  setCurrentFarm,
  addAreaToFarm,
  updateAreaInFarm,
  removeAreaFromFarm,
  addCollaboratorToFarm,
  updateCollaboratorInFarm,
  removeCollaboratorFromFarm
} from '@/features/farm/farmSlice'
import { serializeObj } from '@/features/libs/serializeObj'
import { FarmCollaborator } from '@/types/collaborators'

export const useFarmCRUD = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.auth)
  const { farms, currentFarm, isLoading, error, myFarms, invitationFarms } =
    useSelector((state: RootState) => state.farm)
  // Cargar granjas del usuario
  const loadUserFarms = async () => {
    if (!user) {
      dispatch(setMyFarms([]))
      dispatch(setInvitationFarms([]))
      dispatch(setFarms([]))
      return
    }

    dispatch(setLoading(true))

    try {
      // 1) Granjas donde es propietario
      const ownerQuery = query(
        collection(db, 'farms'),
        where('ownerId', '==', user.id)
      )
      const ownerSnapshot = await getDocs(ownerQuery)
      const ownerFarms = ownerSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        areas: doc.data().areas || [],
        collaborators: doc.data().collaborators || [],
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as Farm[]
      // 2) Invitaciones (aceptadas o pendientes) para el email del usuario
      const invitationsQuery = query(
        collection(db, 'farmInvitations'),
        where('email', '==', user.email)
      )
      const invitationsSnap = await getDocs(invitationsQuery)
      const invitations = invitationsSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any)
      })) as any[]

      // Solo podemos leer farms de invitaciones aceptadas; las pendientes/revoked no tienen permiso de lectura
      const invitationFarmIds = Array.from(
        new Set(
          invitations
            .filter((d) => d.status === 'accepted')
            .map((d) => d.farmId)
            .filter(Boolean)
        )
      ) as string[]

      let memberFarms: Farm[] = []
      if (invitationFarmIds.length > 0) {
        const batches: string[][] = []
        for (let i = 0; i < invitationFarmIds.length; i += 10) {
          batches.push(invitationFarmIds.slice(i, i + 10))
        }
        const batchResults = await Promise.all(
          batches.map(async (ids) => {
            const qFarms = query(
              collection(db, 'farms'),
              where('__name__', 'in', ids as any)
            )
            const snap = await getDocs(qFarms)
            return snap.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
              areas: doc.data().areas || [],
              collaborators: doc.data().collaborators || [],
              createdAt: doc.data().createdAt?.toDate() || new Date(),
              updatedAt: doc.data().updatedAt?.toDate() || new Date()
            })) as Farm[]
          })
        )
        memberFarms = batchResults.flat()
      }

      // Enriquecer memberFarms con invitationMeta
      const invitationByFarm = new Map<string, any[]>()
      invitations.forEach((inv) => {
        if (!inv.farmId) return
        if (!invitationByFarm.has(inv.farmId))
          invitationByFarm.set(inv.farmId, [])
        invitationByFarm.get(inv.farmId)!.push(inv)
      })

      memberFarms = memberFarms.map((f) => {
        const invs = invitationByFarm.get(f.id) || []
        // Preferir invitación aceptada si existe, si no la más reciente
        const chosen = invs.find((i) => i.status === 'accepted') || invs[0]
        if (chosen) {
          return {
            ...f,
            invitationMeta: {
              invitationId: chosen.id,
              status: chosen.status,
              role: chosen.role
            }
          }
        }
        return f
      })

      // 3) Unificar y deduplicar por id
      const byId = new Map<string, Farm>()
      ;[...memberFarms, ...ownerFarms].forEach((f) => byId.set(f.id, f))
      const allFarms = Array.from(byId.values())
      dispatch(serializeObj(setMyFarms(ownerFarms)))
      dispatch(serializeObj(setInvitationFarms(memberFarms)))
      dispatch(serializeObj(setFarms(allFarms)))

      // Restaurar última selección si aplica
      try {
        if (typeof window !== 'undefined') {
          const lastId = localStorage.getItem('last_farm_id')
          if (lastId && allFarms.some((f) => f.id === lastId)) {
            dispatch(setCurrentFarm(lastId))
          } else if (!currentFarm && allFarms.length > 0) {
            dispatch(setCurrentFarm(allFarms[0].id))
          }
        }
      } catch (e) {
        console.warn('No se pudo restaurar last_farm_id', e)
      }
    } catch (err) {
      console.error('Error loading farms:', err)
      dispatch(setError('Error al cargar las granjas'))
    } finally {
      dispatch(setLoading(false))
    }
  }

  // Crear nueva granja
  const createFarm = async (
    farmData: Omit<
      Farm,
      'id' | 'ownerId' | 'areas' | 'collaborators' | 'createdAt' | 'updatedAt'
    >
  ) => {
    if (!user) throw new Error('Usuario no autenticado')

    const newFarmData = {
      ...farmData,
      ownerId: user.id,
      areas: [],
      collaborators: [],
      collaboratorsIds: [],
      collaboratorsEmails: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }

    try {
      const docRef = await addDoc(collection(db, 'farms'), newFarmData)
      const createdFarm: Farm = {
        id: docRef.id,
        ...farmData,
        ownerId: user.id,
        areas: [],
        collaborators: [],
        // Los siguientes arrays no forman parte del tipo Farm actual, pero existen en Firestore para reglas.
        // Se mantienen fuera del tipo para no romper UI; son usados solo por reglas.
        createdAt: new Date(),
        updatedAt: new Date()
      }

      dispatch(serializeObj(addFarm(createdFarm)))
      return createdFarm
    } catch (error) {
      console.error('Error creating farm:', error)
      dispatch(setError('Error al crear la granja'))
      throw error
    }
  }

  // Actualizar granja
  const updateFarm = async (
    farmId: string,
    updates: Partial<Omit<Farm, 'id' | 'ownerId' | 'createdAt'>>
  ) => {
    try {
      const farmRef = doc(db, 'farms', farmId)
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now()
      }

      await updateDoc(farmRef, updateData)
      dispatch(
        serializeObj(
          updateFarmState({
            id: farmId,
            updates: { ...updates, updatedAt: new Date() }
          })
        )
      )
    } catch (error) {
      console.error('Error updating farm:', error)
      dispatch(setError('Error al actualizar la granja'))
      throw error
    }
  }

  // Eliminar granja
  const deleteFarm = async (farmId: string) => {
    try {
      await deleteDoc(doc(db, 'farms', farmId))
      dispatch(serializeObj(removeFarm(farmId)))
    } catch (error) {
      console.error('Error deleting farm:', error)
      dispatch(setError('Error al eliminar la granja'))
      throw error
    }
  }

  // Cambiar granja actual
  const switchFarm = (farmId: string) => {
    dispatch(setCurrentFarm(farmId))
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('last_farm_id', farmId)
      }
    } catch (e) {
      console.warn('No se pudo guardar last_farm_id', e)
    }
  }

  // Cargar una granja por ID (aunque no seas owner) y cambiar contexto
  const loadAndSwitchFarm = async (farmId: string) => {
    try {
      // Si ya está cargada, solo cambiar
      const existing = farms.find((f) => f.id === farmId)
      if (existing) {
        dispatch(setCurrentFarm(farmId))
        return existing
      }

      // Validar acceso: owner o invitación aceptada
      if (!user) throw new Error('No autenticado')
      const ownerCheck = await getDocs(
        query(
          collection(db, 'farms'),
          where('__name__', '==', farmId),
          where('ownerId', '==', user.id)
        )
      )
      let hasAccess = !ownerCheck.empty
      if (!hasAccess) {
        // Buscar invitación aceptada
        const invSnap = await getDocs(
          query(
            collection(db, 'farmInvitations'),
            where('farmId', '==', farmId),
            where('userId', '==', user.id),
            where('status', '==', 'accepted')
          )
        )
        hasAccess = !invSnap.empty
        if (!hasAccess) {
          throw new Error(
            'Debes aceptar la invitación antes de acceder a esta granja'
          )
        }
      }

      const farmDoc = await getDocs(
        query(collection(db, 'farms'), where('__name__', '==', farmId))
      )
      if (farmDoc.empty) throw new Error('Granja no encontrada')
      const d = farmDoc.docs[0]
      const farm = {
        id: d.id,
        ...d.data(),
        areas: d.data().areas || [],
        collaborators: d.data().collaborators || [],
        createdAt: d.data().createdAt?.toDate() || new Date(),
        updatedAt: d.data().updatedAt?.toDate() || new Date()
      } as Farm

      // Añadir y seleccionar
      dispatch(serializeObj(addFarm(farm)))
      dispatch(setCurrentFarm(farmId))
      return farm
    } catch (error) {
      console.error('Error cargando granja por ID:', error)
      throw error
    }
  }

  // OPERACIONES DE ÁREAS

  // Crear nueva área
  const createArea = async (
    farmId: string,
    areaData: Omit<FarmArea, 'id' | 'farmId' | 'createdAt' | 'updatedAt'>
  ) => {
    const newArea: FarmArea = {
      id: `area_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      farmId,
      ...areaData,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    try {
      const farmRef = doc(db, 'farms', farmId)
      await updateDoc(farmRef, {
        areas: arrayUnion(newArea),
        updatedAt: Timestamp.now()
      })

      dispatch(serializeObj(addAreaToFarm({ farmId, area: newArea })))
      return newArea
    } catch (error) {
      console.error('Error creating area:', error)
      dispatch(setError('Error al crear el área'))
      throw error
    }
  }

  // Actualizar área
  const updateArea = async (
    farmId: string,
    areaId: string,
    updates: Partial<FarmArea>
  ) => {
    try {
      const farm = farms.find((f) => f.id === farmId)
      if (!farm) throw new Error('Granja no encontrada')
      const farmAreas = farm?.areas || []
      const areaIndex = farmAreas.findIndex((a) => a.id === areaId)
      if (areaIndex === -1) throw new Error('Área no encontrada')

      const updatedAreas = [...farmAreas]
      updatedAreas[areaIndex] = {
        ...updatedAreas[areaIndex],
        ...updates,
        updatedAt: new Date()
      }

      const farmRef = doc(db, 'farms', farmId)
      await updateDoc(farmRef, {
        areas: updatedAreas,
        updatedAt: Timestamp.now()
      })

      dispatch(
        updateAreaInFarm({
          farmId,
          areaId,
          updates: { ...updates, updatedAt: new Date() }
        })
      )
    } catch (error) {
      console.error('Error updating area:', error)
      dispatch(setError('Error al actualizar el área'))
      throw error
    }
  }

  // Eliminar área
  const deleteArea = async (farmId: string, areaId: string) => {
    try {
      const farm = farms.find((f) => f.id === farmId)
      if (!farm) throw new Error('Granja no encontrada')
      const farmAreas = farm?.areas || []

      const areaToRemove = farmAreas.find((a) => a.id === areaId)
      if (!areaToRemove) throw new Error('Área no encontrada')

      const farmRef = doc(db, 'farms', farmId)
      await updateDoc(farmRef, {
        areas: arrayRemove(areaToRemove),
        updatedAt: Timestamp.now()
      })

      dispatch(removeAreaFromFarm({ farmId, areaId }))
    } catch (error) {
      console.error('Error deleting area:', error)
      dispatch(setError('Error al eliminar el área'))
      throw error
    }
  }

  // OPERACIONES DE COLABORADORES

  // Agregar colaborador
  const addCollaborator = async (
    farmId: string,
    collaboratorData: Omit<
      FarmCollaborator,
      'id' | 'farmId' | 'createdAt' | 'updatedAt'
    >
  ) => {
    const newCollaborator: FarmCollaborator = {
      id: `collaborator_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      farmId,
      ...collaboratorData,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    try {
      const farmRef = doc(db, 'farms', farmId)
      await updateDoc(farmRef, {
        collaborators: arrayUnion(newCollaborator),
        updatedAt: Timestamp.now()
      })

      dispatch(addCollaboratorToFarm({ farmId, collaborator: newCollaborator }))
      return newCollaborator
    } catch (error) {
      console.error('Error adding collaborator:', error)
      dispatch(setError('Error al agregar colaborador'))
      throw error
    }
  }

  // Actualizar colaborador
  const updateCollaborator = async (
    farmId: string,
    collaboratorId: string,
    updates: Partial<FarmCollaborator>
  ) => {
    try {
      const farm = farms.find((f) => f.id === farmId)
      if (!farm?.collaborators)
        throw new Error('Granja o colaboradores no encontrados')

      const collaboratorIndex = farm.collaborators.findIndex(
        (c) => c.id === collaboratorId
      )
      if (collaboratorIndex === -1) throw new Error('Colaborador no encontrado')

      const updatedCollaborators = [...farm.collaborators]
      updatedCollaborators[collaboratorIndex] = {
        ...updatedCollaborators[collaboratorIndex],
        ...updates,
        updatedAt: new Date()
      }

      const farmRef = doc(db, 'farms', farmId)
      await updateDoc(farmRef, {
        collaborators: updatedCollaborators,
        updatedAt: Timestamp.now()
      })

      dispatch(
        updateCollaboratorInFarm({
          farmId,
          collaboratorId,
          updates: { ...updates, updatedAt: new Date() }
        })
      )
    } catch (error) {
      console.error('Error updating collaborator:', error)
      dispatch(setError('Error al actualizar colaborador'))
      throw error
    }
  }

  // Eliminar colaborador
  const removeCollaborator = async (farmId: string, collaboratorId: string) => {
    try {
      const farm = farms.find((f) => f.id === farmId)
      if (!farm?.collaborators)
        throw new Error('Granja o colaboradores no encontrados')

      const collaboratorToRemove = farm.collaborators.find(
        (c) => c.id === collaboratorId
      )
      if (!collaboratorToRemove) throw new Error('Colaborador no encontrado')

      const farmRef = doc(db, 'farms', farmId)
      await updateDoc(farmRef, {
        collaborators: arrayRemove(collaboratorToRemove),
        updatedAt: Timestamp.now()
      })

      dispatch(removeCollaboratorFromFarm({ farmId, collaboratorId }))
    } catch (error) {
      console.error('Error removing collaborator:', error)
      dispatch(setError('Error al eliminar colaborador'))
      throw error
    }
  }

  // Funciones de utilidad para estadísticas
  const getAreaStats = (farmId?: string) => {
    const targetFarm = farmId ? farms.find((f) => f.id === farmId) : currentFarm
    if (!targetFarm) return { total: 0, active: 0, inactive: 0, byType: {} }
    const farmAreas = targetFarm?.areas || []
    const stats = {
      total: farmAreas.length,
      active: farmAreas.filter((a) => a.isActive).length,
      inactive: farmAreas.filter((a) => !a.isActive).length,
      byType: {} as Record<string, number>
    }

    farmAreas.forEach((area) => {
      stats.byType[area.type] = (stats.byType[area.type] || 0) + 1
    })

    return stats
  }

  const getCollaboratorStats = (farmId?: string) => {
    const targetFarm = farmId ? farms.find((f) => f.id === farmId) : currentFarm
    if (!targetFarm?.collaborators) return { total: 0, active: 0, byRole: {} }

    const collaborators = targetFarm.collaborators
    const activeCollaborators = collaborators.filter((c) => c.isActive)

    const stats = {
      total: activeCollaborators.length,
      active: activeCollaborators.length,
      byRole: {} as Record<string, number>
    }

    activeCollaborators.forEach((collaborator) => {
      stats.byRole[collaborator.role] =
        (stats.byRole[collaborator.role] || 0) + 1
    })

    return stats
  }

  return {
    // Estado
    farms,
    myFarms,
    invitationFarms,
    currentFarm,
    isLoading,
    error,

    // Operaciones de granja
    createFarm,
    updateFarm,
    deleteFarm,
    switchFarm,
    loadAndSwitchFarm,

    loadUserFarms,

    // Operaciones de áreas
    createArea,
    updateArea,
    deleteArea,

    // Operaciones de colaboradores
    addCollaborator,
    updateCollaborator,
    removeCollaborator,

    // Utilidades
    getAreaStats,
    getCollaboratorStats
  }
}
