'use client'

import React, { useState } from 'react'
import InputSelectAnimals from '@/components/inputs/InputSelectAnimals'
import { Animal } from '@/types/animals'

// Animales de ejemplo para el showcase
const mockAnimals: Animal[] = [
  {
    id: '1',
    farmerId: 'f1',
    animalNumber: '001',
    name: 'Luna',
    type: 'oveja',
    breed: 'dorper',
    stage: 'reproductor',
    gender: 'hembra',
    birthDate: new Date('2023-06-15'),
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'activo',
  },
  {
    id: '2',
    farmerId: 'f1',
    animalNumber: '01-D',
    type: 'oveja',
    breed: 'dorper',
    stage: 'reproductor',
    gender: 'hembra',
    birthDate: new Date('2024-05-20'),
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'activo',
  },
  {
    id: '3',
    farmerId: 'f1',
    animalNumber: '01-R',
    type: 'oveja',
    breed: 'katadin',
    stage: 'reproductor',
    gender: 'hembra',
    birthDate: new Date('2024-01-10'),
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'activo',
  },
  {
    id: '4',
    farmerId: 'f1',
    animalNumber: '02-H',
    name: 'Trueno',
    type: 'oveja',
    breed: 'dorper',
    stage: 'reproductor',
    gender: 'macho',
    birthDate: new Date('2023-03-01'),
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'activo',
  },
  {
    id: '5',
    farmerId: 'f1',
    animalNumber: '000',
    type: 'cabra',
    breed: 'boer',
    stage: 'cria',
    gender: 'macho',
    birthDate: new Date('2025-12-01'),
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'activo',
  },
  {
    id: '6',
    farmerId: 'f1',
    animalNumber: '02-D',
    name: 'Estrella',
    type: 'vaca',
    breed: 'angus',
    stage: 'reproductor',
    gender: 'hembra',
    birthDate: new Date('2022-08-10'),
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'activo',
  },
  {
    id: '7',
    farmerId: 'f1',
    animalNumber: '021',
    type: 'oveja',
    breed: 'pelibuey',
    stage: 'engorda',
    gender: 'hembra',
    birthDate: new Date('2025-06-15'),
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'activo',
  },
  {
    id: '8',
    farmerId: 'f1',
    animalNumber: '02-R',
    type: 'oveja',
    breed: 'dorper',
    stage: 'reproductor',
    gender: 'macho',
    birthDate: new Date('2023-11-20'),
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'activo',
  },
]

// Datos de monta simulados
const breedingDates: Record<string, string> = {
  '2': 'Monta: 13-01-26-121',
  '3': 'Monta: 15-05-25-137',
  '7': 'Monta: 14-11-25-28',
}

/** Ejemplo multi-seleccion basico */
export function ExampleMultiSelect() {
  const [ids, setIds] = useState<string[]>([])

  return (
    <InputSelectAnimals
      animals={mockAnimals}
      selectedIds={ids}
      onAdd={(id) => setIds((prev) => [...prev, id])}
      onRemove={(id) => setIds((prev) => prev.filter((i) => i !== id))}
      label="Seleccionar animales"
    />
  )
}

/** Ejemplo single-seleccion */
export function ExampleSingleSelect() {
  const [ids, setIds] = useState<string[]>([])

  return (
    <InputSelectAnimals
      animals={mockAnimals}
      selectedIds={ids}
      onAdd={(id) => setIds([id])}
      onRemove={() => setIds([])}
      mode="single"
      label="Seleccionar un animal"
      placeholder="Buscar animal..."
    />
  )
}

/** Ejemplo con pre-seleccionados fijos */
export function ExampleFixedIds() {
  const [ids, setIds] = useState<string[]>(['1', '4'])

  return (
    <InputSelectAnimals
      animals={mockAnimals}
      selectedIds={ids}
      onAdd={(id) => setIds((prev) => [...prev, id])}
      onRemove={(id) => setIds((prev) => prev.filter((i) => i !== id))}
      fixedIds={['1']}
      label="Con animal fijo (001 no se puede quitar)"
    />
  )
}

/** Ejemplo con filtro (solo hembras) */
export function ExampleFiltered() {
  const [ids, setIds] = useState<string[]>([])

  return (
    <InputSelectAnimals
      animals={mockAnimals}
      selectedIds={ids}
      onAdd={(id) => setIds((prev) => [...prev, id])}
      onRemove={(id) => setIds((prev) => prev.filter((i) => i !== id))}
      filterFn={(a) => a.gender === 'hembra'}
      label="Solo hembras"
      placeholder="Buscar hembra por numero..."
    />
  )
}

/** Ejemplo con boton Omitir y labels secundarios (estilo breeding) */
export function ExampleWithOmit() {
  const [ids, setIds] = useState<string[]>(['2', '3'])
  const hembras = mockAnimals.filter((a) => a.gender === 'hembra')

  return (
    <InputSelectAnimals
      animals={hembras}
      selectedIds={ids}
      onAdd={(id) => setIds((prev) => [...prev, id])}
      onRemove={(id) => setIds((prev) => prev.filter((i) => i !== id))}
      showOmitButton
      secondaryLabel={(a) => breedingDates[a.id]}
      label="Hembras para monta (con Omitir)"
      placeholder="Buscar hembra oveja por numero..."
    />
  )
}

/** Ejemplo deshabilitado */
export function ExampleDisabled() {
  return (
    <InputSelectAnimals
      animals={mockAnimals}
      selectedIds={['1', '5']}
      onAdd={() => {}}
      onRemove={() => {}}
      disabled
      label="Selector deshabilitado"
    />
  )
}
