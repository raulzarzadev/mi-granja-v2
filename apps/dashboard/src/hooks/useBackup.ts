'use client'

import {
  arrayUnion,
  collection,
  DocumentReference,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { useCallback, useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/features/store'
import { trackExportRequested } from '@/lib/analytics/track'
import {
  BACKUP_TYPE_DESCRIPTIONS,
  BackupFile,
  CURRENT_BACKUP_VERSION,
  deserializeFromBackup,
  normalizeBackupFile,
  prepareAnimalForRestore,
  prepareBreedingForRestore,
  serializeForBackup,
  stripUndefined,
  ValidationResult,
  validateBackupFile,
} from '@/lib/backup-serialization'
import { db } from '@/lib/firebase'

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

interface PlannedWrite {
  ref: DocumentReference
  data: Record<string, unknown>
}

const RESTORE_BATCH_SIZE = 450

async function commitWrites(
  writes: PlannedWrite[],
  onProgress?: (written: number) => void,
): Promise<void> {
  let written = 0
  for (let index = 0; index < writes.length; index += RESTORE_BATCH_SIZE) {
    const batch = writeBatch(db)
    const chunk = writes.slice(index, index + RESTORE_BATCH_SIZE)
    chunk.forEach(({ ref, data }) => {
      batch.set(ref, stripUndefined(data))
    })
    await batch.commit()
    written += chunk.length
    onProgress?.(written)
  }
}

async function deleteDocuments(refs: DocumentReference[]): Promise<void> {
  for (let index = 0; index < refs.length; index += RESTORE_BATCH_SIZE) {
    const batch = writeBatch(db)
    refs.slice(index, index + RESTORE_BATCH_SIZE).forEach((ref) => {
      batch.delete(ref)
    })
    await batch.commit()
  }
}

function remapId(value: unknown, map: Map<string, string>): unknown {
  if (value === null || value === undefined || value === '') return value
  return typeof value === 'string' ? map.get(value) : undefined
}

function sanitizeFarmForRestore(value: Record<string, unknown>): Record<string, unknown> {
  const farm = { ...value }
  ;[
    'id',
    'name',
    'ownerId',
    'collaborators',
    'collaboratorsIds',
    'collaboratorsEmails',
    'invitationMeta',
    'deletedAt',
    'scheduledDeletionAt',
    'exportedBackups',
    'restoredBackups',
    'createdAt',
    'updatedAt',
  ].forEach((field) => {
    delete farm[field]
  })
  return farm
}

export function useBackup() {
  const { user } = useSelector((state: RootState) => state.auth)
  const { currentFarm } = useSelector((state: RootState) => state.farm)
  const [isExporting, setIsExporting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [progress, setProgress] = useState<BackupProgress>({ phase: '', percent: 0, message: '' })

  const exportBackup = useCallback(async () => {
    if (!user?.id || !currentFarm?.id) throw new Error('Usuario o granja no disponible')
    setIsExporting(true)
    trackExportRequested({ data_type: 'farm_backup' })
    setProgress({ phase: 'export', percent: 0, message: 'Iniciando exportación...' })

    async function fetchFarmCollection(
      collectionName: string,
      label: string,
      percent: number,
    ): Promise<Record<string, unknown>[]> {
      setProgress({ phase: 'export', percent, message: `Exportando ${label}...` })
      try {
        const snapshot = await getDocs(
          query(collection(db, collectionName), where('farmId', '==', currentFarm!.id)),
        )
        return snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() }))
      } catch (error) {
        throw new Error(
          `No se pudo exportar ${label}: ${error instanceof Error ? error.message : 'error desconocido'}`,
        )
      }
    }

    try {
      setProgress({ phase: 'export', percent: 5, message: 'Exportando datos de la granja...' })
      const farmSnapshot = await getDoc(doc(db, 'farms', currentFarm.id))
      if (!farmSnapshot.exists()) throw new Error('La granja seleccionada ya no existe')
      const farm = { id: farmSnapshot.id, ...farmSnapshot.data() }

      const animals = await fetchFarmCollection('animals', 'animales y sus registros', 20)
      const breedingRecords = await fetchFarmCollection(
        'breedingRecords',
        'registros reproductivos',
        40,
      )
      const reminders = await fetchFarmCollection('reminders', 'recordatorios', 55)
      const invitations = await fetchFarmCollection('farmInvitations', 'invitaciones', 70)
      const farmInvitations = invitations.filter(
        (invitation) => !invitation.status || invitation.status === 'pending',
      )
      const sales = await fetchFarmCollection('sales', 'ventas', 85)
      const animalRecords = animals.reduce(
        (total, animal) => total + (Array.isArray(animal.records) ? animal.records.length : 0),
        0,
      )

      const backup = normalizeBackupFile({
        _meta: {
          version: CURRENT_BACKUP_VERSION,
          exportDate: new Date().toISOString(),
          farmId: currentFarm.id,
          farmName: currentFarm.name || '',
          exportedBy: user.id,
          counts: {
            animals: animals.length,
            animalRecords,
            breedingRecords: breedingRecords.length,
            reminders: reminders.length,
            farmInvitations: farmInvitations.length,
            sales: sales.length,
          },
        },
        _types: BACKUP_TYPE_DESCRIPTIONS,
        farm: serializeForBackup(farm),
        animals: serializeForBackup(animals),
        breedingRecords: serializeForBackup(breedingRecords),
        reminders: serializeForBackup(reminders),
        farmInvitations: serializeForBackup(farmInvitations),
        sales: serializeForBackup(sales),
      })
      const validation = validateBackupFile(backup, currentFarm.id)
      if (!validation.valid || !validation.data) {
        throw new Error(`El respaldo generado no es válido: ${validation.errors.join('. ')}`)
      }

      setProgress({ phase: 'export', percent: 95, message: 'Generando archivo...' })
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const farmSlug = (currentFarm.name || 'granja').toLowerCase().replace(/\s+/g, '-')
      const filename = `mi-granja-respaldo-${farmSlug}-${new Date().toISOString().slice(0, 10)}.json`
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)

      try {
        await updateDoc(doc(db, 'farms', currentFarm.id), {
          exportedBackups: arrayUnion({
            createdAt: Timestamp.now(),
            fileName: filename,
            counts: backup._meta.counts,
          }),
        })
      } catch (error) {
        console.warn('El respaldo se descargó, pero no se actualizó su historial:', error)
      }
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
          data: null,
        }
      }
      try {
        return validateBackupFile(JSON.parse(await file.text()), currentFarm.id)
      } catch (error) {
        return {
          valid: false,
          errors: [
            `Error al leer el archivo: ${error instanceof Error ? error.message : 'formato inválido'}`,
          ],
          warnings: [],
          preview: null,
          data: null,
        }
      }
    },
    [currentFarm?.id],
  )

  const restoreBackup = useCallback(
    async (input: BackupFile, mode: 'merge' | 'replace'): Promise<RestoreResult> => {
      if (!user?.id || !currentFarm?.id) {
        return { success: false, counts: {}, errors: ['Usuario o granja no disponible'] }
      }
      setIsRestoring(true)
      setProgress({ phase: 'restore', percent: 0, message: 'Validando respaldo...' })
      const counts: Record<string, number> = {}

      try {
        const validation = validateBackupFile(input, currentFarm.id)
        if (!validation.valid || !validation.data) {
          return { success: false, counts, errors: validation.errors }
        }
        const data = normalizeBackupFile(validation.data)
        const existingAnimalsSnapshot = await getDocs(
          query(collection(db, 'animals'), where('farmId', '==', currentFarm.id)),
        )
        if (mode === 'merge') {
          const existingNumbers = new Set(
            existingAnimalsSnapshot.docs.map((animalDoc) => String(animalDoc.data().animalNumber)),
          )
          const duplicates = data.animals
            .map((animal) => String(animal.animalNumber))
            .filter((number) => existingNumbers.has(number))
          if (duplicates.length > 0) {
            return {
              success: false,
              counts,
              errors: [
                `No se puede combinar: ya existen los animales ${[...new Set(duplicates)].join(', ')}. Usa Reemplazar o corrige sus números.`,
              ],
            }
          }
        }

        setProgress({ phase: 'restore', percent: 10, message: 'Preparando referencias...' })
        const animalIdMap = new Map<string, string>()
        const breedingIdMap = new Map<string, string>()
        const areaIdMap = new Map<string, string>()
        data.animals.forEach((animal) => {
          if (typeof animal.id === 'string') {
            const newId = doc(collection(db, 'animals')).id
            animalIdMap.set(animal.id, newId)
            if (typeof animal.animalNumber === 'string' && !animalIdMap.has(animal.animalNumber)) {
              animalIdMap.set(animal.animalNumber, newId)
            }
          }
        })
        data.breedingRecords.forEach((breeding) => {
          if (typeof breeding.id === 'string') {
            breedingIdMap.set(breeding.id, doc(collection(db, 'breedingRecords')).id)
          }
        })
        const sourceFarm = deserializeFromBackup('farm', data.farm)
        const sourceAreas = Array.isArray(sourceFarm.areas)
          ? (sourceFarm.areas as Record<string, unknown>[])
          : []
        sourceAreas.forEach((area) => {
          if (typeof area.id === 'string') {
            areaIdMap.set(area.id, mode === 'replace' ? area.id : crypto.randomUUID())
          }
        })

        const animalWrites: PlannedWrite[] = data.animals.map((rawAnimal) => {
          const deserialized = deserializeFromBackup('animals', rawAnimal)
          const oldId = String(deserialized.id)
          const animal = prepareAnimalForRestore(
            deserialized,
            animalIdMap,
            breedingIdMap,
            areaIdMap,
            currentFarm.id,
            user.id,
          )
          return { ref: doc(db, 'animals', animalIdMap.get(oldId)!), data: animal }
        })

        const breedingWrites: PlannedWrite[] = data.breedingRecords.map((rawBreeding) => {
          const deserialized = deserializeFromBackup('breedingRecords', rawBreeding)
          const oldId = String(deserialized.id)
          const breeding = prepareBreedingForRestore(
            deserialized,
            animalIdMap,
            currentFarm.id,
            user.id,
          )
          return { ref: doc(db, 'breedingRecords', breedingIdMap.get(oldId)!), data: breeding }
        })

        const reminderWrites: PlannedWrite[] = data.reminders.map((rawReminder) => {
          const reminder = deserializeFromBackup('reminders', rawReminder)
          delete reminder.id
          reminder.farmId = currentFarm.id
          reminder.farmerId = user.id
          if (Array.isArray(reminder.assigneeIds) && reminder.assigneeIds.length > 0) {
            reminder.assigneeIds = [user.id]
          }
          return { ref: doc(collection(db, 'reminders')), data: reminder }
        })

        const saleWrites: PlannedWrite[] = data.sales.map((rawSale) => {
          const sale = deserializeFromBackup('sales', rawSale)
          delete sale.id
          sale.farmId = currentFarm.id
          sale.farmerId = user.id
          if (Array.isArray(sale.animals)) {
            sale.animals = sale.animals.map((rawAnimal) => {
              const animal = { ...(rawAnimal as Record<string, unknown>) }
              animal.animalId = remapId(animal.animalId, animalIdMap)
              return animal
            })
          }
          return { ref: doc(collection(db, 'sales')), data: sale }
        })

        const existingInvitationsSnapshot = await getDocs(
          query(collection(db, 'farmInvitations'), where('farmId', '==', currentFarm.id)),
        )
        const existingPendingEmails = new Set(
          existingInvitationsSnapshot.docs
            .filter((snapshotDoc) => snapshotDoc.data().status === 'pending')
            .map((snapshotDoc) => String(snapshotDoc.data().email).toLowerCase()),
        )
        const invitationsToRestore =
          mode === 'merge'
            ? data.farmInvitations.filter(
                (invitation) =>
                  typeof invitation.email !== 'string' ||
                  !existingPendingEmails.has(invitation.email.toLowerCase()),
              )
            : data.farmInvitations
        const invitationWrites: PlannedWrite[] = invitationsToRestore.map((rawInvitation) => {
          const invitation = deserializeFromBackup('farmInvitations', rawInvitation)
          delete invitation.id
          delete invitation.userId
          delete invitation.acceptedAt
          delete invitation.rejectedAt
          invitation.farmId = currentFarm.id
          invitation.farmName = currentFarm.name
          invitation.invitedBy = user.id
          invitation.status = 'pending'
          invitation.token = `${currentFarm.id}_${crypto.randomUUID()}`
          invitation.createdAt = Timestamp.now()
          invitation.updatedAt = Timestamp.now()
          invitation.expiresAt = Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
          return { ref: doc(collection(db, 'farmInvitations')), data: invitation }
        })

        const allWrites = [
          ...animalWrites,
          ...breedingWrites,
          ...reminderWrites,
          ...saleWrites,
          ...invitationWrites,
        ]
        setProgress({ phase: 'restore', percent: 20, message: 'Escribiendo datos restaurados...' })
        try {
          await commitWrites(allWrites, (written) => {
            setProgress({
              phase: 'restore',
              percent: 20 + Math.round((written / Math.max(allWrites.length, 1)) * 45),
              message: `Escribiendo datos (${written}/${allWrites.length})...`,
            })
          })
        } catch (error) {
          // Las referencias son nuevas; limpiar lo ya escrito deja intactos los datos anteriores.
          await deleteDocuments(allWrites.map(({ ref }) => ref)).catch((cleanupError) => {
            console.error(
              'No se pudieron limpiar documentos de una restauración fallida:',
              cleanupError,
            )
          })
          throw error
        }

        if (mode === 'replace') {
          setProgress({ phase: 'restore', percent: 70, message: 'Retirando datos anteriores...' })
          const collectionNames = [
            'breedingRecords',
            'reminders',
            'sales',
            'farmInvitations',
          ] as const
          const existingSnapshots = await Promise.all(
            collectionNames.map((collectionName) =>
              getDocs(query(collection(db, collectionName), where('farmId', '==', currentFarm.id))),
            ),
          )
          const newPaths = new Set(allWrites.map(({ ref }) => ref.path))
          const refsToDelete = [
            ...existingAnimalsSnapshot.docs.map((snapshotDoc) => snapshotDoc.ref),
            ...existingSnapshots.flatMap((snapshot, index) =>
              snapshot.docs
                .filter(
                  (snapshotDoc) =>
                    collectionNames[index] !== 'farmInvitations' ||
                    snapshotDoc.data().status === 'pending',
                )
                .map((snapshotDoc) => snapshotDoc.ref),
            ),
          ].filter((ref) => !newPaths.has(ref.path))
          await deleteDocuments(refsToDelete)
        }

        setProgress({ phase: 'restore', percent: 90, message: 'Actualizando la granja...' })
        const importedAreas = sourceAreas.map((area) => ({
          ...area,
          id: typeof area.id === 'string' ? areaIdMap.get(area.id) : crypto.randomUUID(),
          farmId: currentFarm.id,
        }))
        const restoredFarm = sanitizeFarmForRestore(sourceFarm)
        const farm =
          mode === 'merge'
            ? { areas: [...(currentFarm.areas || []), ...importedAreas] }
            : { ...restoredFarm, areas: importedAreas }
        await setDoc(
          doc(db, 'farms', currentFarm.id),
          {
            ...stripUndefined(farm),
            updatedAt: Timestamp.now(),
            restoredBackups: arrayUnion({
              createdAt: Timestamp.now(),
              farmId: data._meta.farmId,
              farmName: data._meta.farmName,
              backupDate: data._meta.exportDate,
            }),
          },
          { merge: true },
        )

        counts.animals = animalWrites.length
        counts.animalRecords = data._meta.counts.animalRecords
        counts.breedingRecords = breedingWrites.length
        counts.reminders = reminderWrites.length
        counts.sales = saleWrites.length
        counts.farmInvitations = invitationWrites.length
        setProgress({ phase: 'restore', percent: 100, message: 'Restauración completada' })
        return { success: true, counts, errors: [] }
      } catch (error) {
        console.error('Error restaurando respaldo:', error)
        return {
          success: false,
          counts,
          errors: [error instanceof Error ? error.message : 'Error desconocido al restaurar'],
        }
      } finally {
        setIsRestoring(false)
      }
    },
    [user?.id, currentFarm?.id, currentFarm?.name],
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
