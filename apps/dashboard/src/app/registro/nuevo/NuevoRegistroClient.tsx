'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import AnimalBadges from '@/components/AnimalBadges'
import { DatePickerButtons } from '@/components/buttons/date-picker-buttons'
import InputSelectAnimals from '@/components/inputs/InputSelectAnimals'
import PageShell from '@/components/PageShell'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useReminders } from '@/hooks/useReminders'
import { buildRecordFromForm, getTodayLocalDateString } from '@/lib/records'
import {
  AnimalRecord,
  RecordCategory,
  record_categories,
  record_category_icons,
  record_category_labels,
  record_type_icons,
  record_type_labels,
} from '@/types/animals'
import { RecordFormState } from '@/types/records'

const STEPS = [
  { label: 'Tipo y Fecha', icon: '📋' },
  { label: 'Animales', icon: '🐾' },
  { label: 'Detalles', icon: '📝' },
] as const

const initialFormData = (): RecordFormState => ({
  type: 'note',
  category: 'general',
  title: '',
  description: '',
  date: getTodayLocalDateString(),
  severity: '',
  isResolved: false,
  resolvedDate: '',
  treatment: '',
  nextDueDate: '',
  batch: '',
  veterinarian: '',
  cost: '',
  createReminder: false,
  reminderDate: '',
  reminderTitle: '',
  weight: '',
  weightUnit: 'kg',
  expenseCategory: 'feed',
  supplier: '',
})

const noteCategories: RecordCategory[] = ['general', 'observation', 'other']
const healthCategories: RecordCategory[] = record_categories.filter(
  (c) => c !== 'general' && c !== 'observation',
) as RecordCategory[]

const clinicalCategories: ReadonlyArray<RecordCategory> = [
  'illness',
  'injury',
  'treatment',
  'surgery',
]

export default function NuevoRegistroClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { animals, addRecord, addBulkRecord, addWeightEntry } = useAnimalCRUD()
  const { createReminder } = useReminders()

  const preSelectedAnimalIds = searchParams.get('animalIds')?.split(',').filter(Boolean) || []

  const [step, setStep] = useState(0)
  const [selectedAnimalIds, setSelectedAnimalIds] = useState<string[]>([])
  const [formData, setFormData] = useState<RecordFormState>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [weightMap, setWeightMap] = useState<Record<string, string>>({})

  // Sync pre-selected animals on mount
  useEffect(() => {
    if (preSelectedAnimalIds.length > 0) {
      setSelectedAnimalIds((prev) => {
        const merged = new Set([...preSelectedAnimalIds, ...prev])
        return Array.from(merged)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAddAnimal = (animalId: string) => {
    if (animalId && !selectedAnimalIds.includes(animalId)) {
      setSelectedAnimalIds((prev) => [...prev, animalId])
    }
  }

  const handleRemoveAnimal = (animalId: string) => {
    if (preSelectedAnimalIds.includes(animalId)) return
    setSelectedAnimalIds((prev) => prev.filter((id) => id !== animalId))
  }

  const isBulk = selectedAnimalIds.length > 1
  const selectedAnimals = animals.filter((a) => selectedAnimalIds.includes(a.id))

  const canAdvance = (s: number) => {
    if (s === 0) return !!formData.date && !!formData.type
    if (s === 1) return selectedAnimalIds.length > 0
    return true
  }

  const handleNext = () => {
    if (step < STEPS.length - 1 && canAdvance(step)) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 0) setStep(step - 1)
  }

  const handleSubmit = async () => {
    if (selectedAnimalIds.length === 0) {
      alert('Selecciona al menos un animal')
      return
    }

    setIsSubmitting(true)
    try {
      if (formData.type === 'weight') {
        const [y, m, d] = formData.date.split('-').map(Number)
        const date = new Date(y, m - 1, d)
        const unit = formData.weightUnit

        const missingWeight = selectedAnimalIds.some((id) => {
          const val = selectedAnimalIds.length === 1 ? formData.weight : weightMap[id] || ''
          return !val || parseFloat(val) <= 0
        })

        if (missingWeight) {
          alert('Ingresa un peso valido para cada animal')
          setIsSubmitting(false)
          return
        }

        for (const animalId of selectedAnimalIds) {
          const rawWeight =
            selectedAnimalIds.length === 1 ? formData.weight : weightMap[animalId] || ''
          const weightGrams =
            unit === 'kg'
              ? Math.round(parseFloat(rawWeight) * 1000)
              : Math.round(parseFloat(rawWeight) * 453.592)

          await addWeightEntry(animalId, {
            date,
            weight: weightGrams,
            notes: formData.description || undefined,
          })
        }
      } else {
        if (!formData.title.trim()) {
          alert('El titulo del registro es requerido')
          setIsSubmitting(false)
          return
        }

        const recordData = buildRecordFromForm(formData)

        if (selectedAnimalIds.length === 1) {
          await addRecord(
            selectedAnimalIds[0],
            recordData as Omit<AnimalRecord, 'id' | 'createdAt' | 'createdBy'>,
          )
        } else {
          await addBulkRecord(selectedAnimalIds, recordData)
        }
      }

      // Recordatorio
      if (formData.createReminder && formData.reminderDate) {
        const [y, m, d] = formData.reminderDate.split('-').map(Number)
        const animalNumbers = selectedAnimals.map((a) => a.animalNumber).filter(Boolean)
        const reminderFallback = formData.title || record_type_labels[formData.type]
        await createReminder({
          title: formData.reminderTitle.trim() || `Recordatorio: ${reminderFallback}`,
          description: formData.description || '',
          dueDate: new Date(y, m - 1, d),
          completed: false,
          priority: 'medium',
          type:
            formData.type === 'health'
              ? 'medical'
              : formData.type === 'weight'
                ? 'weight'
                : 'other',
          animalNumber: animalNumbers[0] || '',
          animalNumbers,
        })
      }

      router.back()
    } catch (error) {
      console.error('Error al crear registro:', error)
      alert('Error al crear el registro. Intentalo de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const availableCategories: RecordCategory[] =
    formData.type === 'note' ? noteCategories : healthCategories

  return (
    <PageShell title="Nuevo Registro">
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-6">
        {STEPS.map((s, i) => (
          <React.Fragment key={i}>
            <button
              type="button"
              onClick={() => {
                if (i < step || canAdvance(step)) setStep(i)
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                i === step
                  ? 'bg-green-600 text-white shadow'
                  : i < step
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              <span>{s.icon}</span>
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{i + 1}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 rounded ${i < step ? 'bg-green-400' : 'bg-gray-200'}`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ─── Step 1: Tipo y Fecha ─── */}
      {step === 0 && (
        <div className="space-y-5">
          <DatePickerButtons
            value={formData.date}
            onChange={(date) => setFormData({ ...formData, date })}
            label="Fecha"
            showToday
          />

          <div>
            <label className="block text-sm font-medium mb-2">Tipo de registro</label>
            <div className="flex gap-2">
              {(['weight', 'health', 'note'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    const newCategory =
                      t === 'note'
                        ? 'general'
                        : t === 'health'
                          ? healthCategories[0]
                          : formData.category
                    setFormData({ ...formData, type: t, category: newCategory })
                  }}
                  className={`flex-1 flex flex-col items-center gap-1 px-3 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    formData.type === t
                      ? 'border-green-500 bg-green-50 text-green-800 shadow-sm'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl">{record_type_icons[t]}</span>
                  <span>{record_type_labels[t]}</span>
                </button>
              ))}
            </div>
          </div>

          {formData.type !== 'weight' && (
            <div>
              <label className="block text-sm font-medium mb-2">Categoria</label>
              <div className="flex flex-wrap gap-2">
                {availableCategories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: c })}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      formData.category === c
                        ? 'border-green-500 bg-green-50 text-green-800'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span>{record_category_icons[c]}</span>
                    {record_category_labels[c]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Step 2: Selector de Animales ─── */}
      {step === 1 && (
        <div className="space-y-4">
          <InputSelectAnimals
            animals={animals}
            selectedIds={selectedAnimalIds}
            onAdd={handleAddAnimal}
            onRemove={handleRemoveAnimal}
            fixedIds={preSelectedAnimalIds}
            label="Buscar animal"
          />

          {selectedAnimalIds.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              Busca y selecciona al menos un animal
            </p>
          )}
        </div>
      )}

      {/* ─── Step 3: Detalles ─── */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Peso — un solo animal */}
          {formData.type === 'weight' && selectedAnimalIds.length === 1 && (
            <div>
              <label className="block text-sm font-medium mb-1">Peso *</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  placeholder="Ej: 45.5"
                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  autoFocus
                />
                <select
                  value={formData.weightUnit}
                  onChange={(e) =>
                    setFormData({ ...formData, weightUnit: e.target.value as 'kg' | 'lb' })
                  }
                  className="border rounded-lg px-3 py-2 text-sm w-20"
                >
                  <option value="kg">kg</option>
                  <option value="lb">lb</option>
                </select>
              </div>
            </div>
          )}

          {/* Peso — múltiples animales */}
          {formData.type === 'weight' && selectedAnimalIds.length > 1 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Peso por animal *</label>
                <select
                  value={formData.weightUnit}
                  onChange={(e) =>
                    setFormData({ ...formData, weightUnit: e.target.value as 'kg' | 'lb' })
                  }
                  className="border rounded-lg px-2 py-1 text-xs w-16"
                >
                  <option value="kg">kg</option>
                  <option value="lb">lb</option>
                </select>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {selectedAnimals.map((animal) => (
                  <div
                    key={animal.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50"
                  >
                    <AnimalBadges animal={animal} />
                    <span className="font-semibold text-sm text-gray-900 min-w-0">
                      #{animal.animalNumber}
                    </span>
                    {animal.name && (
                      <span className="text-xs text-gray-500 truncate">{animal.name}</span>
                    )}
                    <div className="flex-1" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={weightMap[animal.id] || ''}
                      onChange={(e) =>
                        setWeightMap((prev) => ({ ...prev, [animal.id]: e.target.value }))
                      }
                      placeholder="0.00"
                      className="w-24 border rounded-lg px-2 py-1.5 text-sm text-right focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                    <span className="text-xs text-gray-400 w-6">{formData.weightUnit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Titulo (nota y salud) */}
          {formData.type !== 'weight' && (
            <div>
              <label className="block text-sm font-medium mb-1">Titulo *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Titulo del registro..."
                autoFocus
              />
            </div>
          )}

          {/* Notas / Descripcion */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {formData.type === 'weight' ? 'Notas (opcional)' : 'Descripcion (opcional)'}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none field-sizing-content focus:ring-2 focus:ring-green-500 focus:border-green-500"
              rows={2}
              placeholder="Agrega detalles o contexto..."
            />
          </div>

          {/* Health-specific fields */}
          {formData.type === 'health' && (
            <HealthDetailsSection value={formData} onChange={setFormData} isBulk={isBulk} />
          )}

          {/* Recordatorio */}
          <div className="border border-gray-200 rounded-lg p-3 space-y-3">
            <div className="flex items-center gap-2">
              <input
                id="createReminder"
                type="checkbox"
                checked={formData.createReminder}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    createReminder: e.target.checked,
                    reminderDate: e.target.checked ? formData.reminderDate || formData.date : '',
                  })
                }
                className="rounded"
              />
              <label htmlFor="createReminder" className="text-sm font-medium">
                Activar recordatorio
              </label>
            </div>
            {formData.createReminder && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Titulo del recordatorio</label>
                  <input
                    type="text"
                    value={formData.reminderTitle}
                    onChange={(e) => setFormData({ ...formData, reminderTitle: e.target.value })}
                    placeholder="Ej: Siguiente pesaje, Vacuna de refuerzo..."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <DatePickerButtons
                  value={formData.reminderDate}
                  onChange={(reminderDate) => setFormData({ ...formData, reminderDate })}
                  label="Fecha del recordatorio"
                  showToday
                />
              </>
            )}
          </div>

          {/* Resumen */}
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 space-y-1">
            <p className="font-medium text-gray-800">Resumen</p>
            <p>
              {record_type_icons[formData.type]} {record_type_labels[formData.type]}
              {formData.type !== 'weight' && (
                <span>
                  {' '}
                  — {record_category_icons[formData.category]}{' '}
                  {record_category_labels[formData.category]}
                </span>
              )}
            </p>
            <p>
              {selectedAnimalIds.length} animal{selectedAnimalIds.length !== 1 ? 'es' : ''}
              {' · '}
              {formData.date}
            </p>
            {formData.type === 'weight' && selectedAnimalIds.length === 1 && formData.weight && (
              <p>
                Peso: {formData.weight} {formData.weightUnit}
              </p>
            )}
            {formData.type === 'weight' && selectedAnimalIds.length > 1 && (
              <p>
                Pesos: {Object.values(weightMap).filter((v) => v && parseFloat(v) > 0).length}/
                {selectedAnimalIds.length} registrados
              </p>
            )}
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-3 pt-5 mt-5 border-t">
        {step > 0 && (
          <button
            type="button"
            onClick={handleBack}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm"
          >
            Atras
          </button>
        )}
        <div className="flex-1" />
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canAdvance(step)}
            className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            Siguiente
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !canAdvance(1)}
            className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {isSubmitting
              ? 'Guardando...'
              : isBulk
                ? `Aplicar a ${selectedAnimalIds.length} animales`
                : 'Guardar registro'}
          </button>
        )}
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isSubmitting}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm"
        >
          Cancelar
        </button>
      </div>
    </PageShell>
  )
}

// ─── Health Details Sub-section ─────────────────────────────
const HealthDetailsSection: React.FC<{
  value: RecordFormState
  onChange: (next: RecordFormState) => void
  isBulk: boolean
}> = ({ value, onChange, isBulk }) => {
  const isClinical = clinicalCategories.includes(value.category)

  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-3">
      <p className="text-sm font-medium text-gray-700">Detalles de salud</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {isClinical && (
          <>
            <div>
              <label className="block text-sm font-medium">Severidad</label>
              <select
                value={value.severity}
                onChange={(e) => onChange({ ...value, severity: e.target.value as any })}
                className="w-full border rounded-lg px-2 py-1.5 text-sm"
              >
                <option value="">Sin especificar</option>
                <option value="low">Leve</option>
                <option value="medium">Moderada</option>
                <option value="high">Alta</option>
                <option value="critical">Critica</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="resolved"
                type="checkbox"
                checked={value.isResolved}
                onChange={(e) => onChange({ ...value, isResolved: e.target.checked })}
              />
              <label htmlFor="resolved" className="text-sm">
                Caso resuelto
              </label>
            </div>
            {value.isResolved && (
              <div>
                <DatePickerButtons
                  value={value.resolvedDate}
                  onChange={(resolvedDate) => onChange({ ...value, resolvedDate })}
                  label="Fecha de resolucion"
                  showToday
                />
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium">Tratamiento</label>
              <input
                type="text"
                value={value.treatment}
                onChange={(e) => onChange({ ...value, treatment: e.target.value })}
                className="w-full border rounded-lg px-2 py-1.5 text-sm"
              />
            </div>
          </>
        )}
        <div>
          <DatePickerButtons
            value={value.nextDueDate}
            onChange={(nextDueDate) => onChange({ ...value, nextDueDate })}
            label="Proximo vencimiento"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Lote / Batch</label>
          <input
            type="text"
            value={value.batch}
            onChange={(e) => onChange({ ...value, batch: e.target.value })}
            className="w-full border rounded-lg px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Veterinario</label>
          <input
            type="text"
            value={value.veterinarian}
            onChange={(e) => onChange({ ...value, veterinarian: e.target.value })}
            className="w-full border rounded-lg px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">
            {isBulk ? 'Costo por animal' : 'Costo'}
          </label>
          <input
            type="number"
            step="0.01"
            value={value.cost}
            onChange={(e) => onChange({ ...value, cost: e.target.value })}
            className="w-full border rounded-lg px-2 py-1.5 text-sm"
          />
        </div>
      </div>
    </div>
  )
}
