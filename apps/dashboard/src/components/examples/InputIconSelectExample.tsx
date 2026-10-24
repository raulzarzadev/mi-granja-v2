'use client'

import { useState } from 'react'
import InputIconSelect from '@/components/inputs/InputIconSelect'
import {
  type AnimalStatus,
  type AnimalType,
  animal_icon,
  animal_status_icons,
  animal_status_labels,
  animal_statuses,
  animals_types,
  animals_types_labels,
} from '@/types/animals'

/** Ejemplo de InputIconSelect para el showcase */
export default function InputIconSelectExample() {
  const [type, setType] = useState<AnimalType>('vaca')
  const [status, setStatus] = useState<AnimalStatus | ''>('')
  return (
    <div className="grid max-w-xl gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <span id="demo-type" className="block text-sm font-semibold text-gray-700">
          Especie
        </span>
        <InputIconSelect
          aria-labelledby="demo-type"
          value={type}
          onChange={setType}
          options={animals_types.map((t) => ({
            value: t,
            label: animals_types_labels[t],
            icon: animal_icon[t],
          }))}
        />
      </div>
      <div className="space-y-1.5">
        <span id="demo-status" className="block text-sm font-semibold text-gray-700">
          Estado (con placeholder)
        </span>
        <InputIconSelect
          aria-labelledby="demo-status"
          value={status}
          onChange={setStatus}
          placeholder="Elige un estado"
          options={animal_statuses.map((s) => ({
            value: s,
            label: animal_status_labels[s],
            icon: animal_status_icons[s],
          }))}
        />
      </div>
    </div>
  )
}
