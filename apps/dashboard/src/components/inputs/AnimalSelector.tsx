'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import AnimalBadges from '@/components/AnimalBadges'
import { animalAge } from '@/lib/animal-utils'
import { Animal, animal_icon, gender_icon } from '@/types/animals'

export interface AnimalSelectorProps {
  /** Lista completa de animales disponibles */
  animals: Animal[]
  /** IDs seleccionados actualmente */
  selectedIds: string[]
  /** Callback al agregar un animal */
  onAdd: (id: string) => void
  /** Callback al quitar un animal */
  onRemove: (id: string) => void
  /** Modo: 'single' solo permite 1, 'multi' permite varios */
  mode?: 'single' | 'multi'
  /** Placeholder del input de búsqueda */
  placeholder?: string
  /** Label del campo */
  label?: string
  /** IDs que no se pueden quitar (pre-seleccionados fijos) */
  fixedIds?: string[]
  /** Filtro adicional sobre los animales disponibles */
  filterFn?: (animal: Animal) => boolean
}

const AnimalSelector: React.FC<AnimalSelectorProps> = ({
  animals,
  selectedIds,
  onAdd,
  onRemove,
  mode = 'multi',
  placeholder = 'Buscar por numero, nombre, tipo o raza...',
  label,
  fixedIds = [],
  filterFn,
}) => {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedAnimals = useMemo(
    () => selectedIds.map((id) => animals.find((a) => a.id === id)).filter(Boolean) as Animal[],
    [animals, selectedIds],
  )

  const filtered = useMemo(() => {
    let available = animals.filter((a) => !selectedIds.includes(a.id))
    if (filterFn) available = available.filter(filterFn)
    if (!query.trim()) return available.slice(0, 20)
    const q = query.toLowerCase()
    return available
      .filter(
        (a) =>
          (a.animalNumber || '').toLowerCase().includes(q) ||
          (a.name || '').toLowerCase().includes(q) ||
          (a.type || '').toLowerCase().includes(q) ||
          (a.breed || '').toLowerCase().includes(q),
      )
      .slice(0, 20)
  }, [animals, selectedIds, query, filterFn])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (id: string) => {
    if (mode === 'single' && selectedIds.length > 0) {
      // En modo single, reemplaza el actual
      onRemove(selectedIds[0])
    }
    onAdd(id)
    setQuery('')
    if (mode === 'single') {
      setIsOpen(false)
    } else {
      inputRef.current?.focus()
    }
  }

  return (
    <div ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      )}

      {/* Chips de seleccionados */}
      {selectedAnimals.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedAnimals.map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs bg-green-50 text-green-800 border border-green-200"
            >
              <span>{animal_icon[a.type] || '🐾'}</span>
              <span className={a.gender === 'macho' ? 'text-blue-500' : 'text-pink-500'}>
                {gender_icon[a.gender]}
              </span>
              <span className="font-medium">#{a.animalNumber}</span>
              {!fixedIds.includes(a.id) && (
                <button
                  type="button"
                  onClick={() => onRemove(a.id)}
                  className="ml-0.5 text-green-500 hover:text-red-500 font-bold leading-none"
                  title="Quitar"
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Input de búsqueda */}
      {(mode === 'multi' || selectedIds.length === 0) && (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />

          {/* Dropdown */}
          {isOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {/* Cerrar selector */}
              <div className="sticky top-0 bg-white border-b border-gray-100 px-3 py-1.5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                >
                  Cerrar selector
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </button>
              </div>

              {filtered.length > 0 ? (
                filtered.map((animal) => (
                  <button
                    key={animal.id}
                    type="button"
                    onClick={() => handleSelect(animal.id)}
                    className="w-full px-3 py-2 flex items-center gap-3 hover:bg-green-50 transition-colors text-left border-b border-gray-50 last:border-b-0"
                  >
                    <AnimalBadges animal={animal} />
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-sm text-gray-900">
                        #{animal.animalNumber}
                      </span>
                      {animal.name && (
                        <span className="text-sm text-gray-500 ml-1.5">{animal.name}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 flex-shrink-0">
                      {animal.breed && <span>{animal.breed}</span>}
                      {animal.birthDate && (
                        <span className="ml-1">{animalAge(animal, { format: 'short' })}</span>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-sm text-gray-500">
                  {query.trim() ? 'No se encontraron animales' : 'No hay animales disponibles'}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* En modo single con selección, mostrar botón para cambiar */}
      {mode === 'single' && selectedIds.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true)
            setTimeout(() => inputRef.current?.focus(), 50)
          }}
          className="text-xs text-blue-600 hover:text-blue-800 mt-1"
        >
          Cambiar animal
        </button>
      )}
    </div>
  )
}

export default AnimalSelector
