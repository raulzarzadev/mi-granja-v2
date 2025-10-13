'use client'

import React, { useState, useRef, useEffect } from 'react'
import ButtonClose from '../buttons/ButtonClose'

export interface SelectSuggestOption<T = string> {
  id: string
  label: string
  secondaryLabel?: string
  data?: T
}

export interface InputSelectSuggestProps<T = string> {
  options: SelectSuggestOption<T>[]
  selectedIds: string[]
  onSelect: (id: string) => void
  onRemove?: (id: string) => void
  placeholder?: string
  emptyMessage?: string
  disabled?: boolean
  label?: string
  showRemoveButton?: boolean
  renderOption?: (
    option: SelectSuggestOption<T>,
    isSelected: boolean
  ) => React.ReactNode
  filterFunction?: (
    option: SelectSuggestOption<T>,
    searchValue: string
  ) => boolean
  id?: string
  className?: string
}

/**
 * Componente de input con autocompletado y navegación por teclado
 * Permite seleccionar múltiples opciones con búsqueda y navegación accesible
 */
export function InputSelectSuggest<T = string>({
  options,
  selectedIds,
  onSelect,
  onRemove,
  placeholder = 'Buscar...',
  emptyMessage = 'No se encontraron resultados',
  disabled = false,
  label,
  showRemoveButton = true,
  renderOption,
  filterFunction,
  id = 'select-suggest',
  className = ''
}: InputSelectSuggestProps<T>) {
  const [searchValue, setSearchValue] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const dropdownItemRefs = useRef<(HTMLDivElement | null)[]>([])

  // Ref para el contenedor completo para detectar clicks dentro/fuera
  const containerRef = useRef<HTMLDivElement>(null)

  // Ref para prevenir el cierre durante la selección
  const isSelectingRef = useRef(false)

  // Scroll automático al elemento seleccionado
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownItemRefs.current[selectedIndex]) {
      dropdownItemRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      })
    }
  }, [selectedIndex])
  const getFilteredOptions = () => {
    if (!searchValue) {
      return options // Mostrar todas las opciones cuando no hay búsqueda
    }

    return options.filter((option) => {
      if (filterFunction) {
        return filterFunction(option, searchValue)
      }
      // Búsqueda por defecto en label
      return option.label.toLowerCase().includes(searchValue.toLowerCase())
    })
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value)
    setShowDropdown(true)
    setSelectedIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const filteredOptions = getFilteredOptions()

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setShowDropdown(true)
      setSelectedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (selectedIndex >= 0 && selectedIndex < filteredOptions.length) {
        const selectedOption = filteredOptions[selectedIndex]
        // Solo seleccionar si no está ya seleccionado
        if (!selectedIds.includes(selectedOption.id)) {
          handleSelect(selectedOption.id)
        }
      } else if (
        filteredOptions.length === 1 &&
        !selectedIds.includes(filteredOptions[0].id)
      ) {
        handleSelect(filteredOptions[0].id)
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
      setSelectedIndex(-1)
    } else if (e.key === 'Tab') {
      setShowDropdown(false)
      setSelectedIndex(-1)
    }
  }

  const handleSelect = (optionId: string) => {
    isSelectingRef.current = true
    onSelect(optionId)
    setSearchValue('')
    const currentIndex = getFilteredOptions().findIndex(
      (opt) => opt.id === optionId
    )
    setSelectedIndex(currentIndex)

    // Pequeño delay para asegurar que la selección se complete
    setTimeout(() => {
      isSelectingRef.current = false
    }, 100)
  }

  const defaultRenderOption = (
    option: SelectSuggestOption<T>,
    _isSelected: boolean
  ) => (
    <>
      <div className="font-semibold text-gray-900">{option.label}</div>
      {option.secondaryLabel && (
        <div className="text-sm text-gray-600 font-medium">
          ({option.secondaryLabel})
        </div>
      )}
    </>
  )

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {label}
        </label>
      )}

      <input
        type="text"
        id={id}
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        aria-controls={`${id}-dropdown`}
        aria-activedescendant={
          selectedIndex >= 0 ? `${id}-option-${selectedIndex}` : undefined
        }
        value={searchValue}
        onChange={handleSearch}
        onKeyDown={handleKeyDown}
        onFocus={() => setShowDropdown(true)}
        onBlur={(e) => {
          // Verificar si el click fue dentro del contenedor
          const relatedTarget = e.relatedTarget as HTMLElement

          // Si estamos en proceso de selección, no cerrar
          if (isSelectingRef.current) {
            return
          }

          // Si el click fue dentro del contenedor, no cerrar
          if (containerRef.current?.contains(relatedTarget)) {
            return
          }

          // Cerrar después de un pequeño delay
          setTimeout(() => {
            if (!isSelectingRef.current) {
              setShowDropdown(false)
            }
          }, 150)
        }}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      />

      {/* Dropdown de sugerencias */}
      {showDropdown && (
        <div
          id={`${id}-dropdown`}
          role="listbox"
          className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1"
        >
          {/* Barra superior con botón cerrar (discreto) */}
          <div className="sticky top-0 z-10 flex justify-end bg-white/90 border-b border-gray-100 px-2 py-1">
            <ButtonClose
              showTitle="Cerrar selector"
              title="Cerrar"
              className="text-gray-500 hover:text-gray-700"
              onClick={() => setShowDropdown(false)}
            />
          </div>

          {getFilteredOptions().length === 0 ? (
            <div className="px-3 py-2 text-gray-600 text-sm font-medium">
              {emptyMessage}
            </div>
          ) : (
            getFilteredOptions().map((option, index) => {
              const isSelected = selectedIds.includes(option.id)
              return (
                <div
                  key={option.id}
                  ref={(el) => {
                    dropdownItemRefs.current[index] = el
                  }}
                  id={`${id}-option-${index}`}
                  role="option"
                  aria-selected={selectedIndex === index}
                  className={`flex items-center px-3 py-2 cursor-pointer w-full
                    ${
                      selectedIndex === index
                        ? 'bg-blue-100 ring-2 ring-blue-400'
                        : ''
                    }
                    ${
                      isSelected ? 'bg-green-50' : 'hover:bg-gray-100'
                    } border-b border-gray-100 last:border-b-0`}
                  onMouseDown={(e) => {
                    // Prevenir el blur del input
                    e.preventDefault()
                    handleSelect(option.id)
                  }}
                  onClick={(e) => {
                    // Fallback para dispositivos táctiles
                    e.preventDefault()
                    handleSelect(option.id)
                  }}
                >
                  <div className="w-full text-left flex items-center gap-1">
                    {renderOption
                      ? renderOption(option, isSelected)
                      : defaultRenderOption(option, isSelected)}
                  </div>

                  {showRemoveButton && isSelected && onRemove && (
                    <ButtonClose
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemove(option?.id || '')
                      }}
                      showTitle="Omitir"
                      onMouseDown={(e) => {
                        e.stopPropagation()
                      }}
                      title="Omitir hembra"
                    />
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
