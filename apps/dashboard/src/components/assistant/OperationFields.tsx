'use client'

import { useId } from 'react'
import { useSelector } from 'react-redux'
import { DatePickerButtons } from '@/components/buttons/date-picker-buttons'
import AnimalSelector from '@/components/inputs/AnimalSelector'
import InputIconSelect from '@/components/inputs/InputIconSelect'
import type { RootState } from '@/features/store'
import type { OperationAction } from '@/lib/ai/operations'
import {
  animals_genders_labels,
  animals_stages_labels,
  animals_types_labels,
} from '@/types/animals'

export type OperationDraft = {
  type: OperationAction['type']
  payload: Record<string, unknown>
  summary: string
}
type Props = {
  draft: OperationDraft
  onChange: (draft: OperationDraft) => void
  disabled: boolean
  farmId: string
}
// A new executable operation must deliberately add a review editor too.
const supportedEditors: Record<OperationAction['type'], true> = {
  create_animal: true,
  create_breeding: true,
  confirm_pregnancy: true,
  finish_breeding: true,
  register_birth: true,
  register_weaning: true,
  register_weight: true,
  register_milk: true,
  register_health: true,
  create_sale: true,
}
const inputClass =
  'min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-700 disabled:opacity-50'
const asString = (value: unknown) => (typeof value === 'string' ? value : '')
const asRefs = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

/** Input-only editor. Validation and all effects belong to the shared domain service. */
export default function OperationFields({ draft, onChange, disabled, farmId }: Props) {
  const id = useId()
  const animals = useSelector((state: RootState) => state.animals.animals).filter(
    (animal) => !animal.farmId || animal.farmId === farmId,
  )
  const breedingRecords = useSelector(
    (state: RootState) => state.breeding?.breedingRecords ?? [],
  ).filter((record) => !record.farmId || record.farmId === farmId)
  const payload = draft.payload
  const set = (name: string, value: unknown) =>
    onChange({
      ...draft,
      payload: {
        ...payload,
        [name]: value,
        ...(name === 'gender' && value === 'hembra' ? { isBreedingMale: false } : {}),
      },
    })
  const text = (name: string, label: string, multiline = false) => (
    <div key={name} className="space-y-1.5">
      <label htmlFor={`${id}-${name}`} className="block text-sm font-semibold text-slate-700">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={`${id}-${name}`}
          value={asString(payload[name])}
          onChange={(event) => set(name, event.target.value)}
          rows={3}
          className={inputClass}
        />
      ) : (
        <input
          id={`${id}-${name}`}
          value={asString(payload[name])}
          onChange={(event) => set(name, event.target.value)}
          className={inputClass}
        />
      )}
    </div>
  )
  const number = (name: string, label: string, optional = false) => (
    <div key={name} className="space-y-1.5">
      <label htmlFor={`${id}-${name}`} className="block text-sm font-semibold text-slate-700">
        {label}
        {optional ? ' (opcional)' : ''}
      </label>
      <input
        id={`${id}-${name}`}
        type="number"
        inputMode="decimal"
        min="0"
        step="any"
        value={typeof payload[name] === 'number' ? payload[name] : ''}
        onChange={(event) =>
          set(name, event.target.value === '' ? undefined : Number(event.target.value))
        }
        className={inputClass}
      />
    </div>
  )
  const date = (name: string, label: string) => (
    <DatePickerButtons
      key={name}
      label={label}
      value={asString(payload[name])}
      onChange={(value) => set(name, value)}
      disabled={disabled}
      showToday
      inline
    />
  )
  const select = (name: string, label: string, labels: Record<string, string>) => (
    <div key={name} className="space-y-1.5">
      <span id={`${id}-${name}`} className="block text-sm font-semibold text-slate-700">
        {label}
      </span>
      <InputIconSelect
        aria-labelledby={`${id}-${name}`}
        value={asString(payload[name])}
        onChange={(value) => set(name, value)}
        disabled={disabled}
        options={Object.entries(labels).map(([value, label]) => ({ value, label }))}
        className="min-h-12 rounded-xl"
      />
    </div>
  )
  const refs = (name: string, label: string, multi: boolean, gender?: 'macho' | 'hembra') => {
    const values = multi
      ? asRefs(payload[name])
      : asString(payload[name])
        ? [asString(payload[name])]
        : []
    const selected = animals.filter(
      (animal) => values.includes(animal.id) || values.includes(animal.animalNumber),
    )
    const unknown = values.filter(
      (value) => !selected.some((animal) => animal.id === value || animal.animalNumber === value),
    )
    return (
      <div key={name} className="space-y-1">
        <AnimalSelector
          label={label}
          animals={animals}
          selectedIds={selected.map((animal) => animal.id)}
          mode={multi ? 'multi' : 'single'}
          filterFn={(animal) =>
            (animal.status ?? 'activo') === 'activo' && (!gender || animal.gender === gender)
          }
          onAdd={(animalId) => {
            const reference =
              animals.find((animal) => animal.id === animalId)?.animalNumber ?? animalId
            set(name, multi ? [...new Set([...values, reference])] : reference)
          }}
          onRemove={(animalId) => {
            const animal = animals.find((animal) => animal.id === animalId)
            const next = values.filter(
              (value) => value !== animalId && value !== animal?.animalNumber,
            )
            set(name, multi ? next : '')
          }}
        />
        {unknown.length > 0 && (
          <div className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
            Revisa estas referencias: {unknown.join(', ')}.{' '}
            <button
              type="button"
              onClick={() =>
                set(
                  name,
                  multi
                    ? selected.map((animal) => animal.animalNumber)
                    : (selected[0]?.animalNumber ?? ''),
                )
              }
              className="min-h-11 font-semibold underline"
            >
              Quitar referencias no disponibles
            </button>
          </div>
        )}
      </div>
    )
  }
  const breeding = () => (
    <div className="space-y-1.5">
      <span id={`${id}-breeding`} className="block text-sm font-semibold text-slate-700">
        Empadre
      </span>
      <InputIconSelect
        aria-labelledby={`${id}-breeding`}
        value={asString(payload.breedingRef)}
        onChange={(value) => set('breedingRef', value)}
        disabled={disabled}
        options={[
          ...(!breedingRecords.some(
            (record) =>
              record.breedingId === payload.breedingRef || record.id === payload.breedingRef,
          ) && asString(payload.breedingRef)
            ? [
                {
                  value: asString(payload.breedingRef),
                  label: `Empadre ${asString(payload.breedingRef)}`,
                },
              ]
            : []),
          ...breedingRecords.map((record) => ({
            value: record.breedingId || record.id,
            label: `Empadre ${record.breedingId || record.id}`,
          })),
        ]}
      />
    </div>
  )
  const common = (
    <>
      {date('date', 'Fecha del movimiento')}
      {text('notes', 'Notas (opcional)', true)}
    </>
  )

  if (!supportedEditors[draft.type])
    return <p role="alert">Este movimiento todavía no se puede editar desde el asistente.</p>

  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-5 disabled:opacity-60">
      {draft.type === 'create_animal' && (
        <>
          {text('animalNumber', 'ID del animal')}
          {text('name', 'Nombre (opcional)')}
          {select('type', 'Especie', animals_types_labels)}
          {select('gender', 'Género', animals_genders_labels)}
          {payload.gender === 'macho' && (
            <label className="flex min-h-12 items-center gap-3 rounded-xl bg-green-50 px-3 py-2 text-sm font-semibold text-green-900">
              <input
                type="checkbox"
                checked={payload.isBreedingMale === true}
                onChange={(event) => set('isBreedingMale', event.target.checked)}
                className="h-5 w-5 accent-green-700"
              />
              Marcar como semental
            </label>
          )}

          {date('birthDate', 'Fecha de nacimiento (puede ser estimada)')}
          {select('stage', 'Etapa', animals_stages_labels)}
          {number('weightKg', 'Peso en kg', true)}
          {text('breed', 'Raza (opcional)')}
          {refs('motherRef', 'Madre (opcional)', false, 'hembra')}
          {refs('fatherRef', 'Padre (opcional)', false, 'macho')}
          {text('notes', 'Notas (opcional)', true)}
        </>
      )}
      {draft.type === 'confirm_pregnancy' && (
        <>
          {breeding()}
          {refs('femaleRefs', 'Hembras con gestación confirmada', true, 'hembra')}
          {date('referenceDate', 'Fecha de referencia del empadre')}
        </>
      )}
      {draft.type === 'finish_breeding' && (
        <>
          {breeding()}
          <p className="text-sm leading-6 text-slate-600">
            Revisa los efectos del cierre antes de confirmar.
          </p>
        </>
      )}
      {draft.type === 'create_breeding' && (
        <>
          {refs('maleRef', 'Macho', false, 'macho')}
          {refs('femaleRefs', 'Hembras', true, 'hembra')}
          {date('breedingDate', 'Fecha de inicio del empadre')}
          {text('notes', 'Notas (opcional)', true)}
        </>
      )}
      {draft.type === 'register_weaning' && (
        <>
          {refs('animalRefs', 'Crías', true)}
          {select('destination', 'Destino', { engorda: 'Engorda', reproductor: 'Reproducción' })}
          {common}
        </>
      )}
      {draft.type === 'register_weight' && (
        <>
          {refs('animalRef', 'Animal', false)}
          {number('weightKg', 'Peso en kg')}
          {common}
        </>
      )}
      {draft.type === 'register_milk' && (
        <>
          {refs('animalRef', 'Madre / Lechera', false, 'hembra')}
          {number('liters', 'Litros')}
          {select('session', 'Turno', {
            morning: 'Mañana',
            afternoon: 'Tarde',
            evening: 'Noche',
            total: 'Total del día',
          })}
          {common}
        </>
      )}
      {draft.type === 'register_health' && (
        <>
          {refs('animalRefs', 'Animales', true)}
          {select('category', 'Tipo de atención', {
            vaccine: 'Vacuna',
            treatment: 'Tratamiento',
            surgery: 'Cirugía',
            injury: 'Lesión',
            illness: 'Enfermedad',
            deworming: 'Desparasitación',
            supplement: 'Suplemento',
            observation: 'Observación',
            other: 'Otro',
          })}
          {text('title', 'Nombre de la atención')}
          {text('description', 'Descripción (opcional)', true)}
          {text('treatment', 'Tratamiento registrado (opcional)', true)}
          {number('cost', 'Costo', true)}
          {common}
        </>
      )}
      {draft.type === 'create_sale' && (
        <>
          {refs('animalRefs', 'Animales para venta', true)}
          {date('date', 'Fecha de venta')}
          {number('pricePerKg', 'Precio por kg')}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-700">Peso de cada animal</p>
            {asRefs(payload.animalRefs).map((reference) => {
              const weights = Array.isArray(payload.weights)
                ? (payload.weights as { animalRef: string; weightKg: number }[])
                : []
              const currentWeight = weights.find(
                (weight) => weight.animalRef === reference,
              )?.weightKg
              return (
                <div key={reference} className="space-y-1">
                  <label
                    className="block text-sm text-slate-700"
                    htmlFor={`${id}-weight-${reference}`}
                  >
                    {reference} · kg
                  </label>
                  <input
                    id={`${id}-weight-${reference}`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={typeof currentWeight === 'number' ? currentWeight : ''}
                    onChange={(event) =>
                      set('weights', [
                        ...weights.filter((weight) => weight.animalRef !== reference),
                        ...(event.target.value === ''
                          ? []
                          : [{ animalRef: reference, weightKg: Number(event.target.value) }]),
                      ])
                    }
                    className={inputClass}
                  />
                </div>
              )
            })}
          </div>
          {text('buyer', 'Comprador (opcional)')}
          {text('notes', 'Notas (opcional)', true)}
        </>
      )}
      {draft.type === 'register_birth' && (
        <>
          {refs('motherRef', 'Madre', false, 'hembra')}
          {date('birthDate', 'Fecha del parto')}
          <div className="space-y-1.5">
            <label
              htmlFor={`${id}-birthTime`}
              className="block text-sm font-semibold text-slate-700"
            >
              Hora del parto
            </label>
            <input
              id={`${id}-birthTime`}
              type="time"
              value={asString(payload.birthTime)}
              onChange={(event) => set('birthTime', event.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-800">Crías</h4>
            {(Array.isArray(payload.offspring) ? payload.offspring : []).map((raw, index) => {
              const child = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
              const updateChild = (key: string, value: unknown) =>
                set(
                  'offspring',
                  (payload.offspring as unknown[]).map((item, childIndex) =>
                    childIndex === index ? { ...child, [key]: value } : item,
                  ),
                )
              return (
                <div key={index} className="space-y-3 rounded-xl bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-700">Cría {index + 1}</p>
                  <label className="block text-sm text-slate-700">
                    ID del animal
                    <input
                      value={asString(child.animalNumber)}
                      onChange={(event) => updateChild('animalNumber', event.target.value)}
                      className={`mt-1 ${inputClass}`}
                    />
                  </label>
                  <InputIconSelect
                    aria-label={`Género de la cría ${index + 1}`}
                    value={asString(child.gender)}
                    onChange={(value) => updateChild('gender', value)}
                    disabled={disabled}
                    options={Object.entries(animals_genders_labels).map(([value, label]) => ({
                      value,
                      label,
                    }))}
                  />
                  <label className="block text-sm text-slate-700">
                    Peso en kg (opcional)
                    <input
                      type="number"
                      min="0"
                      step="any"
                      inputMode="decimal"
                      value={typeof child.weightKg === 'number' ? child.weightKg : ''}
                      onChange={(event) =>
                        updateChild(
                          'weightKg',
                          event.target.value === '' ? undefined : Number(event.target.value),
                        )
                      }
                      className={`mt-1 ${inputClass}`}
                    />
                  </label>
                  <InputIconSelect
                    aria-label={`Estado de la cría ${index + 1}`}
                    value={asString(child.status) || 'activo'}
                    onChange={(value) => updateChild('status', value)}
                    disabled={disabled}
                    options={[
                      { value: 'activo', label: 'Viva' },
                      { value: 'muerto', label: 'Muerta' },
                    ]}
                  />
                  <label className="block text-sm text-slate-700">
                    Notas de la cría (opcional)
                    <textarea
                      value={asString(child.notes)}
                      onChange={(event) => updateChild('notes', event.target.value)}
                      rows={2}
                      className={`mt-1 ${inputClass}`}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      set(
                        'offspring',
                        (payload.offspring as unknown[]).filter(
                          (_, childIndex) => childIndex !== index,
                        ),
                      )
                    }
                    className="min-h-11 text-sm font-semibold text-red-700"
                  >
                    Quitar cría
                  </button>
                </div>
              )
            })}
            <button
              type="button"
              onClick={() =>
                set('offspring', [
                  ...(Array.isArray(payload.offspring) ? payload.offspring : []),
                  { animalNumber: '', gender: 'hembra', status: 'activo' },
                ])
              }
              className="min-h-11 rounded-xl px-3 text-sm font-semibold text-green-700 hover:bg-green-50"
            >
              + Agregar cría
            </button>
          </div>
          {text('notes', 'Notas (opcional)', true)}
        </>
      )}
    </fieldset>
  )
}
