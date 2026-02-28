'use client'

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { useCallback, useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/features/store'
import { db } from '@/lib/firebase'
import {
  BackupFile,
  deserializeFromBackup,
  serializeForBackup,
  validateBackupFile,
  ValidationResult,
} from '@/lib/backup-serialization'

export interface BackupProgress {
  phase: string
  percent: number
  message: string
}

export interface RestoreResult {
  success: boolean
  counts: Record<string, number>
  errors: string[]
}

export function useBackup() {
  const { user } = useSelector((state: RootState) => state.auth)
  const { currentFarm } = useSelector((state: RootState) => state.farm)

  const [isExporting, setIsExporting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [progress, setProgress] = useState<BackupProgress>({
    phase: '',
    percent: 0,
    message: '',
  })

  const exportBackup = useCallback(async () => {
    if (!user?.id || !currentFarm?.id) {
      throw new Error('Usuario o granja no disponible')
    }

    setIsExporting(true)
    setProgress({ phase: 'export', percent: 0, message: 'Iniciando exportación...' })

    try {
      const exportErrors: string[] = []

      async function fetchCollection(
        colName: string,
        constraints: ReturnType<typeof where>[],
        label: string,
        percent: number,
      ) {
        setProgress({ phase: 'export', percent, message: `Exportando ${label}...` })
        try {
          const q = query(collection(db, colName), ...constraints)
          const snap = await getDocs(q)
          return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        } catch (e) {
          console.error(`Error exportando ${colName}:`, e)
          exportErrors.push(`${label}: ${e instanceof Error ? e.message : 'error'}`)
          return []
        }
      }

      // 1. Farm doc
      setProgress({ phase: 'export', percent: 10, message: 'Exportando datos de la granja...' })
      const farmDoc = await getDoc(doc(db, 'farms', currentFarm.id))
      const farmData = farmDoc.exists() ? { id: farmDoc.id, ...farmDoc.data() } : {}

      // 2. Animals — solo por farmId (igual que getFarmAnimals en useAnimalCRUD)
      const animals = await fetchCollection(
        'animals',
        [where('farmId', '==', currentFarm.id)],
        'animales',
        25,
      )

      // 3. Breeding records
      const breedingRecords = await fetchCollection(
        'breedingRecords',
        [where('farmId', '==', currentFarm.id)],
        'registros reproductivos',
        40,
      )

      // 4. Reminders
      const reminders = await fetchCollection(
        'reminders',
        [where('farmerId', '==', user.id), where('farmId', '==', currentFarm.id)],
        'recordatorios',
        55,
      )

      // 5. Weight records (solo farmerId, no tiene farmId)
      const weightRecords = await fetchCollection(
        'weightRecords',
        [where('farmerId', '==', user.id)],
        'registros de peso',
        70,
      )

      // 6. Farm invitations
      const farmInvitations = await fetchCollection(
        'farmInvitations',
        [where('farmId', '==', currentFarm.id)],
        'invitaciones',
        85,
      )

      if (exportErrors.length > 0) {
        console.warn('Errores parciales durante exportación:', exportErrors)
      }

      // Construir archivo de backup
      setProgress({ phase: 'export', percent: 95, message: 'Generando archivo...' })

      const backup: BackupFile = {
        _meta: {
          version: 1,
          exportDate: new Date().toISOString(),
          farmId: currentFarm.id,
          farmName: currentFarm.name || '',
          exportedBy: user.id,
          counts: {
            animals: animals.length,
            breedingRecords: breedingRecords.length,
            reminders: reminders.length,
            weightRecords: weightRecords.length,
            farmInvitations: farmInvitations.length,
          },
        },
        farm: serializeForBackup(farmData),
        animals: serializeForBackup(animals),
        breedingRecords: serializeForBackup(breedingRecords),
        reminders: serializeForBackup(reminders),
        weightRecords: serializeForBackup(weightRecords),
        farmInvitations: serializeForBackup(farmInvitations),
      }

      // Generar y descargar archivo
      const json = JSON.stringify(backup, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const farmSlug = (currentFarm.name || 'granja').toLowerCase().replace(/\s+/g, '-')
      const dateStr = new Date().toISOString().split('T')[0]
      const filename = `mi-granja-respaldo-${farmSlug}-${dateStr}.json`

      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setProgress({ phase: 'export', percent: 100, message: 'Respaldo descargado' })
    } finally {
      setIsExporting(false)
    }
  }, [user?.id, currentFarm?.id, currentFarm?.name])

  const parseBackupFile = useCallback(
    async (file: File): Promise<ValidationResult> => {
      if (!currentFarm?.id) {
        return {
          valid: false,
          errors: ['No hay granja seleccionada'],
          warnings: [],
          preview: null,
        }
      }

      try {
        const text = await file.text()
        const data = JSON.parse(text)
        return validateBackupFile(data, currentFarm.id)
      } catch (e) {
        return {
          valid: false,
          errors: [
            `Error al leer el archivo: ${e instanceof Error ? e.message : 'formato inválido'}`,
          ],
          warnings: [],
          preview: null,
        }
      }
    },
    [currentFarm?.id],
  )

  const restoreBackup = useCallback(
    async (data: BackupFile, mode: 'merge' | 'replace'): Promise<RestoreResult> => {
      if (!user?.id || !currentFarm?.id) {
        return { success: false, counts: {}, errors: ['Usuario o granja no disponible'] }
      }

      setIsRestoring(true)
      setProgress({ phase: 'restore', percent: 0, message: 'Iniciando restauración...' })

      const counts: Record<string, number> = {}
      const errors: string[] = []

      try {
        // --- Paso 1: Restaurar farm doc (siempre merge, nunca se borra) ---
        setProgress({ phase: 'restore', percent: 5, message: 'Restaurando datos de la granja...' })

        if (data.farm && typeof data.farm === 'object') {
          try {
            const farmDeserialized = deserializeFromBackup('farm', data.farm)
            const {
              id: _id,
              ownerId: _ownerId,
              collaborators: _collaborators,
              collaboratorsIds: _collaboratorsIds,
              collaboratorsEmails: _collaboratorsEmails,
              ...farmFields
            } = farmDeserialized
            await setDoc(doc(db, 'farms', currentFarm.id), farmFields, { merge: true })
          } catch (e) {
            errors.push(`Error restaurando granja: ${e instanceof Error ? e.message : 'error'}`)
          }
        }

        // --- Paso 2: En modo replace, borrar docs existentes ---
        if (mode === 'replace') {
          setProgress({ phase: 'restore', percent: 10, message: 'Eliminando datos existentes...' })
          const deletions: [string, string[], string][] = [
            ['animals', ['farmId'], 'animales'],
            ['breedingRecords', ['farmId'], 'registros reproductivos'],
            ['reminders', ['farmerId', 'farmId'], 'recordatorios'],
            ['weightRecords', ['farmerId'], 'registros de peso'],
          ]
          for (const [colName, filterFields, label] of deletions) {
            try {
              await deleteCollectionDocs(colName, filterFields, user.id, currentFarm.id)
            } catch (e) {
              errors.push(`Error borrando ${label}: ${e instanceof Error ? e.message : 'error'}`)
            }
          }
        }

        // --- Paso 3: Generar nuevos IDs para animales y construir mapa oldId → newId ---
        setProgress({ phase: 'restore', percent: 20, message: 'Preparando animales...' })
        const animalIdMap = new Map<string, string>()
        const backupAnimals = (data.animals || []) as Record<string, unknown>[]

        for (const animal of backupAnimals) {
          const oldId = animal.id as string
          if (oldId) {
            const newRef = doc(collection(db, 'animals'))
            animalIdMap.set(oldId, newRef.id)
          }
        }

        // Helper: remapear un ID de animal usando el mapa
        function remapAnimalId(id: unknown): unknown {
          if (typeof id === 'string' && animalIdMap.has(id)) {
            return animalIdMap.get(id)
          }
          return id
        }

        // Helper: asignar ownership de la granja/usuario actual
        function assignOwnership(docData: Record<string, unknown>): Record<string, unknown> {
          const result = { ...docData }
          if ('farmId' in result) result.farmId = currentFarm!.id
          if ('farmerId' in result) result.farmerId = user!.id
          return result
        }

        // --- Paso 4: Escribir animales con nuevos IDs y referencias remapeadas ---
        setProgress({
          phase: 'restore',
          percent: 30,
          message: `Restaurando animales (${backupAnimals.length})...`,
        })

        try {
          let written = 0
          for (let i = 0; i < backupAnimals.length; i += 500) {
            const batch = writeBatch(db)
            const chunk = backupAnimals.slice(i, i + 500)

            for (const rawDoc of chunk) {
              const deserialized = deserializeFromBackup('animals', { ...rawDoc })
              const oldId = deserialized.id as string
              delete deserialized.id

              const remapped = assignOwnership(deserialized)

              // Remapear referencias parentales
              if (remapped.motherId) remapped.motherId = remapAnimalId(remapped.motherId)
              if (remapped.fatherId) remapped.fatherId = remapAnimalId(remapped.fatherId)

              const newId = animalIdMap.get(oldId)
              if (newId) {
                batch.set(doc(db, 'animals', newId), remapped)
                written++
              }
            }

            await batch.commit()
          }
          counts.animals = written
        } catch (e) {
          errors.push(`Error restaurando animales: ${e instanceof Error ? e.message : 'error'}`)
        }

        // --- Paso 5: Escribir breeding records con referencias remapeadas ---
        const backupBreedings = (data.breedingRecords || []) as Record<string, unknown>[]
        setProgress({
          phase: 'restore',
          percent: 50,
          message: `Restaurando registros reproductivos (${backupBreedings.length})...`,
        })

        try {
          let written = 0
          for (let i = 0; i < backupBreedings.length; i += 500) {
            const batch = writeBatch(db)
            const chunk = backupBreedings.slice(i, i + 500)

            for (const rawDoc of chunk) {
              const deserialized = deserializeFromBackup('breedingRecords', { ...rawDoc })
              delete deserialized.id

              const remapped = assignOwnership(deserialized)

              // Remapear maleId
              if (remapped.maleId) remapped.maleId = remapAnimalId(remapped.maleId)

              // Remapear femaleBreedingInfo
              if (Array.isArray(remapped.femaleBreedingInfo)) {
                remapped.femaleBreedingInfo = (
                  remapped.femaleBreedingInfo as Record<string, unknown>[]
                ).map((info) => {
                  const remappedInfo = { ...info }
                  if (remappedInfo.femaleId) {
                    remappedInfo.femaleId = remapAnimalId(remappedInfo.femaleId)
                  }
                  if (Array.isArray(remappedInfo.offspring)) {
                    remappedInfo.offspring = (remappedInfo.offspring as string[]).map(
                      (id) => remapAnimalId(id) as string,
                    )
                  }
                  return remappedInfo
                })
              }

              const newRef = doc(collection(db, 'breedingRecords'))
              batch.set(newRef, remapped)
              written++
            }

            await batch.commit()
          }
          counts.breedingRecords = written
        } catch (e) {
          errors.push(
            `Error restaurando registros reproductivos: ${e instanceof Error ? e.message : 'error'}`,
          )
        }

        // --- Paso 6: Escribir reminders (animalNumber se mantiene, no es un doc ID) ---
        const backupReminders = (data.reminders || []) as Record<string, unknown>[]
        setProgress({
          phase: 'restore',
          percent: 70,
          message: `Restaurando recordatorios (${backupReminders.length})...`,
        })

        try {
          let written = 0
          for (let i = 0; i < backupReminders.length; i += 500) {
            const batch = writeBatch(db)
            const chunk = backupReminders.slice(i, i + 500)

            for (const rawDoc of chunk) {
              const deserialized = deserializeFromBackup('reminders', { ...rawDoc })
              delete deserialized.id
              const remapped = assignOwnership(deserialized)

              const newRef = doc(collection(db, 'reminders'))
              batch.set(newRef, remapped)
              written++
            }

            await batch.commit()
          }
          counts.reminders = written
        } catch (e) {
          errors.push(
            `Error restaurando recordatorios: ${e instanceof Error ? e.message : 'error'}`,
          )
        }

        // --- Paso 7: Escribir weight records ---
        const backupWeights = (data.weightRecords || []) as Record<string, unknown>[]
        setProgress({
          phase: 'restore',
          percent: 85,
          message: `Restaurando registros de peso (${backupWeights.length})...`,
        })

        try {
          let written = 0
          for (let i = 0; i < backupWeights.length; i += 500) {
            const batch = writeBatch(db)
            const chunk = backupWeights.slice(i, i + 500)

            for (const rawDoc of chunk) {
              const deserialized = deserializeFromBackup('weightRecords', { ...rawDoc })
              delete deserialized.id
              const remapped = assignOwnership(deserialized)

              const newRef = doc(collection(db, 'weightRecords'))
              batch.set(newRef, remapped)
              written++
            }

            await batch.commit()
          }
          counts.weightRecords = written
        } catch (e) {
          errors.push(
            `Error restaurando registros de peso: ${e instanceof Error ? e.message : 'error'}`,
          )
        }

        // --- Paso 8: Farm invitations (solo en merge) ---
        if (mode === 'merge' && data.farmInvitations?.length) {
          setProgress({
            phase: 'restore',
            percent: 93,
            message: `Restaurando invitaciones (${data.farmInvitations.length})...`,
          })

          try {
            let written = 0
            const backupInvitations = data.farmInvitations as Record<string, unknown>[]

            for (let i = 0; i < backupInvitations.length; i += 500) {
              const batch = writeBatch(db)
              const chunk = backupInvitations.slice(i, i + 500)

              for (const rawDoc of chunk) {
                const deserialized = deserializeFromBackup('farmInvitations', { ...rawDoc })
                delete deserialized.id
                const remapped = assignOwnership(deserialized)

                const newRef = doc(collection(db, 'farmInvitations'))
                batch.set(newRef, remapped)
                written++
              }

              await batch.commit()
            }
            counts.farmInvitations = written
          } catch (e) {
            errors.push(
              `Error restaurando invitaciones: ${e instanceof Error ? e.message : 'error'}`,
            )
          }
        }

        setProgress({ phase: 'restore', percent: 100, message: 'Restauración completada' })

        return {
          success: errors.length === 0,
          counts,
          errors,
        }
      } finally {
        setIsRestoring(false)
      }
    },
    [user?.id, currentFarm?.id],
  )

  return {
    exportBackup,
    parseBackupFile,
    restoreBackup,
    isExporting,
    isRestoring,
    progress,
  }
}

/**
 * Borra todos los docs de una colección filtrados por farmerId/farmId
 */
async function deleteCollectionDocs(
  collectionName: string,
  filterFields: string[],
  userId: string,
  farmId: string,
) {
  const constraints = []
  if (filterFields.includes('farmerId')) {
    constraints.push(where('farmerId', '==', userId))
  }
  if (filterFields.includes('farmId')) {
    constraints.push(where('farmId', '==', farmId))
  }

  const q = query(collection(db, collectionName), ...constraints)
  const snapshot = await getDocs(q)

  // Borrar en batches de 500
  const docs = snapshot.docs
  for (let i = 0; i < docs.length; i += 500) {
    const batch = writeBatch(db)
    const chunk = docs.slice(i, i + 500)
    for (const docSnap of chunk) {
      batch.delete(docSnap.ref)
    }
    await batch.commit()
  }
}
