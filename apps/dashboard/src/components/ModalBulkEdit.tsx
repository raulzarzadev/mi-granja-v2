'use client'

import React, { useState } from 'react'
import { Modal } from '@/components/Modal'
import Button from '@/components/buttons/Button'
import {
  Animal,
  AnimalGender,
  AnimalStage,
  AnimalType,
  animals_genders,
  animals_genders_labels,
  animals_stages,
  animals_stages_labels,
  animals_types,
  animals_types_labels,
} from '@/types/animals'

interface BulkEditField {
  enabled: boolean
  value: string
}

interface ModalBulkEditProps {
  isOpen: boolean
  onClose: () => void
  selectedAnimals: Animal[]
  onSave: (animalIds: string[], updates: Partial<Animal>) => Promise<void>
}

export default function ModalBulkEdit({
  isOpen,
  onClose,
  selectedAnimals,
  onSave,
}: ModalBulkEditProps) {
  const [fields, setFields] = useState<Record<string, BulkEditField>>({
    type: { enabled: false, value: '' },
    breed: { enabled: false, value: '' },
    gender: { enabled: false, value: '' },
    stage: { enabled: false, value: '' },
    weight: { enabled: false, value: '' },
  })
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const toggleField = (key: string) => {
    setFields((prev) => ({
      ...prev,
      [key]: { ...prev[key], enabled: !prev[key].enabled },
    }))
  }

  const updateValue = (key: string, value: string) => {
    setFields((prev) => ({
      ...prev,
      [key]: { ...prev[key], value },
    }))
  }

  const enabledCount = Object.values(fields).filter((f) => f.enabled).length

  const handleSave = async () => {
    const updates: Partial<Animal> = {}
    if (fields.type.enabled && fields.type.value) updates.type = fields.type.value as AnimalType
    if (fields.breed.enabled) updates.breed = fields.breed.value
    if (fields.gender.enabled && fields.gender.value)
      updates.gender = fields.gender.value as AnimalGender
    if (fields.stage.enabled && fields.stage.value)
      updates.stage = fields.stage.value as AnimalStage
    if (fields.weight.enabled && fields.weight.value) {
      updates.weight = Math.round(parseFloat(fields.weight.value) * 1000)
    }

    if (Object.keys(updates).length === 0) return

    const ids = selectedAnimals.map((a) => a.id)
    setSaving(true)
    setProgress({ current: 0, total: ids.length })
    try {
      for (let i = 0; i < ids.length; i++) {
        setProgress({ current: i + 1, total: ids.length })
        await onSave([ids[i]], updates)
      }
      onClose()
      setFields({
        type: { enabled: false, value: '' },
        breed: { enabled: false, value: '' },
        gender: { enabled: false, value: '' },
        stage: { enabled: false, value: '' },
        weight: { enabled: false, value: '' },
      })
    } finally {
      setSaving(false)
      setProgress({ current: 0, total: 0 })
    }
  }

  const availableBreeds = [...new Set(selectedAnimals.map((a) => a.breed).filter(Boolean))]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Editar ${selectedAnimals.length} animales`}
      size="sm"
    >
      <div className="p-4 space-y-3">
        <p className="text-xs text-gray-500">
          Selecciona los campos a modificar. Solo los campos activados se aplicaran a los{' '}
          {selectedAnimals.length} animales seleccionados.
        </p>

        {/* Especie */}
        <FieldRow
          label="Especie"
          enabled={fields.type.enabled}
          onToggle={() => toggleField('type')}
        >
          <select
            value={fields.type.value}
            onChange={(e) => updateValue('type', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Seleccionar...</option>
            {animals_types.map((t) => (
              <option key={t} value={t}>
                {animals_types_labels[t]}
              </option>
            ))}
          </select>
        </FieldRow>

        {/* Raza */}
        <FieldRow label="Raza" enabled={fields.breed.enabled} onToggle={() => toggleField('breed')}>
          <input
            type="text"
            value={fields.breed.value}
            onChange={(e) => updateValue('breed', e.target.value)}
            placeholder="Ej: Katahdin"
            list="breed-suggestions"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {availableBreeds.length > 0 && (
            <datalist id="breed-suggestions">
              {availableBreeds.map((b) => (
                <option key={b} value={b!} />
              ))}
            </datalist>
          )}
        </FieldRow>

        {/* Genero */}
        <FieldRow
          label="Genero"
          enabled={fields.gender.enabled}
          onToggle={() => toggleField('gender')}
        >
          <select
            value={fields.gender.value}
            onChange={(e) => updateValue('gender', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Seleccionar...</option>
            {animals_genders.map((g) => (
              <option key={g} value={g}>
                {animals_genders_labels[g]}
              </option>
            ))}
          </select>
        </FieldRow>

        {/* Etapa */}
        <FieldRow
          label="Etapa"
          enabled={fields.stage.enabled}
          onToggle={() => toggleField('stage')}
        >
          <select
            value={fields.stage.value}
            onChange={(e) => updateValue('stage', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Seleccionar...</option>
            {animals_stages.map((s) => (
              <option key={s} value={s}>
                {animals_stages_labels[s]}
              </option>
            ))}
          </select>
        </FieldRow>

        {/* Peso */}
        <FieldRow
          label="Peso (kg)"
          enabled={fields.weight.enabled}
          onToggle={() => toggleField('weight')}
        >
          <input
            type="number"
            value={fields.weight.value}
            onChange={(e) => updateValue('weight', e.target.value)}
            placeholder="Ej: 45.5"
            step="0.1"
            min="0"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </FieldRow>

        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="outline" color="neutral" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            size="sm"
            color="primary"
            onClick={handleSave}
            disabled={enabledCount === 0 || saving}
            className="flex-1"
          >
            {saving
              ? `Guardando ${progress.current}/${progress.total}...`
              : `Aplicar a ${selectedAnimals.length}`}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function FieldRow({
  label,
  enabled,
  onToggle,
  children,
}: {
  label: string
  enabled: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${enabled ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}
    >
      <label className="flex items-center gap-2 cursor-pointer mb-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={onToggle}
          className="h-4 w-4 rounded border-gray-300 text-green-600 cursor-pointer"
        />
        <span className={`text-sm font-medium ${enabled ? 'text-gray-900' : 'text-gray-500'}`}>
          {label}
        </span>
      </label>
      {enabled && <div className="mt-1">{children}</div>}
    </div>
  )
}
