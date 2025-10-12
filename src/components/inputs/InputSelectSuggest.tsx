'use client'

import React, { useState, useRef, useEffect } from 'react'
import ButtonClose from '../buttons/ButtonClose'

export interface SelectSuggestOption<T = string> {
  id: string
  label: string
  secondaryLabel?: string
  data?: T
}

interface InputSelectSuggestProps<T = string> {
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
function InputSelectSuggest<T = string>({
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
  const dropdownItemRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Scroll automático al elemento seleccionado
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownItemRefs.current[selectedIndex]) {
      dropdownItemRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      })
    }
  }, [selectedIndex])

  // Filtrar opciones según búsqueda
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
          onSelect(selectedOption.id)
          setSelectedIndex(-1)
          setSearchValue('')
        }
      } else if (
        filteredOptions.length === 1 &&
        !selectedIds.includes(filteredOptions[0].id)
      ) {
        onSelect(filteredOptions[0].id)
        setSearchValue('')
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
    onSelect(optionId)
    setSearchValue('')
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
    <div className={`relative ${className}`}>
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
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
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
          {getFilteredOptions().length === 0 ? (
            <div className="px-3 py-2 text-gray-600 text-sm font-medium">
              {emptyMessage}
            </div>
          ) : (
            getFilteredOptions().map((option, index) => {
              const isSelected = selectedIds.includes(option.id)
              return (
                <button
                  key={option.id}
                  className={`flex items-center  px-3 py-2 cursor-pointer w-full ${
                    isSelected
                      ? 'bg-green-50 '
                      : selectedIndex === index
                      ? 'bg-blue-100 ring-2 ring-blue-400 hover:bg-gray-100 focus:bg-gray-100'
                      : 'hover:bg-gray-100 focus:bg-gray-100'
                  }
                  border-b border-gray-100 last:border-b-0
                  `}
                  onClick={() => {
                    handleSelect(option.id)
                  }}
                  type="button"
                >
                  <div
                    // type="button"
                    id={`${id}-option-${index}`}
                    role="option"
                    aria-selected={selectedIndex === index}
                    // ref={(el) => {
                    //   dropdownItemRefs.current[index] = el
                    // }}
                    className={`w-full text-left focus:outline-none  flex items-center gap-1 transition-colors cursor-pointer`}
                  >
                    {renderOption
                      ? renderOption(option, isSelected)
                      : defaultRenderOption(option, isSelected)}
                  </div>

                  {showRemoveButton && isSelected && onRemove && (
                    <ButtonClose
                      onClick={() => onRemove(option?.id || '')}
                      title="Quitar hembra"
                    />
                  )}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

export default InputSelectSuggest
