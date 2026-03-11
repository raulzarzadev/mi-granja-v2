'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import AnimalBadges from '@/components/AnimalBadges'
import ButtonClose from '@/components/buttons/ButtonClose'
import { animalAge } from '@/lib/animal-utils'
import { Animal, animal_icon, gender_icon } from '@/types/animals'

export interface InputSelectAnimalsProps {
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
  /** Placeholder del input de busqueda */
  placeholder?: string
  /** Label del campo */
  label?: string
  /** IDs que no se pueden quitar (pre-seleccionados fijos) */
  fixedIds?: string[]
  /** Filtro adicional sobre los animales disponibles */
  filterFn?: (animal: Animal) => boolean
  /** Render personalizado para cada opcion en el dropdown */
  renderOption?: (animal: Animal, isSelected: boolean) => React.ReactNode
  /** Texto secundario por animal (ej: info de monta) */
  secondaryLabel?: (animal: Animal) => string | undefined
  /** Mostrar boton "Omitir" en items ya seleccionados dentro del dropdown */
  showOmitButton?: boolean
  /** Deshabilitado */
  disabled?: boolean
}

const InputSelectAnimals: React.FC<InputSelectAnimalsProps> = ({
  animals,
  selectedIds,
  onAdd,
  onRemove,
  mode = 'multi',
  placeholder = 'Buscar por numero, nombre, tipo o raza...',
  label,
  fixedIds = [],
  filterFn,
  renderOption,
  secondaryLabel,
  showOmitButton = false,
  disabled = false,
}) => {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const [chipsExpanded, setChipsExpanded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const chipsRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  const selectedAnimals = useMemo(
    () =>
      selectedIds
        .map((id) => animals.find((a) => a.id === id))
        .filter(Boolean)
        .sort((a, b) => (a!.animalNumber || '').localeCompare(b!.animalNumber || '', undefined, { numeric: true })) as Animal[],
    [animals, selectedIds],
  )

  // Lista unificada: seleccionados (con marca) + disponibles
  const dropdownItems = useMemo(() => {
    let pool = filterFn ? animals.filter(filterFn) : animals
    if (!query.trim()) {
      return pool.slice(0, 30)
    }
    const q = query.toLowerCase()
    return pool
      .filter(
        (a) =>
          (a.animalNumber || '').toLowerCase().includes(q) ||
          (a.name || '').toLowerCase().includes(q) ||
          (a.type || '').toLowerCase().includes(q) ||
          (a.breed || '').toLowerCase().includes(q),
      )
      .slice(0, 30)
  }, [animals, query, filterFn])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setHighlightIndex(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Scroll into view on keyboard nav
  useEffect(() => {
    if (highlightIndex >= 0 && itemRefs.current[highlightIndex]) {
      itemRefs.current[highlightIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [highlightIndex])

  const handleSelect = (id: string) => {
    if (mode === 'single' && selectedIds.length > 0) {
      onRemove(selectedIds[0])
    }
    onAdd(id)
    setQuery('')
    setHighlightIndex(-1)
    if (mode === 'single') {
      setIsOpen(false)
    } else {
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIsOpen(true)
      setHighlightIndex((prev) => (prev < dropdownItems.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightIndex >= 0 && highlightIndex < dropdownItems.length) {
        const item = dropdownItems[highlightIndex]
        const isSelected = selectedIds.includes(item.id)
        if (isSelected) {
          if (!fixedIds.includes(item.id)) onRemove(item.id)
        } else {
          handleSelect(item.id)
        }
      } else if (dropdownItems.length === 1 && !selectedIds.includes(dropdownItems[0].id)) {
        handleSelect(dropdownItems[0].id)
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setHighlightIndex(-1)
    }
  }

  const defaultRenderOption = (animal: Animal) => (
    <>
      <AnimalBadges animal={animal} />
      <div className="min-w-0 flex-1 truncate">
        <span className="font-semibold text-sm text-gray-900">#{animal.animalNumber}</span>
        {animal.name && <span className="text-sm text-gray-500 ml-1.5">{animal.name}</span>}
        {secondaryLabel?.(animal) && (
          <span className="text-xs text-gray-400 ml-1.5">({secondaryLabel(animal)})</span>
        )}
      </div>
      <div className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">
        {animal.breed && <span>{animal.breed}</span>}
        {animal.birthDate && (
          <span className="ml-1">{animalAge(animal, { format: 'short' })}</span>
        )}
      </div>
    </>
  )

  // Calcular cuantos chips caben en ~2 filas
  const [visibleChipCount, setVisibleChipCount] = useState<number | null>(null)

  useEffect(() => {
    if (!chipsRef.current || chipsExpanded || selectedAnimals.length === 0) {
      setVisibleChipCount(null)
      return
    }
    const container = chipsRef.current
    const chips = Array.from(container.children).filter(
      (el) => !(el as HTMLElement).dataset.overflow,
    )
    if (chips.length === 0) {
      setVisibleChipCount(null)
      return
    }

    // Medir: buscar el primer chip que empieza en la 3ra fila
    const firstTop = (chips[0] as HTMLElement).offsetTop
    let rowStarts = [firstTop]
    let cutoff = chips.length

    for (let i = 1; i < chips.length; i++) {
      const top = (chips[i] as HTMLElement).offsetTop
      if (top !== rowStarts[rowStarts.length - 1]) {
        rowStarts.push(top)
        if (rowStarts.length > 2) {
          cutoff = i
          break
        }
      }
    }

    setVisibleChipCount(rowStarts.length > 2 ? cutoff : null)
  }, [selectedAnimals, chipsExpanded])

  const hiddenCount =
    visibleChipCount !== null && !chipsExpanded
      ? selectedAnimals.length - visibleChipCount
      : 0

  return (
    <div ref={containerRef}>
      {/* Label con contador */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {selectedAnimals.length > 0 && (
            <span className="text-gray-400 font-normal ml-1">({selectedAnimals.length})</span>
          )}
        </label>
      )}

      {/* Chips de seleccionados — max 2 filas con "ver" */}
      {selectedAnimals.length > 0 && (
        <div
          ref={chipsRef}
          className={`flex flex-wrap items-center gap-1.5 mb-2 ${
            !chipsExpanded && visibleChipCount !== null ? 'max-h-[4.5rem] overflow-hidden' : ''
          }`}
        >
          {selectedAnimals.map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center gap-1 w-28 px-2 py-1 rounded-full text-xs bg-green-50 text-green-800 border border-green-200"
            >
              <span className="flex-shrink-0">{animal_icon[a.type] || '\uD83D\uDC3E'}</span>
              <span className={`flex-shrink-0 ${a.gender === 'macho' ? 'text-blue-500' : 'text-pink-500'}`}>
                {gender_icon[a.gender]}
              </span>
              <span className="font-medium truncate flex-1">#{a.animalNumber}</span>
              {!fixedIds.includes(a.id) && (
                <button
                  type="button"
                  onClick={() => onRemove(a.id)}
                  className="flex-shrink-0 text-green-500 hover:text-red-500 font-bold leading-none"
                  title="Quitar"
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {/* Overflow indicator */}
      {hiddenCount > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-400">+{hiddenCount} mas</span>
          <button
            type="button"
            onClick={() => setChipsExpanded(true)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            ver
          </button>
        </div>
      )}
      {chipsExpanded && selectedAnimals.length > 0 && (
        <button
          type="button"
          onClick={() => setChipsExpanded(false)}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium mb-2"
        >
          ocultar
        </button>
      )}

      {/* Input de busqueda */}
      {(mode === 'multi' || selectedIds.length === 0) && (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={isOpen}
            aria-autocomplete="list"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setIsOpen(true)
              setHighlightIndex(-1)
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full border rounded-lg px-3 py-2 text-sm transition-colors ${
              isOpen
                ? 'ring-2 ring-green-500 border-green-500'
                : 'border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500'
            } disabled:bg-gray-100 disabled:cursor-not-allowed`}
          />

          {/* Dropdown */}
          {isOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {/* Cerrar selector */}
              <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-3 py-1.5 flex justify-end">
                <ButtonClose
                  showTitle="Cerrar selector"
                  title="Cerrar"
                  className="text-gray-400 hover:text-gray-600"
                  onClick={() => {
                    setIsOpen(false)
                    setHighlightIndex(-1)
                  }}
                />
              </div>

              {dropdownItems.length > 0 ? (
                dropdownItems.map((animal, index) => {
                  const isHighlighted = highlightIndex === index
                  const isSelected = selectedIds.includes(animal.id)
                  const isFixed = fixedIds.includes(animal.id)

                  return (
                    <div
                      key={animal.id}
                      ref={(el) => {
                        itemRefs.current[index] = el
                      }}
                      role="option"
                      aria-selected={isHighlighted}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        if (isSelected) {
                          if (!isFixed) onRemove(animal.id)
                        } else {
                          handleSelect(animal.id)
                        }
                      }}
                      onMouseEnter={() => setHighlightIndex(index)}
                      className={`w-full px-3 py-2 flex items-center gap-3 transition-colors text-left border-b border-gray-50 last:border-b-0 cursor-pointer ${
                        isSelected
                          ? isHighlighted
                            ? 'bg-green-200'
                            : 'bg-green-50'
                          : isHighlighted
                            ? 'bg-green-100'
                            : 'hover:bg-green-50'
                      }`}
                    >
                      {renderOption
                        ? renderOption(animal, isSelected)
                        : defaultRenderOption(animal)}
                      {isSelected && !isFixed && (
                        <ButtonClose
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            onRemove(animal.id)
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          showTitle="Omitir"
                          title="Omitir animal"
                        />
                      )}
                    </div>
                  )
                })
              ) : (
                <div className="p-4 text-center text-sm text-gray-500">
                  {query.trim() ? 'No se encontraron animales' : 'No hay animales disponibles'}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* En modo single con seleccion, mostrar boton para cambiar */}
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

export default InputSelectAnimals
