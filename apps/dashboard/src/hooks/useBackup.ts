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
          errors: [`Error al leer el archivo: ${e instanceof Error ? e.message : 'formato inválido'}`],
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
        const collections = [
          { name: 'animals', data: data.animals || [], filterFields: ['farmId'] },
          { name: 'breedingRecords', data: data.breedingRecords || [], filterFields: ['farmId'] },
          { name: 'reminders', data: data.reminders || [], filterFields: ['farmerId', 'farmId'] },
          { name: 'weightRecords', data: data.weightRecords || [], filterFields: ['farmerId'] },
          // farmInvitations se omiten en replace por seguridad
          ...(mode === 'merge'
            ? [{ name: 'farmInvitations', data: data.farmInvitations || [], filterFields: ['farmId'] }]
            : []),
        ]

        const totalSteps = collections.length + 1 // +1 para farm doc
        let currentStep = 0

        // 1. Restaurar farm doc (siempre merge, nunca se borra)
        setProgress({
          phase: 'restore',
          percent: 5,
          message: 'Restaurando datos de la granja...',
        })

        if (data.farm && typeof data.farm === 'object') {
          try {
            const farmDeserialized = deserializeFromBackup('farm', data.farm)
            // No sobreescribir id, ownerId
            const { id: _id, ownerId: _ownerId, ...farmFields } = farmDeserialized
            await setDoc(doc(db, 'farms', currentFarm.id), farmFields, { merge: true })
          } catch (e) {
            errors.push(`Error restaurando granja: ${e instanceof Error ? e.message : 'error'}`)
          }
        }
        currentStep++

        // 2. Restaurar cada colección
        for (const col of collections) {
          const pct = Math.round(((currentStep + 1) / totalSteps) * 100)
          setProgress({
            phase: 'restore',
            percent: Math.min(pct, 95),
            message: `Restaurando ${col.name} (${col.data.length} docs)...`,
          })

          try {
            // En modo replace, borrar docs existentes primero
            if (mode === 'replace') {
              await deleteCollectionDocs(col.name, col.filterFields, user.id, currentFarm.id)
            }

            // Escribir docs del backup en batches de 500
            let written = 0
            const docs = col.data as Record<string, unknown>[]

            for (let i = 0; i < docs.length; i += 500) {
              const batch = writeBatch(db)
              const chunk = docs.slice(i, i + 500)

              for (const docData of chunk) {
                const deserialized = deserializeFromBackup(col.name, { ...docData })
                const docId = deserialized.id as string
                delete deserialized.id

                if (docId) {
                  const ref = doc(db, col.name, docId)
                  if (mode === 'merge') {
                    batch.set(ref, deserialized, { merge: true })
                  } else {
                    batch.set(ref, deserialized)
                  }
                  written++
                }
              }

              await batch.commit()
            }

            counts[col.name] = written
          } catch (e) {
            errors.push(
              `Error restaurando ${col.name}: ${e instanceof Error ? e.message : 'error'}`,
            )
          }

          currentStep++
        }

        setProgress({
          phase: 'restore',
          percent: 100,
          message: 'Restauración completada',
        })

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
