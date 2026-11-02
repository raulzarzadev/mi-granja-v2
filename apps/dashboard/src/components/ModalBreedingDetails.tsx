'use client'

import { useRef, useState } from 'react'
import {
  CHIP_COLORS,
  groupFemalesByStatus,
  sortFemalesByAnimalNumber,
} from '@/components/Dashboard/Animals/helpers/breedingViewHelpers'
import { useBreedingHandlers } from '@/components/Dashboard/Animals/hooks/useBreedingHandlers'
import { Icon } from '@/components/Icon/icon'
import AnimalSelector from '@/components/inputs/AnimalSelector'
import { Modal } from '@/components/Modal'
import ModalBirthForm from '@/components/ModalBirthForm'
import ModalConfirmPregnancy from '@/components/ModalConfirmPregnancy'
import ModalEditBreeding from '@/components/ModalEditBreeding'
import { useBreedingCRUD } from '@/hooks/useBreedingCRUD'
import { useFarmPermissions } from '@/hooks/useFarmPermissions'
import { useRecordMovements } from '@/hooks/useRecordMovements'
import { formatDate } from '@/lib/dates'
import { createMovementId } from '@/lib/record-movements'
import type { Animal } from '@/types/animals'
import type { BreedingRecord } from '@/types/breedings'

export default function ModalBreedingDetails({
  record,
  animals,
  onClose,
  onOpenAnimal,
}: {
  record: BreedingRecord
  animals: Animal[]
  onClose: () => void
  onOpenAnimal: (id: string) => void
}) {
  const { breedingRecords, updateBreedingRecord, deleteBreedingRecord } = useBreedingCRUD()
  const movements = useRecordMovements(animals)
  const { has } = useFarmPermissions()
  const canUpdate = has('breeding', 'update')
  const { handleRemoveFromBreeding } = useBreedingHandlers({
    animals,
    updateBreedingRecord,
    deleteBreedingRecord,
  })
  const [editing, setEditing] = useState(false)
  const [pregnancyFemale, setPregnancyFemale] = useState<string | null>(null)
  const [birthFemale, setBirthFemale] = useState<string | null>(null)
  const [removingAnimal, setRemovingAnimal] = useState<Animal | null>(null)
  const [saving, setSaving] = useState(false)
  const removalLock = useRef(false)
  const [error, setError] = useState('')
  const removalDeletesRecord =
    !!removingAnimal &&
    (removingAnimal.id === record.maleId || record.femaleBreedingInfo.length === 1)
  const canRemove = canUpdate && (!removalDeletesRecord || has('breeding', 'delete'))
  const openRemoval = (animal: Animal) => {
    setError('')
    setRemovingAnimal(animal)
  }
  const removeAnimal = async () => {
    if (!removingAnimal || !canRemove || removalLock.current) return
    removalLock.current = true
    setSaving(true)
    try {
      await handleRemoveFromBreeding(record, removingAnimal.id)
      setRemovingAnimal(null)
      if (removalDeletesRecord) onClose()
    } catch {
      setError('No se pudo sacar al animal del empadre. Intenta nuevamente.')
    } finally {
      setSaving(false)
      removalLock.current = false
    }
  }
  const decorativeIcon = (icon: import('@/components/Icon/icon').IconName) => (
    <span aria-hidden="true" className="inline-flex shrink-0">
      <Icon icon={icon} className="h-4 w-4" />
    </span>
  )
  const actionClass =
    'inline-flex items-center justify-center gap-2 min-h-11 cursor-pointer rounded-lg px-3 py-2 text-sm font-medium hover:bg-green-50 disabled:opacity-50'
  const [addingFemales, setAddingFemales] = useState(false)
  const [newFemaleIds, setNewFemaleIds] = useState<string[]>([])
  const [addError, setAddError] = useState('')
  const addLock = useRef(false)
  const [adding, setAdding] = useState(false)
  const male = animals.find((animal) => animal.id === record.maleId)
  const candidates = animals.filter(
    (animal) =>
      male &&
      animal.gender === 'hembra' &&
      animal.type === male.type &&
      (animal.status ?? 'activo') === 'activo' &&
      !animal.pregnantAt &&
      !animal.birthedAt &&
      !record.femaleBreedingInfo.some((info) => info.femaleId === animal.id) &&
      !breedingRecords.some(
        (other) =>
          other.id !== record.id &&
          other.status !== 'finished' &&
          other.femaleBreedingInfo.some(
            (info) => info.femaleId === animal.id && !info.actualBirthDate,
          ),
      ),
  )
  const saveFemales = async () => {
    if (addLock.current || !canUpdate || record.status === 'finished' || !newFemaleIds.length)
      return
    if (newFemaleIds.some((id) => !candidates.some((animal) => animal.id === id))) {
      setAddError('Alguna hembra ya no está disponible. Revisa la selección.')
      return
    }
    addLock.current = true
    setAdding(true)
    setAddError('')
    try {
      await updateBreedingRecord(record.id, {
        femaleBreedingInfo: [
          ...record.femaleBreedingInfo,
          ...newFemaleIds.map((femaleId) => ({ femaleId })),
        ],
      })
      setAddingFemales(false)
      setNewFemaleIds([])
    } catch {
      setAddError('No se pudieron agregar las hembras. Intenta nuevamente.')
    } finally {
      addLock.current = false
      setAdding(false)
    }
  }
  const groups = groupFemalesByStatus(record.femaleBreedingInfo, animals, record)
  const animalButton = (animal: Animal, className = '') => (
    <button
      type="button"
      onClick={() => onOpenAnimal(animal.id)}
      aria-label={`Ver animal ${animal.animalNumber}`}
      className={`min-h-11 cursor-pointer rounded-full border px-3 py-2 text-sm font-medium hover:opacity-80 focus-visible:ring-2 focus-visible:ring-green-600 ${className}`}
    >
      {animal.animalNumber}
      {animal.name ? ` · ${animal.name}` : ''}
    </button>
  )
  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        title={`Empadre ${record.breedingId || ''}`}
        mobileSheet
        showCloseButton
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="flex items-center gap-2">
              {decorativeIcon('calendar')}
              {record.breedingDate
                ? formatDate(record.breedingDate, 'dd MMM yyyy')
                : 'Fecha no registrada'}
            </p>
            <div className="flex items-center gap-1">
              {canUpdate && (
                <button
                  type="button"
                  aria-label="Editar empadre"
                  title="Editar empadre"
                  onClick={() => setEditing(true)}
                  className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-blue-700 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <Icon icon="edit" className="h-4 w-4" />
                </button>
              )}
              <span className="rounded-full bg-gray-100 px-3 py-1">
                {record.status === 'finished' ? 'Terminado' : 'En curso'}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm text-gray-500">
              {decorativeIcon('male')}Macho
            </p>
            {male ? (
              <div className="flex flex-wrap items-center gap-2">{animalButton(male)}</div>
            ) : (
              <p>Animal no disponible</p>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <p className="flex items-center gap-2 font-medium">
                {decorativeIcon('female')}Hembras ({record.femaleBreedingInfo.length})
              </p>
              {canUpdate && record.status !== 'finished' && (
                <button
                  type="button"
                  aria-label="Agregar hembras al empadre"
                  title="Agregar hembras"
                  onClick={() => {
                    setNewFemaleIds([])
                    setAddError('')
                    setAddingFemales(true)
                  }}
                  className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-green-700 focus-visible:ring-2 focus-visible:ring-green-600 group"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-green-200 bg-green-50 transition-colors group-hover:bg-green-100">
                    <Icon icon="add" className="h-3.5 w-3.5" />
                  </span>
                </button>
              )}
            </div>
            {groups
              .filter((group) => group.items.length)
              .map((group) => (
                <div key={group.key} className="space-y-2">
                  <p className="text-sm text-gray-600">
                    {group.label} ({group.items.length})
                  </p>
                  <div className="space-y-2">
                    {sortFemalesByAnimalNumber(group.items, animals).map((info) => {
                      const animal = animals.find((candidate) => candidate.id === info.femaleId)
                      return (
                        <div key={info.femaleId} className="flex flex-wrap items-center gap-2">
                          {animal &&
                            canUpdate &&
                            record.status !== 'finished' &&
                            ['empadre', 'embarazada', 'embarazada_otra_monta'].includes(
                              group.key,
                            ) &&
                            (record.femaleBreedingInfo.length > 1 || has('breeding', 'delete')) && (
                              <button
                                type="button"
                                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-red-500 hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-500"
                                aria-label={`Sacar a ${animal.animalNumber} del empadre`}
                                title="Sacar del empadre"
                                onClick={() => openRemoval(animal)}
                              >
                                <Icon icon="close" className="h-4 w-4" />
                              </button>
                            )}
                          {animal ? (
                            animalButton(animal, CHIP_COLORS[group.key])
                          ) : (
                            <span className="text-sm text-gray-500">Animal no disponible</span>
                          )}
                          {animal && canUpdate && (
                            <>
                              {group.key === 'empadre' && record.status !== 'finished' && (
                                <button
                                  type="button"
                                  className={`${actionClass} text-blue-700 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-600`}
                                  onClick={() => setPregnancyFemale(animal.id)}
                                >
                                  {decorativeIcon('pregnant')}
                                  Confirmar gestación
                                </button>
                              )}
                              {group.key === 'embarazada' &&
                                has('animals', 'create') &&
                                has('animals', 'update') && (
                                  <button
                                    type="button"
                                    className={`${actionClass} text-green-700`}
                                    onClick={() => setBirthFemale(animal.id)}
                                  >
                                    {decorativeIcon('baby')}
                                    Registrar parto
                                  </button>
                                )}
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
          </div>
          {record.notes && (
            <p className="whitespace-pre-wrap text-sm text-gray-600">{record.notes}</p>
          )}
        </div>
      </Modal>
      {editing && (
        <ModalEditBreeding
          record={record}
          animals={animals}
          onClose={() => setEditing(false)}
          onSubmit={async (id, data) => {
            if (!canUpdate) throw new Error('No tienes permiso para actualizar empadres.')
            await updateBreedingRecord(id, data)
          }}
        />
      )}
      {addingFemales && (
        <Modal
          isOpen
          title="Agregar hembras al empadre"
          mobileSheet
          onClose={() => {
            if (!adding) setAddingFemales(false)
          }}
          closeOnEscape={!adding}
          closeOnOverlayClick={!adding}
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={adding}
                className={actionClass}
                onClick={() => setAddingFemales(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  adding || !newFemaleIds.length || !canUpdate || record.status === 'finished'
                }
                className={`${actionClass} bg-green-600 text-white hover:bg-green-700`}
                onClick={() => void saveFemales()}
              >
                {adding ? 'Agregando…' : 'Agregar hembras'}
              </button>
            </div>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Selecciona hembras disponibles de la misma especie del macho para el empadre{' '}
              {record.breedingId}.
            </p>
            {addError && (
              <p role="alert" className="text-sm text-red-700">
                {addError}
              </p>
            )}
            {candidates.length ? (
              <AnimalSelector
                animals={candidates}
                selectedIds={newFemaleIds}
                onAdd={(id) => {
                  if (!adding) setNewFemaleIds((current) => [...new Set([...current, id])])
                }}
                onRemove={(id) => {
                  if (!adding) setNewFemaleIds((current) => current.filter((value) => value !== id))
                }}
                label="Hembras disponibles"
              />
            ) : (
              <p>No hay hembras disponibles para este empadre.</p>
            )}
          </div>
        </Modal>
      )}
      {pregnancyFemale && (
        <ModalConfirmPregnancy
          isOpen
          onClose={() => setPregnancyFemale(null)}
          breedingRecord={record}
          animals={animals}
          selectedAnimal={pregnancyFemale}
          onSubmit={async (updated) => {
            if (!canUpdate) throw new Error('No tienes permiso para actualizar empadres.')
            const allConfirmed = updated.femaleBreedingInfo.every(
              (info) => !!info.pregnancyConfirmedDate,
            )
            await updateBreedingRecord(updated.id, {
              ...updated,
              ...(allConfirmed ? { status: 'finished' } : {}),
            })
          }}
        />
      )}
      {birthFemale && (
        <ModalBirthForm
          isOpen
          onClose={() => setBirthFemale(null)}
          breedingRecord={record}
          animals={animals}
          selectedFemaleId={birthFemale}
          onSubmit={async (form) => {
            if (!canUpdate || !has('animals', 'create') || !has('animals', 'update'))
              throw new Error('No tienes permiso para registrar partos.')
            await movements.birth(createMovementId(), form, record)
          }}
        />
      )}
      {removingAnimal && (
        <Modal
          isOpen
          onClose={() => {
            if (!saving) setRemovingAnimal(null)
          }}
          title="Sacar del empadre"
          closeOnEscape={!saving}
          closeOnOverlayClick={!saving}
        >
          <div className="space-y-4">
            <p>
              ¿Sacar a <strong>{removingAnimal.animalNumber}</strong> del empadre{' '}
              <strong>{record.breedingId}</strong>?
            </p>
            <p className="text-sm text-gray-600">
              {removalDeletesRecord
                ? 'Se eliminará este empadre completo. El macho y las hembras pendientes quedarán disponibles para otra monta; las gestaciones confirmadas se conservarán.'
                : 'La hembra dejará de participar en esta monta. Si tiene una gestación confirmada, se conservará su historial reproductivo.'}
            </p>
            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                className={actionClass}
                onClick={() => setRemovingAnimal(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving || !canRemove}
                className={`${actionClass} bg-red-600 text-white hover:bg-red-700`}
                onClick={() => void removeAnimal()}
              >
                {saving ? 'Sacando…' : 'Sacar del empadre'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
