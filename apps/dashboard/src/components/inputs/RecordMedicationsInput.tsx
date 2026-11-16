'use client'

import { useId } from 'react'
import { PiPlus, PiTrash } from 'react-icons/pi'
import type { RecordMedication } from '@/types/animals'

interface RecordMedicationsInputProps {
  value: RecordMedication[]
  onChange: (next: RecordMedication[]) => void
}

const inputClass =
  'min-h-10 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-200'

/** Lista editable de medicamentos aplicados, cada uno con su lote. */
export default function RecordMedicationsInput({ value, onChange }: RecordMedicationsInputProps) {
  const id = useId()
  const update = (index: number, patch: Partial<RecordMedication>) =>
    onChange(value.map((item, i) => (i === index ? { ...item, ...patch } : item)))

  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 block text-sm font-medium">
        Medicamentos <span className="font-normal text-gray-500">(opcional)</span>
      </legend>
      {value.map((medication, index) => (
        <div
          key={index}
          className="grid grid-cols-[minmax(0,1fr)_minmax(0,7rem)_2.5rem] items-center gap-2"
        >
          <label className="sr-only" htmlFor={`${id}-name-${index}`}>
            Nombre del medicamento {index + 1}
          </label>
          <input
            id={`${id}-name-${index}`}
            value={medication.name}
            onChange={(event) => update(index, { name: event.target.value })}
            placeholder="Nombre"
            className={inputClass}
          />
          <label className="sr-only" htmlFor={`${id}-batch-${index}`}>
            Lote del medicamento {index + 1}
          </label>
          <input
            id={`${id}-batch-${index}`}
            value={medication.batch ?? ''}
            onChange={(event) => update(index, { batch: event.target.value })}
            placeholder="Lote"
            className={inputClass}
          />
          <button
            type="button"
            aria-label={`Quitar medicamento ${index + 1}`}
            title="Quitar"
            onClick={() => onChange(value.filter((_, i) => i !== index))}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <PiTrash aria-hidden="true" size={18} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...value, { name: '', batch: '' }])}
        className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-green-400 px-3 text-xs font-medium text-green-700 hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
      >
        <PiPlus aria-hidden="true" size={14} />
        Agregar medicamento
      </button>
    </fieldset>
  )
}
