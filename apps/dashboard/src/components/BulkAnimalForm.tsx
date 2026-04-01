'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Animal,
  AnimalGender,
  AnimalStage,
  AnimalType,
  animal_icon,
  animal_stage_icons,
  animals_genders,
  animals_stages,
  animals_stages_labels,
  animals_types,
  POST_WEAN_STAGES,
} from '@/types/animals'
import { Icon } from './Icon/icon'
import { BirthDateInput } from './inputs/BirthDateInput'
import { DatePickerModal } from './inputs/DatePickerModal'
import { InputRadioCards } from './inputs/InputRadioCards'

// Campos compartidos que se preconfiguran para todos los animales
interface BulkDefaults {
  type: AnimalType
  breed: string
  stage: AnimalStage
  gender: AnimalGender
  status: string
  birthDate: string
  batch: string
  notes: string
}

// Un animal individual en la lista masiva
export interface BulkAnimalEntry {
  tempId: string
  animalNumber: string
  name: string
  type: AnimalType
  breed: string
  stage: AnimalStage
  gender: AnimalGender
  status: string
  weight: string
  birthDate: string
  batch: string
  notes: string
}

// Estado completo persistido en localStorage
interface BulkState {
  defaults: BulkDefaults
  quantity: number
  animals: BulkAnimalEntry[]
  generated: boolean
}

const STORAGE_KEY = 'mi-granja-bulk-animals'

function loadState(): BulkState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

function saveState(state: BulkState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
}

function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

const defaultDefaults: BulkDefaults = {
  type: animals_types[0],
  breed: '',
  stage: animals_stages[0],
  gender: animals_genders[0],
  status: 'activo',
  birthDate: '',
  batch: '',
  notes: '',
}

interface BulkAnimalFormProps {
  onCreateOne: (
    animal: Omit<Animal, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>,
  ) => Promise<void>
  onDone: () => void
  onCancel: () => void
  isLoading: boolean
  existingAnimals: Animal[]
}

const BATCH_SIZE = 5

const preventScrollChange = (e: React.WheelEvent<HTMLInputElement>) => {
  e.currentTarget.blur()
}

const BulkAnimalForm: React.FC<BulkAnimalFormProps> = ({
  onCreateOne,
  onDone,
  onCancel,
  isLoading,
  existingAnimals,
}) => {
  const saved = useMemo(() => loadState(), [])
  const [defaults, setDefaults] = useState<BulkDefaults>(saved?.defaults ?? defaultDefaults)
  const [quantity, setQuantity] = useState(saved?.quantity ?? 5)
  const [animals, setAnimals] = useState<BulkAnimalEntry[]>(saved?.animals ?? [])
  const [generated, setGenerated] = useState(saved?.generated ?? false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitProgress, setSubmitProgress] = useState<{ current: number; total: number } | null>(
    null,
  )

  // Persistir en localStorage
  useEffect(() => {
    saveState({ defaults, quantity, animals, generated })
  }, [defaults, quantity, animals, generated])

  const generateList = useCallback(() => {
    const existingNumbers = new Set(existingAnimals.map((a) => a.animalNumber.trim().toLowerCase()))
    const newAnimals: BulkAnimalEntry[] = []

    // Buscar el siguiente número disponible basado en los existentes
    const typePrefix = defaults.type.substring(0, 3).toUpperCase()
    let counter = 1

    for (let i = 0; i < quantity; i++) {
      let animalNumber = ''
      // Generar número único
      while (true) {
        animalNumber = `${typePrefix}-${String(counter).padStart(3, '0')}`
        if (
          !existingNumbers.has(animalNumber.toLowerCase()) &&
          !newAnimals.some((a) => a.animalNumber.toLowerCase() === animalNumber.toLowerCase())
        ) {
          break
        }
        counter++
      }
      counter++

      newAnimals.push({
        tempId: `bulk-${Date.now()}-${i}`,
        animalNumber,
        name: '',
        type: defaults.type,
        breed: defaults.breed,
        stage: defaults.stage,
        gender: defaults.gender,
        status: defaults.status,
        weight: '',
        birthDate: defaults.birthDate,
        batch: defaults.batch,
        notes: defaults.notes,
      })
    }

    setAnimals(newAnimals)
    setGenerated(true)
    setErrors({})
  }, [defaults, quantity, existingAnimals])

  const updateAnimal = (tempId: string, field: keyof BulkAnimalEntry, value: string) => {
    setAnimals((prev) => prev.map((a) => (a.tempId === tempId ? { ...a, [field]: value } : a)))
    // Limpiar error del campo
    setErrors((prev) => {
      const key = `${tempId}-${field}`
      if (prev[key]) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return prev
    })
  }

  const removeAnimal = (tempId: string) => {
    setAnimals((prev) => prev.filter((a) => a.tempId !== tempId))
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    const allNumbers = new Set(existingAnimals.map((a) => a.animalNumber.trim().toLowerCase()))

    for (const animal of animals) {
      const num = animal.animalNumber.trim()
      if (!num) {
        newErrors[`${animal.tempId}-animalNumber`] = 'Requerido'
      } else if (allNumbers.has(num.toLowerCase())) {
        newErrors[`${animal.tempId}-animalNumber`] = 'Ya existe'
      } else {
        // Verificar duplicados dentro de la lista
        const dupes = animals.filter(
          (a) => a.animalNumber.trim().toLowerCase() === num.toLowerCase(),
        )
        if (dupes.length > 1) {
          newErrors[`${animal.tempId}-animalNumber`] = 'Duplicado en lista'
        }
        allNumbers.add(num.toLowerCase())
      }

      if (animal.weight && (Number.isNaN(Number(animal.weight)) || Number(animal.weight) <= 0)) {
        newErrors[`${animal.tempId}-weight`] = 'Invalido'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmitAll = async () => {
    if (!validate()) return

    const transformed = animals.map((a) => ({
      animalNumber: a.animalNumber.trim(),
      ...(a.name.trim() ? { name: a.name.trim() } : {}),
      type: a.type,
      stage: a.stage,
      gender: a.gender,
      ...(POST_WEAN_STAGES.includes(a.stage) ? { isWeaned: true } : {}),
      breed: a.breed.trim(),
      status: a.status as Animal['status'],
      ...(a.weight ? { weight: Math.round(Number(a.weight) * 1000) } : {}),
      ...(a.birthDate
        ? {
            birthDate: (() => {
              const [y, m, d] = a.birthDate.split('-').map(Number)
              return new Date(y, m - 1, d)
            })(),
          }
        : {}),
      ...(a.batch.trim() ? { batch: a.batch.trim() } : {}),
      ...(a.notes.trim() ? { notes: a.notes.trim() } : {}),
    }))

    const total = transformed.length
    setSubmitProgress({ current: 0, total })
    let completed = 0
    const failedIds: string[] = []

    // Procesar en lotes paralelos
    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = transformed.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(batch.map((a) => onCreateOne(a)))

      for (let j = 0; j < results.length; j++) {
        completed++
        if (results[j].status === 'rejected') {
          failedIds.push(batch[j].animalNumber)
        }
      }
      setSubmitProgress({ current: completed, total })
    }

    if (failedIds.length === 0) {
      clearState()
      setGenerated(false)
      setAnimals([])
      setSubmitProgress(null)
      onDone()
    } else {
      // Mantener solo los que fallaron
      setAnimals((prev) => prev.filter((a) => failedIds.includes(a.animalNumber.trim())))
      setSubmitProgress(null)
      setErrors({ _global: `${failedIds.length} animales fallaron. Intenta de nuevo.` })
    }
  }

  const handleReset = () => {
    clearState()
    setDefaults(defaultDefaults)
    setQuantity(5)
    setAnimals([])
    setGenerated(false)
    setErrors({})
    setEditingId(null)
  }

  // Vista de configuracion (antes de generar)
  if (!generated) {
    const inputClass =
      'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500'

    return (
      <div className="space-y-6">
        {/* Preconfiguración */}
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <h3 className="font-medium text-gray-900">Configuracion de campos compartidos</h3>
          <p className="text-sm text-gray-500">
            Estos valores se aplicaran a todos los animales generados. Podras editarlos
            individualmente despues.
          </p>

          {/* Especie */}
          <InputRadioCards
            label="Especie *"
            value={defaults.type}
            onChange={(v) => setDefaults((d) => ({ ...d, type: v }))}
            columns={5}
            options={animals_types.map((t) => ({
              value: t,
              label: t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' '),
              icon: animal_icon[t],
            }))}
          />

          {/* Estado */}
          <InputRadioCards
            label="Estado *"
            value={defaults.status}
            onChange={(v) => setDefaults((d) => ({ ...d, status: v }))}
            columns={4}
            options={[
              { value: 'activo', label: 'Activo', icon: '✅' },
              { value: 'muerto', label: 'Muerto', icon: '💀' },
              { value: 'vendido', label: 'Vendido', icon: '💰' },
              { value: 'perdido', label: 'Perdido', icon: '🔍' },
            ]}
          />

          {/* Raza + Género */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Raza</label>
              <input
                type="text"
                value={defaults.breed}
                onChange={(e) => setDefaults((d) => ({ ...d, breed: e.target.value }))}
                placeholder="Ej: Dorper, Holstein"
                className={inputClass}
              />
            </div>
            <InputRadioCards
              label="Género *"
              value={defaults.gender}
              onChange={(v) => setDefaults((d) => ({ ...d, gender: v }))}
              columns={2}
              options={[
                {
                  value: 'macho',
                  label: 'Macho',
                  icon: <Icon icon="male" className="w-4 h-4 inline" />,
                },
                {
                  value: 'hembra',
                  label: 'Hembra',
                  icon: <Icon icon="female" className="w-4 h-4 inline" />,
                },
              ]}
            />
          </div>

          {/* Etapa */}
          <InputRadioCards
            label="Etapa *"
            value={defaults.stage}
            onChange={(v) => setDefaults((d) => ({ ...d, stage: v }))}
            columns={3}
            options={animals_stages.map((s) => ({
              value: s,
              label: animals_stages_labels[s],
              icon: animal_stage_icons[s],
            }))}
          />

          {/* Fecha de nacimiento + Edad */}
          <BirthDateInput
            value={defaults.birthDate}
            onChange={(val) => setDefaults((d) => ({ ...d, birthDate: val || '' }))}
          />

          {/* Lote + Notas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lote</label>
              <input
                type="text"
                value={defaults.batch}
                onChange={(e) => setDefaults((d) => ({ ...d, batch: e.target.value }))}
                placeholder="Ej: L001"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <input
                type="text"
                value={defaults.notes}
                onChange={(e) => setDefaults((d) => ({ ...d, notes: e.target.value }))}
                placeholder="Notas para todos..."
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Cantidad */}
        <div className="bg-white rounded-lg shadow p-4 space-y-3">
          <label className="block text-sm font-medium text-gray-700">Cantidad de animales</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg text-lg font-bold hover:bg-gray-200 transition-colors"
            >
              -
            </button>
            <input
              type="number"
              min={1}
              max={100}
              value={quantity}
              onWheel={preventScrollChange}
              onChange={(e) => {
                const v = Number.parseInt(e.target.value, 10)
                if (!Number.isNaN(v) && v >= 1 && v <= 100) setQuantity(v)
              }}
              className="w-20 text-center px-3 py-2 border border-gray-300 rounded-lg text-lg font-semibold focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(100, q + 1))}
              className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg text-lg font-bold hover:bg-gray-200 transition-colors"
            >
              +
            </button>
            <span className="text-sm text-gray-500">Max: 100</span>
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-3 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={generateList}
            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Generar lista ({quantity})
          </button>
        </div>
      </div>
    )
  }

  // Vista de lista generada
  return (
    <div className="space-y-4">
      {/* Resumen y acciones */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-medium text-gray-900">{animals.length} animales por registrar</h3>
            <p className="text-sm text-gray-500">
              {animal_icon[defaults.type]} {defaults.type} | {defaults.stage} | {defaults.gender}
              {defaults.breed ? ` | ${defaults.breed}` : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              Reiniciar
            </button>
            <button
              type="button"
              onClick={() => {
                setGenerated(false)
                setAnimals([])
              }}
              className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reconfigurar
            </button>
          </div>
        </div>
      </div>

      {/* Lista de animales */}
      <div className="space-y-2">
        {animals.map((animal, idx) => {
          const isEditing = editingId === animal.tempId
          const numError = errors[`${animal.tempId}-animalNumber`]
          const weightError = errors[`${animal.tempId}-weight`]

          return (
            <div
              key={animal.tempId}
              className={`bg-white rounded-lg shadow-sm border transition-all ${
                isEditing ? 'border-green-400 ring-1 ring-green-200' : 'border-gray-200'
              }`}
            >
              {/* Fila compacta */}
              <div className="p-3 flex items-center gap-3">
                <span className="text-sm font-medium text-gray-400 w-6 text-right">{idx + 1}</span>

                {/* ID editable siempre */}
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={animal.animalNumber}
                    onChange={(e) => updateAnimal(animal.tempId, 'animalNumber', e.target.value)}
                    className={`w-full px-2 py-1 border rounded text-sm font-mono ${
                      numError
                        ? 'border-red-400 bg-red-50'
                        : 'border-gray-300 focus:ring-1 focus:ring-green-500 focus:border-green-500'
                    }`}
                    placeholder="ID *"
                    disabled={isLoading}
                  />
                  {numError && <span className="text-[10px] text-red-600">{numError}</span>}
                </div>

                {/* Nombre editable siempre */}
                <div className="flex-1 min-w-0 hidden sm:block">
                  <input
                    type="text"
                    value={animal.name}
                    onChange={(e) => updateAnimal(animal.tempId, 'name', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500"
                    placeholder="Nombre"
                    disabled={isLoading}
                  />
                </div>

                {/* Peso editable siempre */}
                <div className="w-20">
                  <input
                    type="number"
                    value={animal.weight}
                    onChange={(e) => updateAnimal(animal.tempId, 'weight', e.target.value)}
                    onWheel={preventScrollChange}
                    className={`w-full px-2 py-1 border rounded text-sm ${
                      weightError
                        ? 'border-red-400 bg-red-50'
                        : 'border-gray-300 focus:ring-1 focus:ring-green-500 focus:border-green-500'
                    }`}
                    placeholder="Kg"
                    disabled={isLoading}
                  />
                </div>

                {/* Fecha de nacimiento */}
                <div className="w-24">
                  <DatePickerModal
                    value={animal.birthDate}
                    onChange={(val) => updateAnimal(animal.tempId, 'birthDate', val || '')}
                    placeholder="Nac."
                    disabled={isLoading}
                  />
                </div>

                {/* Botones */}
                <button
                  type="button"
                  onClick={() => setEditingId(isEditing ? null : animal.tempId)}
                  className={`p-1.5 rounded transition-colors ${
                    isEditing
                      ? 'bg-green-100 text-green-700'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Editar todos los campos"
                  disabled={isLoading}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                    <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => removeAnimal(animal.tempId)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Eliminar"
                  disabled={isLoading}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022 1.005 11.36A2.75 2.75 0 0 0 7.76 20h4.48a2.75 2.75 0 0 0 2.742-2.489l1.005-11.36.149.022a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 1 .7.798l-.5 5.5a.75.75 0 0 1-1.498-.136l.5-5.5a.75.75 0 0 1 .798-.662Zm2.84 0a.75.75 0 0 1 .798.662l.5 5.5a.75.75 0 1 1-1.498.136l-.5-5.5a.75.75 0 0 1 .7-.798Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>

              {/* Panel expandido para editar todos los campos */}
              {isEditing && (
                <div className="px-3 pb-3 pt-2 border-t border-gray-100 space-y-3">
                  {/* Nombre en movil */}
                  <div className="sm:hidden">
                    <label className="block text-xs text-gray-500 mb-1">Nombre</label>
                    <input
                      type="text"
                      value={animal.name}
                      onChange={(e) => updateAnimal(animal.tempId, 'name', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                      placeholder="Nombre"
                    />
                  </div>

                  <InputRadioCards
                    label="Especie"
                    value={animal.type}
                    onChange={(v) => updateAnimal(animal.tempId, 'type', v)}
                    columns={5}
                    options={animals_types.map((t) => ({
                      value: t,
                      label: t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' '),
                      icon: animal_icon[t],
                    }))}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Raza</label>
                      <input
                        type="text"
                        value={animal.breed}
                        onChange={(e) => updateAnimal(animal.tempId, 'breed', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        placeholder="Raza"
                      />
                    </div>
                    <InputRadioCards
                      label="Género"
                      value={animal.gender}
                      onChange={(v) => updateAnimal(animal.tempId, 'gender', v)}
                      columns={2}
                      options={[
                        { value: 'macho', label: 'Macho', icon: '♂' },
                        { value: 'hembra', label: 'Hembra', icon: '♀' },
                      ]}
                    />
                  </div>

                  <InputRadioCards
                    label="Etapa"
                    value={animal.stage}
                    onChange={(v) => updateAnimal(animal.tempId, 'stage', v)}
                    columns={3}
                    options={animals_stages.map((s) => ({
                      value: s,
                      label: animals_stages_labels[s],
                      icon: animal_stage_icons[s],
                    }))}
                  />

                  <InputRadioCards
                    label="Estado"
                    value={animal.status}
                    onChange={(v) => updateAnimal(animal.tempId, 'status', v)}
                    columns={4}
                    options={[
                      { value: 'activo', label: 'Activo', icon: '✅' },
                      { value: 'muerto', label: 'Muerto', icon: '💀' },
                      { value: 'vendido', label: 'Vendido', icon: '💰' },
                      { value: 'perdido', label: 'Perdido', icon: '🔍' },
                    ]}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Lote</label>
                      <input
                        type="text"
                        value={animal.batch}
                        onChange={(e) => updateAnimal(animal.tempId, 'batch', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        placeholder="Lote"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Notas</label>
                      <input
                        type="text"
                        value={animal.notes}
                        onChange={(e) => updateAnimal(animal.tempId, 'notes', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        placeholder="Notas..."
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {animals.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No hay animales en la lista.</p>
          <button
            type="button"
            onClick={() => {
              setGenerated(false)
            }}
            className="mt-2 text-green-600 hover:text-green-700 text-sm font-medium"
          >
            Volver a configurar
          </button>
        </div>
      )}

      {/* Errores globales */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700 font-medium">
            {errors._global ||
              `Hay ${Object.keys(errors).length} errores. Corrige los campos marcados en rojo.`}
          </p>
        </div>
      )}

      {/* Botones de acción */}
      {animals.length > 0 && !submitProgress && (
        <div className="flex gap-3 sticky bottom-0 bg-gray-50 py-3 -mx-4 px-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-3 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            disabled={!!submitProgress}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmitAll}
            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
            disabled={!!submitProgress || animals.length === 0}
          >
            Registrar {animals.length} animales
          </button>
        </div>
      )}

      {/* Modal de progreso */}
      {submitProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl p-6 mx-4 max-w-sm w-full text-center space-y-4">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Registrando animales...</h3>
            <p className="text-sm text-gray-500">No cierres la aplicacion hasta que termine.</p>

            {/* Barra de progreso */}
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-green-600 h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.round((submitProgress.current / submitProgress.total) * 100)}%`,
                }}
              />
            </div>

            <p className="text-sm font-medium text-gray-700">
              {submitProgress.current} de {submitProgress.total}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default BulkAnimalForm
