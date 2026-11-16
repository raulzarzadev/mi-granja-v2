'use client'

import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { PiCaretDown, PiCaretUp, PiCaretUpDown } from 'react-icons/pi'
import AnimalBadges from '@/components/AnimalBadges'
import ButtonClose from '@/components/buttons/ButtonClose'
import { EmojiIcon, IconLabel } from '@/components/Icon/emoji-icons'
import { animalMatchesSearch } from '@/lib/animal-search'
import { animalAgeInDays, computeAnimalStage } from '@/lib/animal-utils'
import { Animal, type AnimalStageKey, animals_stages } from '@/types/animals'
import type { FarmArea } from '@/types/farm'

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
  /** Contenido auxiliar alineado con el input, como filtros del selector */
  inputAccessory?: React.ReactNode
  /** Acción opcional junto al input, como lectura de una lista de imágenes */
  searchAction?: React.ReactNode
  /** IDs que no se pueden quitar (pre-seleccionados fijos) */
  fixedIds?: string[]
  /** Filtro adicional sobre los animales disponibles */
  filterFn?: (animal: Animal) => boolean
  /** Render personalizado para cada opcion en el dropdown */
  renderOption?: (animal: Animal, isSelected: boolean) => React.ReactNode
  /** Texto secundario por animal (ej: info de empadre) */
  secondaryLabel?: (animal: Animal) => string | undefined
  /** Mostrar boton "Omitir" en items ya seleccionados dentro del dropdown */
  showOmitButton?: boolean
  /** Reducir la altura del dropdown en espacios compactos como modales */
  compactDropdown?: boolean
  /** Deshabilitado */
  disabled?: boolean
  /**
   * Áreas de la granja. Si se pasa (y mode='multi'), el dropdown muestra
   * un switch "Animales | Áreas" para agregar todos los animales de un área.
   */
  areas?: FarmArea[]
  /** Agrega varios animales en una sola actualización (selección por área). Si no se
   * pasa, se llama `onAdd` por cada id. */
  onAddMany?: (ids: string[]) => void
  /** Dónde mostrar los chips de seleccionados respecto al buscador */
  selectedPosition?: 'above' | 'below'
}

type DropdownView = 'animals' | 'areas'

/** Fila recién agregada que se anima (desliza a la derecha) antes de desaparecer. */
type LeavingOption = { key: string; animal: Animal; index: number }

/** Deslizamiento de la fila agregada y subida de las filas de abajo (ms). */
const LEAVE_MS = 260
const SHIFT_MS = 180

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

type DropdownPosition = {
  opensAbove: boolean
  top: number
  left: number
  width: number
  maxHeight: number
}

type AnimalSortOption = 'selection' | 'number' | 'age' | 'gender' | 'stage' | 'breed'
type AnimalSortDirection = 'asc' | 'desc'

const animalSortOptions: Array<{ value: AnimalSortOption; label: string }> = [
  { value: 'selection', label: 'Agregación' },
  { value: 'number', label: 'Número' },
  { value: 'age', label: 'Edad' },
  { value: 'gender', label: 'Género' },
  { value: 'stage', label: 'Etapa' },
  { value: 'breed', label: 'Raza' },
]

/** Grilla compartida por encabezado y filas: número, especie, género, etapa, edad, nombre, raza. */
/** En móvil las columnas se angostan, el nombre se oculta y la raza se trunca. */
/** Filas que se pintan por tanda en la lista de animales. */
const RENDER_PAGE = 50
/** Entrada sintética de la vista Áreas para los animales sin área activa. */
const UNASSIGNED_AREA_ITEM_ID = '__unassigned__'

const OPTION_GRID =
  'grid grid-cols-[3.25rem_1.25rem_2.75rem_2.75rem_3.25rem_minmax(0,1fr)_minmax(0,5rem)] sm:grid-cols-[3.75rem_1.5rem_3.75rem_3.25rem_3.75rem_minmax(0,1fr)_minmax(0,8rem)] items-center gap-x-1'

/** Encabezados por columna (label en escritorio, short en móvil); null = sin orden. */
const columnSorts: Array<{ value: AnimalSortOption; label: string; short: string } | null> = [
  { value: 'number', label: 'Número', short: 'Núm' },
  null,
  { value: 'gender', label: 'Género', short: 'Sexo' },
  { value: 'stage', label: 'Etapa', short: 'Etapa' },
  { value: 'age', label: 'Edad', short: 'Edad' },
  null,
  { value: 'breed', label: 'Raza', short: 'Raza' },
]

const compareAnimalNumbers = (a: Animal, b: Animal, direction: AnimalSortDirection) => {
  const comparison = (a.animalNumber || '').localeCompare(b.animalNumber || '', undefined, {
    numeric: true,
  })
  return direction === 'asc' ? comparison : -comparison
}

const compareAnimalAge = (a: Animal, b: Animal, direction: AnimalSortDirection) => {
  const ageA = animalAgeInDays(a)
  const ageB = animalAgeInDays(b)

  // Animals without age stay at the end in either direction.
  if (ageA === null && ageB !== null) return 1
  if (ageA !== null && ageB === null) return -1
  if (ageA !== null && ageB !== null && ageA !== ageB) {
    return direction === 'asc' ? ageA - ageB : ageB - ageA
  }
  return compareAnimalNumbers(a, b, direction)
}

const stageSortOrder: AnimalStageKey[] = [
  ...animals_stages,
  'empadre',
  'embarazos',
  'crias_lactantes',
]
const getStageIndex = (animal: Animal) =>
  stageSortOrder.indexOf(animal.computedStage ?? computeAnimalStage(animal))

/** Compara por texto/índice; vacíos al final; empate por número ascendente. */
const compareBy = (
  a: Animal,
  b: Animal,
  valueA: string | number | undefined,
  valueB: string | number | undefined,
  direction: AnimalSortDirection,
) => {
  const emptyA = valueA === undefined || valueA === '' || valueA === -1
  const emptyB = valueB === undefined || valueB === '' || valueB === -1
  if (emptyA && !emptyB) return 1
  if (!emptyA && emptyB) return -1
  if (!emptyA && !emptyB && valueA !== valueB) {
    const comparison =
      typeof valueA === 'number' && typeof valueB === 'number'
        ? valueA - valueB
        : String(valueA).localeCompare(String(valueB), 'es', { numeric: true })
    return direction === 'asc' ? comparison : -comparison
  }
  return compareAnimalNumbers(a, b, 'asc')
}

const compareAnimals = (
  a: Animal,
  b: Animal,
  sortOption: AnimalSortOption,
  direction: AnimalSortDirection,
) => {
  if (sortOption === 'age') return compareAnimalAge(a, b, direction)
  if (sortOption === 'gender') return compareBy(a, b, a.gender, b.gender, direction)
  if (sortOption === 'stage') return compareBy(a, b, getStageIndex(a), getStageIndex(b), direction)
  if (sortOption === 'breed') return compareBy(a, b, a.breed, b.breed, direction)
  return compareAnimalNumbers(a, b, direction)
}

type DropdownRow =
  | { leaving?: undefined; animal: Animal; index: number }
  | { leaving: LeavingOption; animal: Animal; index: number }

/** Intercala las filas que se están animando en su posición original. */
const withLeavingRows = (items: Animal[], leaving: LeavingOption[]): DropdownRow[] => {
  const rows: DropdownRow[] = items.map((animal, index) => ({ animal, index }))
  for (const item of [...leaving].sort((a, b) => a.index - b.index)) {
    rows.splice(Math.min(item.index, rows.length), 0, {
      leaving: item,
      animal: item.animal,
      index: -1,
    })
  }
  return rows
}

const InputSelectAnimals: React.FC<InputSelectAnimalsProps> = ({
  animals,
  selectedIds,
  onAdd,
  onRemove,
  mode = 'multi',
  placeholder = 'Buscar por numero, nombre, tipo o raza...',
  label,
  inputAccessory,
  searchAction,
  fixedIds = [],
  filterFn,
  renderOption,
  secondaryLabel,
  disabled = false,
  compactDropdown = false,
  areas,
  onAddMany,
  selectedPosition = 'above',
}) => {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const [dropdownView, setDropdownView] = useState<DropdownView>('animals')
  const [leaving, setLeaving] = useState<LeavingOption[]>([])
  const leaveTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => leaveTimers.current.forEach(clearTimeout), [])
  // Filas que deben subir (FLIP) cuando se retira una fila fantasma
  const pendingShifts = useRef<Array<{ els: Element[]; height: number }>>([])
  const [chipsExpanded, setChipsExpanded] = useState(false)
  const [sortOption, setSortOption] = useState<AnimalSortOption>('number')
  const [sortDirection, setSortDirection] = useState<AnimalSortDirection>('asc')
  const inputId = useId()
  const sortId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const sortMenuRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const chipsRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null)

  const selectedAnimals = useMemo(() => {
    const selected = selectedIds
      .map((id) => animals.find((a) => a.id === id))
      .filter(Boolean)
      .filter((animal): animal is Animal => Boolean(animal))

    if (sortOption === 'selection') {
      return sortDirection === 'asc' ? selected : selected.reverse()
    }
    return selected.sort((a, b) => compareAnimals(a, b, sortOption, sortDirection))
  }, [animals, selectedIds, sortOption, sortDirection])

  // Lista del dropdown: excluye animales ya seleccionados
  const dropdownItems = useMemo(() => {
    let pool = filterFn ? animals.filter(filterFn) : [...animals]
    // Ocultar los ya seleccionados
    const selectedSet = new Set(selectedIds)
    pool = pool.filter((a) => !selectedSet.has(a.id))
    if (sortOption === 'selection') {
      if (sortDirection === 'desc') pool.reverse()
    } else {
      pool.sort((a, b) => compareAnimals(a, b, sortOption, sortDirection))
    }
    if (!query.trim()) return pool
    return pool.filter((animal) => animalMatchesSearch(animal, query))
  }, [animals, selectedIds, query, filterFn, sortOption, sortDirection])

  // Render incremental: se pintan RENDER_PAGE filas y se agregan más al desplazarse.
  const [visibleLimit, setVisibleLimit] = useState(RENDER_PAGE)
  useEffect(() => {
    setVisibleLimit(RENDER_PAGE)
  }, [query, sortOption, sortDirection, isOpen])
  const visibleItems = useMemo(
    () => dropdownItems.slice(0, visibleLimit),
    [dropdownItems, visibleLimit],
  )
  const hasMoreItems = visibleLimit < dropdownItems.length
  const showMoreItems = () =>
    setVisibleLimit((limit) => Math.min(limit + RENDER_PAGE, dropdownItems.length))

  const activeAreas = useMemo(
    () =>
      (areas ?? [])
        .filter((area) => area.isActive)
        .sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true })),
    [areas],
  )
  const canSelectByArea = mode === 'multi' && areas !== undefined
  const isAreasView = canSelectByArea && dropdownView === 'areas'

  // Áreas con los animales elegibles (respeta filterFn) aún no seleccionados
  const areaItems = useMemo(() => {
    if (!canSelectByArea) return []
    const pool = filterFn ? animals.filter(filterFn) : animals
    const selectedSet = new Set(selectedIds)
    const q = query.trim().toLowerCase()
    const toItem = (id: string, name: string, color: string | null, inArea: Animal[]) => ({
      id,
      name,
      color,
      total: inArea.length,
      pendingIds: inArea.filter((a) => !selectedSet.has(a.id)).map((a) => a.id),
    })
    const items = activeAreas.map((area) =>
      toItem(
        area.id,
        area.name,
        area.layout?.color ?? '#d1d5db',
        pool.filter((animal) => animal.currentAreaId === area.id),
      ),
    )
    // Animales sin área activa (sin asignar o en un área desactivada).
    if (activeAreas.length > 0) {
      const activeIds = new Set(activeAreas.map((area) => area.id))
      items.push(
        toItem(
          UNASSIGNED_AREA_ITEM_ID,
          'Sin asignar',
          null,
          pool.filter((animal) => !animal.currentAreaId || !activeIds.has(animal.currentAreaId)),
        ),
      )
    }
    return items.filter((item) => !q || item.name.toLowerCase().includes(q))
  }, [canSelectByArea, activeAreas, animals, filterFn, selectedIds, query])

  const handleSelectArea = (pendingIds: string[]) => {
    if (pendingIds.length === 0) return
    if (onAddMany) onAddMany(pendingIds)
    else for (const id of pendingIds) onAdd(id)
    setQuery('')
    setHighlightIndex(-1)
    inputRef.current?.focus()
  }

  const switchView = (view: DropdownView) => {
    setDropdownView(view)
    setHighlightIndex(-1)
    inputRef.current?.focus()
  }

  const navigableCount = isAreasView ? areaItems.length : dropdownItems.length

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      // composedPath conserva la ruta del clic aunque la opción ya se haya quitado del DOM
      // al seleccionarla (evita cerrar el selector en selección múltiple).
      const path = typeof e.composedPath === 'function' ? e.composedPath() : []
      const isInside = (el: HTMLElement | null) =>
        Boolean(el && (path.includes(el) || el.contains(target)))
      if (sortMenuRef.current && !isInside(sortMenuRef.current)) {
        setIsSortMenuOpen(false)
      }
      if (
        containerRef.current &&
        !isInside(containerRef.current) &&
        !isInside(dropdownRef.current)
      ) {
        setIsOpen(false)
        setIsSortMenuOpen(false)
        setHighlightIndex(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // El dropdown se monta en body para que el scroll del modal no lo recorte.
  useEffect(() => {
    if (!isOpen) {
      setDropdownPosition(null)
      return
    }

    const updateDropdownPosition = () => {
      const input = inputRef.current
      if (!input) return

      const rect = input.getBoundingClientRect()
      const preferredHeight = compactDropdown ? 176 : 240
      const spaceBelow = window.innerHeight - rect.bottom - 8
      const spaceAbove = rect.top - 8
      const opensAbove = spaceBelow < preferredHeight && spaceAbove > spaceBelow
      const availableSpace = Math.max(96, opensAbove ? spaceAbove : spaceBelow)
      const maxHeight = Math.min(preferredHeight, availableSpace)

      setDropdownPosition({
        opensAbove,
        top: opensAbove ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        maxHeight,
      })
    }

    updateDropdownPosition()
    window.addEventListener('resize', updateDropdownPosition)
    window.addEventListener('scroll', updateDropdownPosition, true)

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' && containerRef.current
        ? new ResizeObserver(updateDropdownPosition)
        : null
    if (resizeObserver && containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      window.removeEventListener('resize', updateDropdownPosition)
      window.removeEventListener('scroll', updateDropdownPosition, true)
      resizeObserver?.disconnect()
    }
  }, [compactDropdown, isOpen, selectedIds.length])

  // Scroll into view on keyboard nav
  useEffect(() => {
    const highlightedItem = itemRefs.current[highlightIndex]
    if (
      highlightIndex >= 0 &&
      highlightedItem &&
      typeof highlightedItem.scrollIntoView === 'function'
    ) {
      highlightedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [highlightIndex])

  const startLeave = (id: string) => {
    if (mode !== 'multi' || prefersReducedMotion()) return
    const index = dropdownItems.findIndex((animal) => animal.id === id)
    if (index < 0) return
    const key = `${id}-${Date.now()}`
    setLeaving((prev) => [...prev, { key, animal: dropdownItems[index], index }])
  }

  const removeLeaving = (key: string) =>
    setLeaving((prev) => prev.filter((item) => item.key !== key))

  /**
   * Anima solo transform/opacity (compositor, sin recalcular layout): la fila sale a la
   * derecha; al terminar se retira y las filas de abajo suben con FLIP.
   */
  const runLeave = (el: HTMLDivElement | null, key: string) => {
    // dataset evita animar dos veces (re-ejecución del ref / StrictMode)
    if (!el || el.dataset.animated) return
    el.dataset.animated = 'true'
    if (typeof el.animate !== 'function') {
      leaveTimers.current.push(setTimeout(() => removeLeaving(key), LEAVE_MS))
      return
    }
    const animation = el.animate(
      [
        { transform: 'translateX(0)', opacity: 1 },
        { transform: 'translateX(100%)', opacity: 0 },
      ],
      { duration: LEAVE_MS, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' },
    )
    animation.finished
      .then(() => {
        if (!el.isConnected) return
        const els: Element[] = []
        let next = el.nextElementSibling
        while (next) {
          els.push(next)
          next = next.nextElementSibling
        }
        pendingShifts.current.push({ els, height: el.offsetHeight })
        removeLeaving(key)
      })
      .catch(() => removeLeaving(key))
  }

  // Tras retirar la fila: las de abajo arrancan donde estaban y suben a su lugar (FLIP)
  useLayoutEffect(() => {
    const shifts = pendingShifts.current
    if (!shifts.length) return
    pendingShifts.current = []
    for (const { els, height } of shifts) {
      for (const row of els) {
        if (!row.isConnected || typeof (row as HTMLElement).animate !== 'function') continue
        ;(row as HTMLElement).animate(
          [{ transform: `translateY(${height}px)` }, { transform: 'translateY(0)' }],
          { duration: SHIFT_MS, easing: 'cubic-bezier(0, 0, 0.2, 1)' },
        )
      }
    }
  }, [leaving])

  // Al cerrar el desplegable se descartan las animaciones pendientes
  useEffect(() => {
    if (!isOpen) {
      setLeaving([])
      pendingShifts.current = []
    }
  }, [isOpen])

  const handleSelect = (id: string) => {
    startLeave(id)
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

  // Espacio solo selecciona si el resaltado viene de las flechas (no del mouse ni al escribir)
  const keyboardNavRef = useRef(false)
  // Posición de la última fila elegida con teclado: la siguiente flecha parte de ahí
  const keyboardAnchorRef = useRef<number | null>(null)

  const selectFromKeyboard = (index: number) => {
    handleSelect(dropdownItems[index].id)
    keyboardAnchorRef.current = index
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ' ' && isOpen && keyboardNavRef.current && highlightIndex >= 0) {
      e.preventDefault()
      if (isAreasView) {
        const target = areaItems[highlightIndex]
        if (target) handleSelectArea(target.pendingIds)
      } else if (highlightIndex < dropdownItems.length) {
        selectFromKeyboard(highlightIndex)
      }
      return
    }
    const anchor = highlightIndex < 0 ? keyboardAnchorRef.current : null
    if (e.key !== ' ') keyboardAnchorRef.current = null
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      keyboardNavRef.current = true
      setIsOpen(true)
      if (anchor !== null && !isAreasView && navigableCount > 0) {
        // La fila elegida salió de la lista: la de abajo ocupa ahora su índice
        setHighlightIndex(Math.min(anchor, navigableCount - 1))
        return
      }
      setHighlightIndex((prev) => {
        if (navigableCount <= 1) return 0
        if (prev < 0) return isAreasView ? 0 : 1
        const next = prev < navigableCount - 1 ? prev + 1 : prev
        if (!isAreasView && next >= visibleLimit - 5) showMoreItems()
        return next
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      keyboardNavRef.current = true
      if (anchor !== null && !isAreasView && anchor > 0) {
        setHighlightIndex(Math.min(anchor - 1, navigableCount - 1))
        return
      }
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (isAreasView) {
        const target =
          highlightIndex >= 0
            ? areaItems[highlightIndex]
            : areaItems.find((item) => item.pendingIds.length > 0)
        if (target) handleSelectArea(target.pendingIds)
        return
      }
      if (highlightIndex >= 0 && highlightIndex < dropdownItems.length) {
        selectFromKeyboard(highlightIndex)
      } else if (dropdownItems.length > 0) {
        selectFromKeyboard(0)
      }
    } else if (e.key === 'Escape') {
      // Cerrar solo el selector; no propagar a modales que también cierran con Escape
      if (isOpen) {
        e.preventDefault()
        e.stopPropagation()
      }
      setIsOpen(false)
      setHighlightIndex(-1)
    }
  }

  const defaultRenderOption = (animal: Animal) => (
    <>
      <AnimalBadges animal={animal} variant="cells" />
      {/* Celda siempre presente para no romper la grilla; el nombre solo en sm+ */}
      <div className="min-w-0 truncate" title={secondaryLabel?.(animal)}>
        {animal.name && (
          <span className="hidden text-sm text-gray-500 sm:inline">{animal.name}</span>
        )}
        {secondaryLabel?.(animal) && (
          <span className="text-xs text-gray-400 ml-1.5">({secondaryLabel(animal)})</span>
        )}
      </div>
      <div className="min-w-0 truncate text-right text-xs text-gray-400" title={animal.breed}>
        {animal.breed}
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
  const selectedSortLabel =
    animalSortOptions.find((option) => option.value === sortOption)?.label ?? 'Número'

  const sortControl = selectedAnimals.length > 1 && (
    <div ref={sortMenuRef} className="relative flex shrink-0 items-center gap-1">
      <button
        type="button"
        aria-label={`Ordenar por: ${selectedSortLabel}`}
        aria-haspopup="menu"
        aria-expanded={isSortMenuOpen}
        aria-controls={sortId}
        onClick={() => setIsSortMenuOpen((open) => !open)}
        className="inline-flex h-8 cursor-pointer items-center rounded-md border border-gray-300 bg-white px-2 text-xs font-medium text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-50 focus:border-green-400 focus:outline-none focus:ring-1 focus:ring-green-200"
      >
        Ordenar por: {selectedSortLabel}
      </button>
      {isSortMenuOpen && (
        <div
          id={sortId}
          role="menu"
          aria-label="Opciones de orden"
          className="absolute right-9 top-[calc(100%+0.35rem)] z-20 min-w-48 overflow-hidden rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
        >
          {animalSortOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitemradio"
              aria-checked={sortOption === option.value}
              onClick={() => {
                setSortOption(option.value)
                setSortDirection('asc')
                setIsSortMenuOpen(false)
                setHighlightIndex(-1)
              }}
              className={`flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                sortOption === option.value
                  ? 'bg-green-50 font-medium text-green-800'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>
                <IconLabel label={option.label} />
              </span>
              {sortOption === option.value && (
                <span aria-hidden="true">
                  <EmojiIcon emoji="✓" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        aria-label={`Cambiar orden: ${sortDirection === 'asc' ? 'ascendente' : 'descendente'}`}
        title="Cambiar sentido del orden"
        onClick={() => {
          setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))
          setHighlightIndex(-1)
        }}
        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-gray-300 bg-white text-lg leading-none text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-50 focus:border-green-400 focus:outline-none focus:ring-1 focus:ring-green-200"
      >
        <span aria-hidden="true">{sortDirection === 'asc' ? '↑' : '↓'}</span>
      </button>
    </div>
  )

  const selectedChips = (
    <>
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
              data-animal-id={a.id}
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
    </>
  )

  return (
    <div ref={containerRef}>
      {/* Label con contador */}
      {(label || sortControl) && (
        <div className="mb-1 flex min-h-8 items-center justify-between gap-2">
          {label ? (
            <label
              htmlFor={inputId}
              className="min-w-0 flex-1 truncate text-sm font-medium text-gray-700"
            >
              {label}
              {selectedAnimals.length > 0 && (
                <span className="text-gray-400 font-normal ml-1">({selectedAnimals.length})</span>
              )}
            </label>
          ) : (
            <span className="sr-only">Animales seleccionados</span>
          )}
          {sortControl}
        </div>
      )}

      {selectedPosition === 'above' && selectedChips}
      {/* Input de busqueda */}
      {(mode === 'multi' || selectedIds.length === 0) && (
        <>
          {inputAccessory && <div className="mb-1 flex justify-end">{inputAccessory}</div>}
          <div className="relative">
            <div className="flex items-start gap-2">
              <input
                ref={inputRef}
                id={inputId}
                type="text"
                role="combobox"
                aria-expanded={isOpen}
                aria-autocomplete="list"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  keyboardNavRef.current = false
                  setIsOpen(true)
                  setHighlightIndex(-1)
                }}
                onFocus={() => setIsOpen(true)}
                onKeyDown={handleKeyDown}
                placeholder={isOpen && isAreasView ? 'Buscar área...' : placeholder}
                disabled={disabled}
                className={`min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  isOpen
                    ? 'border-green-400 ring-1 ring-green-400'
                    : 'border-gray-300 focus:border-green-400 focus:ring-1 focus:ring-green-400'
                } disabled:cursor-not-allowed disabled:bg-gray-100`}
              />
              {searchAction && <div className="shrink-0">{searchAction}</div>}
            </div>
            {mode === 'multi' && !isOpen && selectedIds.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">
                Escribe un numero o nombre y presiona Enter para agregar.
              </p>
            )}
            {/* Dropdown */}
            {isOpen &&
              dropdownPosition &&
              typeof document !== 'undefined' &&
              createPortal(
                <div
                  ref={dropdownRef}
                  role="listbox"
                  style={{
                    position: 'fixed',
                    top: dropdownPosition.top,
                    left: dropdownPosition.left,
                    width: dropdownPosition.width,
                    maxHeight: dropdownPosition.maxHeight,
                    transform: dropdownPosition.opensAbove ? 'translateY(-100%)' : undefined,
                  }}
                  onScroll={(event) => {
                    const el = event.currentTarget
                    if (
                      !isAreasView &&
                      hasMoreItems &&
                      el.scrollTop + el.clientHeight >= el.scrollHeight - 160
                    )
                      showMoreItems()
                  }}
                  className="z-[100] overflow-y-auto overflow-x-hidden rounded-lg border border-gray-100 bg-white shadow-lg"
                >
                  {/* Ayuda y cerrar selector */}
                  <div className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
                    <div className="flex min-w-0 items-center justify-between gap-2 px-3 py-1.5">
                      {isAreasView ? (
                        <span className="min-w-0 truncate text-[11px] text-gray-500">
                          Toca un área para agregar sus animales
                        </span>
                      ) : dropdownItems.length > 0 ? (
                        <span className="hidden min-w-0 truncate text-[11px] text-gray-500 sm:inline">
                          {query.trim() ? (
                            <>
                              <kbd className="inline-flex h-5 items-center rounded border border-gray-300 bg-white px-1.5 font-mono text-[10px] leading-none">
                                Enter
                              </kbd>{' '}
                              agrega primero ·{' '}
                              <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-gray-300 bg-white px-1.5 font-mono text-[10px] leading-none">
                                ↓
                              </kbd>{' '}
                              selecciona otra
                            </>
                          ) : (
                            <>
                              <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-gray-300 bg-white px-1.5 font-mono text-[10px] leading-none">
                                ↓
                              </kbd>{' '}
                              seleccionar
                              {selectedIds.length > 0 && (
                                <>
                                  {' · '}
                                  <kbd className="inline-flex h-5 items-center rounded border border-gray-300 bg-white px-1.5 font-mono text-[10px] leading-none">
                                    Enter
                                  </kbd>{' '}
                                  agregar
                                </>
                              )}
                            </>
                          )}
                        </span>
                      ) : (
                        <span />
                      )}
                      {canSelectByArea && (
                        <div
                          role="radiogroup"
                          aria-label="Seleccionar por"
                          data-testid="areas-switch"
                          className="ml-auto inline-flex shrink-0 rounded-md bg-gray-100 p-0.5 text-[11px] font-medium"
                        >
                          {(
                            [
                              { value: 'animals', label: 'Animales' },
                              { value: 'areas', label: 'Áreas' },
                            ] as const
                          ).map((option) => {
                            const active = dropdownView === option.value
                            return (
                              <button
                                key={option.value}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => switchView(option.value)}
                                className={`cursor-pointer rounded px-2 py-0.5 transition-colors ${
                                  active
                                    ? 'bg-white text-green-700 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                              >
                                {option.label}
                              </button>
                            )
                          })}
                        </div>
                      )}
                      <ButtonClose
                        showTitle="Cerrar selector"
                        showTitleClassName="hidden sm:inline"
                        title="Cerrar"
                        className="shrink-0 text-gray-400 hover:text-gray-600"
                        onClick={() => {
                          setIsOpen(false)
                          setHighlightIndex(-1)
                        }}
                      />
                    </div>
                    {!isAreasView && (
                      <div
                        role="group"
                        aria-label="Ordenar lista"
                        className={`${OPTION_GRID} border-t border-gray-50 px-3 py-1 text-[11px] text-gray-500`}
                      >
                        {columnSorts.map((column, columnIndex) => {
                          if (!column) return <span key={`empty-${columnIndex}`} />
                          const { value, label, short } = column
                          const active = sortOption === value
                          const SortIcon = !active
                            ? PiCaretUpDown
                            : sortDirection === 'asc'
                              ? PiCaretUp
                              : PiCaretDown
                          return (
                            <button
                              key={value}
                              type="button"
                              aria-label={`Ordenar por ${label}${active ? (sortDirection === 'asc' ? ', ascendente' : ', descendente') : ''}`}
                              aria-pressed={active}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                if (active) {
                                  setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
                                } else {
                                  setSortOption(value)
                                  setSortDirection('asc')
                                }
                                setHighlightIndex(-1)
                              }}
                              className={`-mx-1 inline-flex cursor-pointer items-center gap-0.5 whitespace-nowrap rounded px-1 py-0.5 transition-colors hover:bg-gray-100 ${
                                value === 'breed'
                                  ? 'justify-self-end'
                                  : value === 'gender' || value === 'stage'
                                    ? 'justify-self-center'
                                    : 'justify-self-start'
                              } ${active ? 'font-semibold text-green-700' : 'hover:text-gray-700'}`}
                            >
                              <span className="sm:hidden">{short}</span>
                              <span className="hidden sm:inline">{label}</span>
                              <SortIcon
                                aria-hidden="true"
                                size={11}
                                className={`shrink-0 ${active ? '' : 'text-gray-300'}`}
                              />
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {isAreasView ? (
                    areaItems.length > 0 ? (
                      areaItems.map(({ id: areaId, name, color, total, pendingIds }, index) => {
                        const isHighlighted = highlightIndex === index
                        const isEmpty = pendingIds.length === 0
                        return (
                          <div
                            key={areaId}
                            ref={(el) => {
                              itemRefs.current[index] = el
                            }}
                            role="option"
                            aria-selected={isHighlighted}
                            aria-disabled={isEmpty}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              handleSelectArea(pendingIds)
                            }}
                            onMouseEnter={() => {
                              keyboardNavRef.current = false
                              setHighlightIndex(index)
                            }}
                            className={`flex w-full items-center gap-3 border-b border-gray-100 px-3 py-2 text-left transition-colors last:border-b-0 ${
                              isEmpty
                                ? 'cursor-not-allowed opacity-50'
                                : `cursor-pointer ${isHighlighted ? 'bg-green-100' : 'hover:bg-gray-50'}`
                            }`}
                          >
                            <span
                              aria-hidden="true"
                              className={`h-3 w-3 shrink-0 rounded-sm border ${color ? 'border-black/10' : 'border-dashed border-gray-400 bg-white'}`}
                              style={color ? { backgroundColor: color } : undefined}
                            />
                            <span
                              className={`min-w-0 flex-1 truncate text-sm font-medium ${color ? 'text-gray-800' : 'italic text-gray-600'}`}
                            >
                              {name}
                            </span>
                            <span className="shrink-0 whitespace-nowrap text-xs text-gray-500">
                              {total === 0
                                ? 'Sin animales'
                                : isEmpty
                                  ? 'Ya agregados'
                                  : `+${pendingIds.length} ${pendingIds.length === 1 ? 'animal' : 'animales'}`}
                            </span>
                          </div>
                        )
                      })
                    ) : (
                      <div className="p-4 text-center text-sm text-gray-500">
                        {activeAreas.length === 0
                          ? 'No hay áreas activas. Créalas en Animales › Áreas.'
                          : 'No se encontraron áreas'}
                      </div>
                    )
                  ) : dropdownItems.length > 0 || leaving.length > 0 ? (
                    withLeavingRows(visibleItems, leaving).map((row) => {
                      const rowClass = `w-full px-3 py-2 ${renderOption ? 'flex items-center gap-3' : OPTION_GRID} text-left border-b border-gray-100 last:border-b-0`
                      if (row.leaving) {
                        return (
                          <div
                            key={row.leaving.key}
                            ref={(el) => runLeave(el, row.leaving.key)}
                            aria-hidden="true"
                            data-leaving="true"
                            className={`${rowClass} pointer-events-none bg-green-100 will-change-transform`}
                          >
                            {renderOption
                              ? renderOption(row.animal, true)
                              : defaultRenderOption(row.animal)}
                          </div>
                        )
                      }
                      const { animal, index } = row
                      const isHighlighted = highlightIndex === index
                      const isFirstMatch = query.trim() && index === 0 && highlightIndex === -1

                      return (
                        <div
                          key={animal.id}
                          ref={(el) => {
                            itemRefs.current[index] = el
                          }}
                          role="option"
                          aria-selected={isHighlighted || Boolean(isFirstMatch)}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            handleSelect(animal.id)
                          }}
                          onMouseEnter={() => {
                            keyboardNavRef.current = false
                            setHighlightIndex(index)
                          }}
                          className={`${rowClass} transition-colors cursor-pointer ${
                            isHighlighted || isFirstMatch ? 'bg-green-100' : 'hover:bg-gray-50'
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
                  {!isAreasView && hasMoreItems ? (
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        showMoreItems()
                      }}
                      className="w-full cursor-pointer px-3 py-2 text-center text-xs text-gray-500 hover:bg-gray-50"
                    >
                      Mostrando {visibleItems.length} de {dropdownItems.length} · ver más
                    </button>
                  ) : null}
                </div>,
                document.body,
              )}
          </div>
        </>
      )}

      {selectedPosition === 'below' && selectedAnimals.length > 0 && (
        <div className="mt-2">{selectedChips}</div>
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
