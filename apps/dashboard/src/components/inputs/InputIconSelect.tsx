'use client'

import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import type { IconType } from 'react-icons'
import { PiCaretDown, PiCheck } from 'react-icons/pi'
import { EmojiIcon } from '@/components/Icon/emoji-icons'

export type IconSelectOption<T extends string = string> = {
  value: T
  label: string
  /** Emoji de los datos (se dibuja con el mapa Phosphor) o un componente de icono */
  icon?: string | IconType | null
  description?: string
  disabled?: boolean
}

type InputIconSelectProps<T extends string> = {
  options: IconSelectOption<T>[]
  value: T | '' | null | undefined
  onChange: (value: T) => void
  id?: string
  /** Nombre del campo para formularios nativos (se envía en un input oculto) */
  name?: string
  placeholder?: string
  disabled?: boolean
  /** Marca el campo con error */
  invalid?: boolean
  onBlur?: () => void
  /** Clases extra para el botón (alto, bordes, tamaño de texto) */
  className?: string
  'aria-label'?: string
  'aria-labelledby'?: string
}

const OptionIcon = ({
  icon,
  className,
}: {
  icon?: string | IconType | null
  className: string
}) => {
  if (!icon) return null
  if (typeof icon === 'string') return <EmojiIcon emoji={icon} className={className} />
  const Icon = icon
  return <Icon className={`shrink-0 ${className}`} aria-hidden />
}

const LIST_MAX_HEIGHT = 288

/**
 * Select con iconos en el valor y en cada opción. Reemplaza al <select> nativo cuando
 * las opciones llevan icono (especie, estado, sexo, tipo de registro…).
 * Accesible con teclado: flechas, Inicio/Fin, Enter/Espacio, Esc y búsqueda por letra.
 */
export default function InputIconSelect<T extends string>({
  options,
  value,
  onChange,
  id,
  name,
  placeholder = 'Seleccionar…',
  disabled = false,
  invalid = false,
  onBlur,
  className = '',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
}: InputIconSelectProps<T>) {
  const autoId = useId()
  const buttonId = id ?? `icon-select-${autoId}`
  const listId = `${buttonId}-list`
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const typeahead = useRef({ text: '', at: 0 })

  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [position, setPosition] = useState<{
    top: number
    left: number
    width: number
    maxHeight: number
    up: boolean
  } | null>(null)

  const selectedIndex = useMemo(() => options.findIndex((o) => o.value === value), [options, value])
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null

  const enabledIndex = useCallback(
    (from: number, step: 1 | -1) => {
      for (let i = 1; i <= options.length; i++) {
        const idx = (from + step * i + options.length) % options.length
        if (!options[idx]?.disabled) return idx
      }
      return from
    },
    [options],
  )

  const openList = useCallback(
    (index?: number) => {
      if (disabled) return
      setActiveIndex(index ?? (selectedIndex >= 0 ? selectedIndex : enabledIndex(-1, 1)))
      setOpen(true)
    },
    [disabled, enabledIndex, selectedIndex],
  )

  const close = useCallback((focusButton = true) => {
    setOpen(false)
    if (focusButton) buttonRef.current?.focus()
  }, [])

  const choose = (index: number) => {
    const option = options[index]
    if (!option || option.disabled) return
    onChange(option.value)
    close()
  }

  // Posición fija junto al botón (se abre hacia arriba si no cabe abajo)
  const updatePosition = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    const spaceBelow = window.innerHeight - rect.bottom - 8
    const spaceAbove = rect.top - 8
    const up = spaceBelow < Math.min(LIST_MAX_HEIGHT, 180) && spaceAbove > spaceBelow
    setPosition({
      top: up ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      maxHeight: Math.min(LIST_MAX_HEIGHT, up ? spaceAbove : spaceBelow),
      up,
    })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, updatePosition])

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (buttonRef.current?.contains(target) || listRef.current?.contains(target)) return
      close(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, close])

  // Mantener visible la opción activa
  useEffect(() => {
    if (!open || activeIndex < 0) return
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView?.({ block: 'nearest' })
  }, [open, activeIndex])

  const handleTypeahead = (key: string) => {
    const now = Date.now()
    const state = typeahead.current
    state.text = now - state.at > 600 ? key : state.text + key
    state.at = now
    const query = state.text.toLowerCase()
    const start = open ? activeIndex : selectedIndex
    for (let i = 1; i <= options.length; i++) {
      const idx = (start + i + options.length) % options.length
      const option = options[idx]
      if (!option.disabled && option.label.toLowerCase().startsWith(query)) {
        if (open) setActiveIndex(idx)
        else onChange(option.value)
        return
      }
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (!open) openList()
        else setActiveIndex((i) => enabledIndex(i, 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        if (!open) openList()
        else setActiveIndex((i) => enabledIndex(i, -1))
        break
      case 'Home':
        if (open) {
          event.preventDefault()
          setActiveIndex(enabledIndex(-1, 1))
        }
        break
      case 'End':
        if (open) {
          event.preventDefault()
          setActiveIndex(enabledIndex(options.length, -1))
        }
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (open) choose(activeIndex)
        else openList()
        break
      case 'Escape':
        if (open) {
          event.preventDefault()
          event.stopPropagation()
          close()
        }
        break
      case 'Tab':
        if (open) close(false)
        break
      default:
        if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
          handleTypeahead(event.key)
        }
    }
  }

  const activeId = open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined

  return (
    <div className="relative">
      {name && <input type="hidden" name={name} value={value ?? ''} />}
      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={activeId}
        aria-invalid={invalid || undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        disabled={disabled}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        className={`flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg border bg-white px-3 py-2 text-left text-base text-gray-900 transition-colors hover:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60 ${
          invalid ? 'border-red-400' : open ? 'border-green-500' : 'border-gray-300'
        } ${className}`}
      >
        {selected ? (
          <>
            <OptionIcon icon={selected.icon} className="h-[18px] w-[18px] text-gray-600" />
            <span className="min-w-0 flex-1 truncate">{selected.label}</span>
          </>
        ) : (
          <span className="min-w-0 flex-1 truncate text-gray-400">{placeholder}</span>
        )}
        <PiCaretDown
          aria-hidden
          className={`h-4 w-4 shrink-0 text-gray-500 transition-transform motion-reduce:transition-none ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open &&
        position &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-labelledby={ariaLabelledby ?? buttonId}
            tabIndex={-1}
            style={{
              position: 'fixed',
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
              ...(position.up
                ? { bottom: window.innerHeight - position.top }
                : { top: position.top }),
            }}
            className="z-[10002] overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-xl"
          >
            {options.map((option, index) => {
              const isSelected = index === selectedIndex
              const isActive = index === activeIndex
              return (
                <li
                  key={option.value}
                  id={`${listId}-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  onPointerEnter={() => !option.disabled && setActiveIndex(index)}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => choose(index)}
                  className={`flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 py-2 text-base ${
                    option.disabled
                      ? 'cursor-not-allowed text-gray-300'
                      : `cursor-pointer ${isActive ? 'bg-green-50 text-green-900' : 'text-gray-800'}`
                  }`}
                >
                  <OptionIcon
                    icon={option.icon}
                    className={`h-[18px] w-[18px] ${isActive ? 'text-green-700' : 'text-gray-500'}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate ${isSelected ? 'font-semibold' : ''}`}>
                      {option.label}
                    </span>
                    {option.description && (
                      <span className="block truncate text-xs text-gray-500">
                        {option.description}
                      </span>
                    )}
                  </span>
                  {isSelected && (
                    <PiCheck aria-hidden className="h-4 w-4 shrink-0 text-green-700" />
                  )}
                </li>
              )
            })}
          </ul>,
          document.body,
        )}
    </div>
  )
}
