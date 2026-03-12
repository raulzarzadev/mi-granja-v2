'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import AnimalBadges from '@/components/AnimalBadges'
import ButtonClose from '@/components/buttons/ButtonClose'
import { Animal } from '@/types/animals'

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
        .sort((a, b) =>
          (a!.animalNumber || '').localeCompare(b!.animalNumber || '', undefined, {
            numeric: true,
          }),
        ) as Animal[],
    [animals, selectedIds],
  )

  // Lista del dropdown: excluye animales ya seleccionados
  const dropdownItems = useMemo(() => {
    let pool = filterFn ? animals.filter(filterFn) : [...animals]
    // Ocultar los ya seleccionados
    const selectedSet = new Set(selectedIds)
    pool = pool.filter((a) => !selectedSet.has(a.id))
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
  }, [animals, selectedIds, query, filterFn])

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
        handleSelect(dropdownItems[highlightIndex].id)
      } else if (dropdownItems.length > 0) {
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
        {animal.name && <span className="text-sm text-gray-500">{animal.name}</span>}
        {secondaryLabel?.(animal) && (
          <span className="text-xs text-gray-400 ml-1.5">({secondaryLabel(animal)})</span>
        )}
      </div>
      <div className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">
        {animal.breed && <span>{animal.breed}</span>}
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
    const rowStarts = [firstTop]
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
    visibleChipCount !== null && !chipsExpanded ? selectedAnimals.length - visibleChipCount : 0

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
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-50 text-green-800 border border-green-200"
            >
              <AnimalBadges animal={a} ageFormat="rounded" />
              {!fixedIds.includes(a.id) && (
                <button
                  type="button"
                  onClick={() => onRemove(a.id)}
                  className="shrink-0 text-green-500 hover:text-red-500 font-bold leading-none"
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
                ? 'ring-1 ring-green-400 border-green-400'
                : 'border-gray-300 focus:ring-1 focus:ring-green-400 focus:border-green-400'
            } disabled:bg-gray-100 disabled:cursor-not-allowed`}
          />
          {mode === 'multi' && !isOpen && selectedIds.length === 0 && (
            <p className="text-xs text-gray-400 mt-1">
              Escribe un numero o nombre y presiona Enter para agregar.
            </p>
          )}
          {/* Dropdown */}
          {isOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {/* Cerrar selector */}
              <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm px-3 py-1.5 flex justify-end">
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

              {/* Indicacion de Enter */}
              {query.trim() && dropdownItems.length > 0 && (
                <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                  Presiona{' '}
                  <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded text-[10px] font-mono">
                    Enter
                  </kbd>{' '}
                  para agregar el primero
                </div>
              )}

              {dropdownItems.length > 0 ? (
                dropdownItems.map((animal, index) => {
                  const isHighlighted = highlightIndex === index
                  const isFirstMatch = query.trim() && index === 0 && highlightIndex === -1

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
                        handleSelect(animal.id)
                      }}
                      onMouseEnter={() => setHighlightIndex(index)}
                      className={`w-full px-3 py-2 flex items-center gap-3 transition-colors text-left border-b border-gray-100 last:border-b-0 cursor-pointer ${
                        isHighlighted || isFirstMatch
                          ? 'bg-green-50'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      {renderOption ? renderOption(animal, false) : defaultRenderOption(animal)}
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
