'use client'

import type { DragEvent, FormEvent, PointerEvent } from 'react'
import { useMemo, useRef, useState } from 'react'
import AnimalTag from '@/components/AnimalTag'
import Button from '@/components/buttons/Button'
import { Modal } from '@/components/Modal'
import { useFarmAreasCRUD } from '@/hooks/useFarmAreasCRUD'
import { useFarmCRUD } from '@/hooks/useFarmCRUD'
import { computeAnimalStage } from '@/lib/animal-utils'
import { type Animal, animal_icon, animal_stage_config } from '@/types/animals'
import { FARM_AREA_TYPES, type FarmArea } from '@/types/farm'

type Point = { x: number; y: number }
type AreaLayout = NonNullable<FarmArea['layout']>
type Tool = 'select' | 'rect' | 'polygon'

const VIEWBOX_WIDTH = 1000
const VIEWBOX_HEIGHT = 620
const UNASSIGNED_AREA_ID = '__unassigned__'

const AREA_COLORS = ['#16a34a', '#0f766e', '#d97706', '#2563eb', '#9333ea', '#dc2626']

// Cursor lápiz para el modo dibujo (crosshair como fallback). Hotspot en la punta.
const PENCIL_CURSOR =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23111827' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 20h9'/%3E%3Cpath d='M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z'/%3E%3C/svg%3E\") 2 22, crosshair"

const areaTypeLabels: Record<FarmArea['type'], string> = {
  pasture: 'Pastizal',
  barn: 'Establo',
  feeding: 'Alimentación',
  storage: 'Almacén',
  medical: 'Área médica',
  other: 'Otro',
}

const areaTypeIcons: Record<FarmArea['type'], string> = {
  pasture: '🌿',
  barn: '🏚️',
  feeding: '🌾',
  storage: '📦',
  medical: '🏥',
  other: '📍',
}

function ColorSwatches({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {AREA_COLORS.map((color) => {
        const selected = value.toLowerCase() === color.toLowerCase()
        return (
          <button
            key={color}
            type="button"
            aria-label={`Color ${color}`}
            aria-pressed={selected}
            onClick={() => onChange(color)}
            style={{ backgroundColor: color }}
            className={`h-7 w-7 cursor-pointer rounded-full transition ${
              selected
                ? 'ring-2 ring-gray-900 ring-offset-2'
                : 'ring-1 ring-black/10 hover:ring-gray-400'
            }`}
          />
        )
      })}
    </div>
  )
}

interface FarmMapEditorProps {
  areas: FarmArea[]
  animalsByArea: Map<string, Animal[]>
  matchingAnimalIds: Set<string>
  hasFilters: boolean
  selectedAnimalId: string
  savingIds: Set<string>
  onSelectAnimal: (animalId: string) => void
  onMoveAnimal: (animalId: string, areaId: string) => Promise<void>
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

const pointsToSvg = (points: Point[]) =>
  points.map((point) => `${point.x * VIEWBOX_WIDTH},${point.y * VIEWBOX_HEIGHT}`).join(' ')

const pointToSvg = (point: Point) => ({
  x: point.x * VIEWBOX_WIDTH,
  y: point.y * VIEWBOX_HEIGHT,
})

const rectLayoutFromPoints = (a: Point, b: Point, color: string): AreaLayout => {
  const minX = Math.min(a.x, b.x)
  const maxX = Math.max(a.x, b.x)
  const minY = Math.min(a.y, b.y)
  const maxY = Math.max(a.y, b.y)

  return {
    kind: 'rect',
    coordinateSystem: 'normalized',
    color,
    points: [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ],
  }
}

const getBounds = (points: Point[]) => {
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

const createFallbackLayout = (index: number, total: number, color: string): AreaLayout => {
  const columns = Math.min(3, Math.max(1, Math.ceil(Math.sqrt(total || 1))))
  const rows = Math.max(1, Math.ceil((total || 1) / columns))
  const gap = 0.035
  const cellWidth = (1 - gap * (columns + 1)) / columns
  const cellHeight = (1 - gap * (rows + 1)) / rows
  const column = index % columns
  const row = Math.floor(index / columns)
  const x = gap + column * (cellWidth + gap)
  const y = gap + row * (cellHeight + gap)

  return rectLayoutFromPoints(
    { x, y },
    { x: Math.min(0.96, x + cellWidth), y: Math.min(0.94, y + cellHeight) },
    color,
  )
}

export default function FarmMapEditor({
  areas,
  animalsByArea,
  matchingAnimalIds,
  hasFilters,
  selectedAnimalId,
  savingIds,
  onSelectAnimal,
  onMoveAnimal,
}: FarmMapEditorProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const { currentFarm } = useFarmCRUD()
  const { createArea, updateArea, deleteArea } = useFarmAreasCRUD()
  const [tool, setTool] = useState<Tool>('select')
  const [selectedAreaId, setSelectedAreaId] = useState('')
  const [localLayouts, setLocalLayouts] = useState<Map<string, AreaLayout>>(new Map())
  const [dirtyAreaIds, setDirtyAreaIds] = useState<Set<string>>(new Set())
  const [drawingRectStart, setDrawingRectStart] = useState<Point | null>(null)
  const [draftLayout, setDraftLayout] = useState<AreaLayout | null>(null)
  const [polygonPoints, setPolygonPoints] = useState<Point[]>([])
  const [moveDrag, setMoveDrag] = useState<{
    areaId: string
    start: Point
    originalPoints: Point[]
  } | null>(null)
  const [vertexDrag, setVertexDrag] = useState<{ areaId: string; pointIndex: number } | null>(null)
  const [pendingLayout, setPendingLayout] = useState<AreaLayout | null>(null)
  const [isAreaEditorOpen, setIsAreaEditorOpen] = useState(false)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [menuAnimalId, setMenuAnimalId] = useState<string | null>(null)
  const [isSavingArea, setIsSavingArea] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [areaForm, setAreaForm] = useState({
    name: '',
    type: 'pasture' as FarmArea['type'],
    capacity: '',
    description: '',
    color: AREA_COLORS[0],
  })
  const [areaEditForm, setAreaEditForm] = useState({
    name: '',
    type: 'pasture' as FarmArea['type'],
    capacity: '',
    description: '',
    color: AREA_COLORS[0],
  })
  const [assignAnimalSearch, setAssignAnimalSearch] = useState('')

  const activeAreas = useMemo(() => areas.filter((area) => area.isActive), [areas])

  const displayedAreas = useMemo(
    () =>
      activeAreas.map((area, index) => {
        const color = area.layout?.color || AREA_COLORS[index % AREA_COLORS.length]
        const layout =
          localLayouts.get(area.id) ||
          area.layout ||
          createFallbackLayout(index, activeAreas.length, color)

        return { area, layout }
      }),
    [activeAreas, localLayouts],
  )

  const getCanvasPoint = (event: PointerEvent<SVGSVGElement | SVGElement>): Point | null => {
    const svg = svgRef.current
    if (!svg) return null

    const point = svg.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY
    const matrix = svg.getScreenCTM()
    if (!matrix) return null

    const transformed = point.matrixTransform(matrix.inverse())
    return {
      x: clamp01(transformed.x / VIEWBOX_WIDTH),
      y: clamp01(transformed.y / VIEWBOX_HEIGHT),
    }
  }

  const markLayoutDirty = (areaId: string, layout: AreaLayout) => {
    setLocalLayouts((prev) => {
      const next = new Map(prev)
      next.set(areaId, layout)
      return next
    })
    setDirtyAreaIds((prev) => new Set(prev).add(areaId))
  }

  const openCreateModal = (layout: AreaLayout) => {
    setPendingLayout(layout)
    setAreaForm({
      name: '',
      type: 'pasture',
      capacity: '',
      description: '',
      color: layout.color || AREA_COLORS[0],
    })
  }

  const finishPolygon = () => {
    if (polygonPoints.length < 3) return
    openCreateModal({
      kind: 'polygon',
      coordinateSystem: 'normalized',
      points: polygonPoints,
      color: AREA_COLORS[activeAreas.length % AREA_COLORS.length],
    })
    setPolygonPoints([])
    setTool('select')
  }

  const cancelCurrentAction = () => {
    setDrawingRectStart(null)
    setDraftLayout(null)
    setPolygonPoints([])
    setMoveDrag(null)
    setVertexDrag(null)
    setTool('select')
    if (selectedAreaId) {
      setLocalLayouts((prev) => {
        const next = new Map(prev)
        next.delete(selectedAreaId)
        return next
      })
      setDirtyAreaIds((prev) => {
        const next = new Set(prev)
        next.delete(selectedAreaId)
        return next
      })
    }
  }

  const beginCreatePolygon = () => {
    cancelCurrentAction()
    setSelectedAreaId('')
    setError(null)
    setTool('rect')
  }

  const changeCreateTool = (nextTool: Extract<Tool, 'rect' | 'polygon'>) => {
    setDrawingRectStart(null)
    setDraftLayout(null)
    setPolygonPoints([])
    setTool(nextTool)
  }

  const handleCanvasPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    const point = getCanvasPoint(event)
    if (!point) return

    if (tool === 'rect') {
      event.currentTarget.setPointerCapture(event.pointerId)
      setDrawingRectStart(point)
      setDraftLayout(
        rectLayoutFromPoints(point, point, AREA_COLORS[activeAreas.length % AREA_COLORS.length]),
      )
      return
    }

    if (tool === 'polygon') {
      setPolygonPoints((prev) => [...prev, point])
      return
    }

    setSelectedAreaId('')
  }

  const handleAreaPointerDown = (
    event: PointerEvent<SVGGElement>,
    areaId: string,
    layout: AreaLayout,
  ) => {
    if (tool !== 'select') return
    event.stopPropagation()
    const point = getCanvasPoint(event)
    if (!point) return

    setSelectedAreaId(areaId)
    svgRef.current?.setPointerCapture(event.pointerId)
    setMoveDrag({ areaId, start: point, originalPoints: layout.points })
  }

  const handleVertexPointerDown = (
    event: PointerEvent<SVGCircleElement>,
    areaId: string,
    pointIndex: number,
  ) => {
    event.stopPropagation()
    svgRef.current?.setPointerCapture(event.pointerId)
    setSelectedAreaId(areaId)
    setVertexDrag({ areaId, pointIndex })
  }

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const point = getCanvasPoint(event)
    if (!point) return

    if (drawingRectStart) {
      setDraftLayout(
        rectLayoutFromPoints(
          drawingRectStart,
          point,
          AREA_COLORS[activeAreas.length % AREA_COLORS.length],
        ),
      )
      return
    }

    if (moveDrag) {
      const deltaX = point.x - moveDrag.start.x
      const deltaY = point.y - moveDrag.start.y
      const bounds = getBounds(moveDrag.originalPoints)
      const safeDeltaX = Math.min(1 - bounds.maxX, Math.max(-bounds.minX, deltaX))
      const safeDeltaY = Math.min(1 - bounds.maxY, Math.max(-bounds.minY, deltaY))
      const area = displayedAreas.find((item) => item.area.id === moveDrag.areaId)
      if (!area) return

      markLayoutDirty(moveDrag.areaId, {
        ...area.layout,
        points: moveDrag.originalPoints.map((original) => ({
          x: clamp01(original.x + safeDeltaX),
          y: clamp01(original.y + safeDeltaY),
        })),
      })
      return
    }

    if (vertexDrag) {
      const area = displayedAreas.find((item) => item.area.id === vertexDrag.areaId)
      if (!area) return

      markLayoutDirty(vertexDrag.areaId, {
        ...area.layout,
        points: area.layout.points.map((current, index) =>
          index === vertexDrag.pointIndex ? point : current,
        ),
      })
    }
  }

  const handlePointerUp = () => {
    if (drawingRectStart && draftLayout) {
      const bounds = getBounds(draftLayout.points)
      if (bounds.width > 0.015 && bounds.height > 0.015) {
        openCreateModal(draftLayout)
        setTool('select')
      }
    }

    setDrawingRectStart(null)
    setDraftLayout(null)
    setMoveDrag(null)
    setVertexDrag(null)
  }

  const handleDropAnimal = async (event: DragEvent<Element>, areaId: string) => {
    event.preventDefault()
    setDropTargetId(null)
    const animalId = event.dataTransfer.getData('text/plain')
    if (animalId) {
      await onMoveAnimal(animalId, areaId)
    }
  }

  const handleCreateArea = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!pendingLayout || !currentFarm?.id || !areaForm.name.trim()) return

    setIsSavingArea(true)
    setError(null)
    try {
      const createdArea = await createArea(currentFarm.id, {
        name: areaForm.name.trim(),
        type: areaForm.type,
        capacity: areaForm.capacity ? Number(areaForm.capacity) : null,
        description: areaForm.description.trim(),
        isActive: true,
        notes: '',
        layout: { ...pendingLayout, color: areaForm.color },
      })
      setPendingLayout(null)
      setSelectedAreaId(createdArea.id)
    } catch (err) {
      console.error('Error creating mapped area:', err)
      setError('No se pudo crear el área dibujada. Intenta de nuevo.')
    } finally {
      setIsSavingArea(false)
    }
  }

  const handleSaveSelected = async () => {
    const layout = selectedAreaId ? localLayouts.get(selectedAreaId) : null
    if (!selectedAreaId || !layout) return

    setIsSavingArea(true)
    setError(null)
    try {
      await updateArea(selectedAreaId, { layout })
      setDirtyAreaIds((prev) => {
        const next = new Set(prev)
        next.delete(selectedAreaId)
        return next
      })
      setLocalLayouts((prev) => {
        const next = new Map(prev)
        next.delete(selectedAreaId)
        return next
      })
    } catch (err) {
      console.error('Error saving area layout:', err)
      setError('No se pudo guardar el lienzo del área. Intenta de nuevo.')
    } finally {
      setIsSavingArea(false)
    }
  }

  const handleDeleteSelected = async () => {
    if (!selectedAreaId) return
    const group = animalsByArea.get(selectedAreaId) ?? []
    if (group.length > 0) {
      setError('Solo puedes eliminar áreas sin animales asignados.')
      return
    }

    setIsSavingArea(true)
    setError(null)
    try {
      await deleteArea(selectedAreaId)
      setSelectedAreaId('')
    } catch (err) {
      console.error('Error deleting area:', err)
      setError('No se pudo eliminar el área. Intenta de nuevo.')
    } finally {
      setIsSavingArea(false)
    }
  }

  const renderAnimalChip = (animal: Animal, compact = false) => {
    const isDimmed = hasFilters && !matchingAnimalIds.has(animal.id)
    const isSaving = savingIds.has(animal.id)
    const isMenuOpen = menuAnimalId === animal.id
    const currentAreaId = animal.currentAreaId ?? UNASSIGNED_AREA_ID

    const handleReassign = async (areaId: string) => {
      setMenuAnimalId(null)
      if (areaId === currentAreaId) return
      await onMoveAnimal(animal.id, areaId)
    }

    const kebab = (
      <button
        type="button"
        aria-label={`Reasignar área de ${animal.animalNumber}`}
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
        disabled={isSaving}
        onClick={(event) => {
          event.stopPropagation()
          setMenuAnimalId(isMenuOpen ? null : animal.id)
        }}
        className="-mr-1 ml-0.5 flex h-5 w-4 shrink-0 cursor-pointer items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed"
      >
        ⋮
      </button>
    )

    return (
      <div key={animal.id} className="relative inline-flex max-w-full items-center">
        <div
          role="button"
          tabIndex={0}
          draggable
          onClick={(event) => {
            event.stopPropagation()
            onSelectAnimal(animal.id)
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return
            event.preventDefault()
            event.stopPropagation()
            onSelectAnimal(animal.id)
          }}
          onDragStart={(event) => {
            event.dataTransfer.setData('text/plain', animal.id)
            event.dataTransfer.effectAllowed = 'move'
          }}
          className={`inline-flex max-w-full items-center rounded-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1 ${
            compact ? 'overflow-hidden' : ''
          } ${isSaving ? 'opacity-50' : ''} ${isDimmed ? 'opacity-25' : ''}`}
          title={`Animal ${animal.animalNumber}`}
        >
          <AnimalTag
            animal={animal}
            active={selectedAnimalId === animal.id}
            showAge
            trailing={compact ? undefined : kebab}
          />
        </div>

        {!compact && isMenuOpen ? (
          <>
            <button
              type="button"
              aria-hidden
              tabIndex={-1}
              className="fixed inset-0 z-10 cursor-default"
              onClick={(event) => {
                event.stopPropagation()
                setMenuAnimalId(null)
              }}
            />
            <div
              role="menu"
              className="absolute right-0 top-full z-20 mt-1 max-h-60 w-48 overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
            >
              <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Mover a área
              </p>
              <button
                type="button"
                role="menuitem"
                onClick={(event) => {
                  event.stopPropagation()
                  handleReassign(UNASSIGNED_AREA_ID)
                }}
                disabled={currentAreaId === UNASSIGNED_AREA_ID}
                className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-default disabled:text-gray-400"
              >
                Sin área
                {currentAreaId === UNASSIGNED_AREA_ID ? <span aria-hidden>✓</span> : null}
              </button>
              {activeAreas.map((area) => (
                <button
                  key={area.id}
                  type="button"
                  role="menuitem"
                  onClick={(event) => {
                    event.stopPropagation()
                    handleReassign(area.id)
                  }}
                  disabled={currentAreaId === area.id}
                  className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-default disabled:text-gray-400"
                >
                  <span className="truncate">
                    <span aria-hidden="true">{areaTypeIcons[area.type]}</span> {area.name}
                  </span>
                  {currentAreaId === area.id ? <span aria-hidden>✓</span> : null}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>
    )
  }

  // Mini-avatar para mostrar muchos animales dentro de un área del lienzo sin ocupar espacio.
  const renderAnimalAvatar = (animal: Animal) => {
    const isMale = animal.gender === 'macho'
    const isDimmed = hasFilters && !matchingAnimalIds.has(animal.id)
    const isSaving = savingIds.has(animal.id)
    const stageCfg = animal_stage_config[animal.computedStage ?? computeAnimalStage(animal)]
    const title = `#${animal.animalNumber}${stageCfg ? ` · ${stageCfg.label}` : ''} · ${
      isMale ? 'Macho' : 'Hembra'
    }`

    return (
      <div
        key={animal.id}
        role="button"
        tabIndex={0}
        draggable
        title={title}
        aria-label={title}
        onClick={(event) => {
          event.stopPropagation()
          onSelectAnimal(animal.id)
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          event.stopPropagation()
          onSelectAnimal(animal.id)
        }}
        onDragStart={(event) => {
          event.dataTransfer.setData('text/plain', animal.id)
          event.dataTransfer.effectAllowed = 'move'
        }}
        className={`relative inline-flex h-6 max-w-full cursor-grab items-center gap-0.5 rounded-md border bg-white py-0.5 pl-1 pr-1.5 leading-none shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
          selectedAnimalId === animal.id
            ? 'border-green-500 ring-1 ring-green-500'
            : 'border-gray-200'
        } ${isSaving ? 'opacity-50' : ''} ${isDimmed ? 'opacity-25' : ''}`}
      >
        <span aria-hidden="true" className="text-xs">
          {animal_icon[animal.type]}
        </span>
        {stageCfg ? (
          <span aria-hidden="true" className="text-xs" title={stageCfg.label}>
            {stageCfg.icon}
          </span>
        ) : null}
        <span
          aria-hidden="true"
          className={`h-2 w-2 shrink-0 rounded-full ${isMale ? 'bg-blue-500' : 'bg-pink-500'}`}
        />
        <span className="truncate text-[11px] font-semibold text-gray-800">
          {animal.animalNumber}
        </span>
      </div>
    )
  }

  const selectedArea = activeAreas.find((area) => area.id === selectedAreaId)
  const selectedAreaHasAnimals = selectedAreaId
    ? (animalsByArea.get(selectedAreaId) ?? []).length > 0
    : false
  const canSaveDirtyArea = selectedAreaId ? dirtyAreaIds.has(selectedAreaId) : false
  const isCreating = tool === 'rect' || tool === 'polygon'
  const saveSelectedLabel = isSavingArea
    ? 'Guardando...'
    : canSaveDirtyArea
      ? 'Guardar cambios'
      : 'Guardado'

  const openSelectedAreaEditor = () => {
    if (!selectedArea) return
    setAreaEditForm({
      name: selectedArea.name,
      type: selectedArea.type,
      capacity: selectedArea.capacity ? String(selectedArea.capacity) : '',
      description: selectedArea.description || '',
      color: selectedArea.layout?.color || AREA_COLORS[0],
    })
    setError(null)
    setAssignAnimalSearch('')
    setIsAreaEditorOpen(true)
  }

  // Saca todos los animales del área seleccionada a "Pendientes de asignar".
  const emptySelectedArea = async () => {
    if (!selectedArea) return
    const group = animalsByArea.get(selectedArea.id) ?? []
    setError(null)
    for (const animal of group) {
      await onMoveAnimal(animal.id, UNASSIGNED_AREA_ID)
    }
  }

  const handleSaveAreaDetails = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedArea || !areaEditForm.name.trim()) return

    setIsSavingArea(true)
    setError(null)
    try {
      await updateArea(selectedArea.id, {
        name: areaEditForm.name.trim(),
        type: areaEditForm.type,
        capacity: areaEditForm.capacity ? Number(areaEditForm.capacity) : null,
        description: areaEditForm.description.trim(),
        ...(selectedArea.layout
          ? { layout: { ...selectedArea.layout, color: areaEditForm.color } }
          : {}),
      })
      setIsAreaEditorOpen(false)
    } catch (err) {
      console.error('Error updating area details:', err)
      setError('No se pudo actualizar el corral. Intenta de nuevo.')
    } finally {
      setIsSavingArea(false)
    }
  }

  const selectedAreaAnimals = selectedAreaId ? (animalsByArea.get(selectedAreaId) ?? []) : []
  const assignableAnimals = useMemo(() => {
    const searchValue = assignAnimalSearch.trim().toLowerCase()
    if (!selectedAreaId || !searchValue) return []

    return Array.from(animalsByArea.entries())
      .filter(([areaId]) => areaId !== selectedAreaId)
      .flatMap(([, group]) => group)
      .filter((animal) =>
        [animal.animalNumber, animal.name, animal.breed, animal.notes]
          .filter(Boolean)
          .some((item) => item!.toLowerCase().includes(searchValue)),
      )
      .sort((a, b) => a.animalNumber.localeCompare(b.animalNumber, 'es', { numeric: true }))
      .slice(0, 8)
  }, [animalsByArea, assignAnimalSearch, selectedAreaId])

  // Animales sin área, narrowed a los que coinciden con los filtros activos.
  const unassignedAnimals = useMemo(() => {
    const all = animalsByArea.get(UNASSIGNED_AREA_ID) ?? []
    if (!hasFilters) return all
    return all.filter((animal) => matchingAnimalIds.has(animal.id))
  }, [animalsByArea, hasFilters, matchingAnimalIds])

  return (
    <div className="space-y-4">
      <section
        aria-label="Pendientes de asignar"
        onDragOver={(event) => {
          event.preventDefault()
          setDropTargetId(UNASSIGNED_AREA_ID)
        }}
        onDragLeave={() => setDropTargetId(null)}
        onDrop={(event) => handleDropAnimal(event, UNASSIGNED_AREA_ID)}
        className={`rounded-lg border bg-white p-4 transition ${
          dropTargetId === UNASSIGNED_AREA_ID ? 'border-green-500 bg-green-50' : 'border-gray-200'
        }`}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Pendientes de asignar</h3>
            <p className="text-xs text-gray-500">
              Arrastra chips al lienzo o selecciónalos y usa el destino manual.
            </p>
          </div>
          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
            {unassignedAnimals.length}
          </span>
        </div>
        {(animalsByArea.get(UNASSIGNED_AREA_ID) ?? []).length === 0 ? (
          <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-center text-sm text-gray-500">
            Todos los animales visibles tienen área.
          </div>
        ) : unassignedAnimals.length === 0 ? (
          <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-center text-sm text-gray-500">
            Ningún animal sin área coincide con los filtros.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {unassignedAnimals.map((animal) => renderAnimalChip(animal))}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              {isCreating
                ? 'Creando área'
                : selectedArea
                  ? `Editando ${selectedArea.name}`
                  : 'Lienzo de áreas'}
            </p>
            <p className="text-xs text-gray-500">
              {tool === 'rect'
                ? 'Arrastra sobre el lienzo para dibujar el cuadro.'
                : tool === 'polygon'
                  ? 'Haz click para agregar puntos. Guarda cuando tengas al menos tres.'
                  : selectedArea
                    ? 'Arrastra el área completa o mueve sus puntos.'
                    : 'Selecciona un área para editarla o crea una nueva.'}
            </p>
          </div>

          <div
            className="flex flex-wrap items-center gap-2"
            role="toolbar"
            aria-label="Acciones de área"
          >
            {!isCreating ? (
              <Button size="sm" color="success" onClick={beginCreatePolygon}>
                Crear área
              </Button>
            ) : null}

            {isCreating ? (
              <>
                <div
                  className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1"
                  role="group"
                  aria-label="Forma del área"
                >
                  <button
                    type="button"
                    onClick={() => changeCreateTool('rect')}
                    className={`min-h-9 rounded-md px-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 ${
                      tool === 'rect'
                        ? 'bg-white text-green-800 shadow-sm ring-1 ring-green-500'
                        : 'text-gray-600 hover:bg-white'
                    }`}
                  >
                    Cuadrado
                  </button>
                  <button
                    type="button"
                    onClick={() => changeCreateTool('polygon')}
                    className={`min-h-9 rounded-md px-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 ${
                      tool === 'polygon'
                        ? 'bg-white text-green-800 shadow-sm ring-1 ring-green-500'
                        : 'text-gray-600 hover:bg-white'
                    }`}
                  >
                    Polígono
                  </button>
                </div>
                <Button
                  size="sm"
                  color="success"
                  disabled={isSavingArea || tool !== 'polygon' || polygonPoints.length < 3}
                  onClick={finishPolygon}
                >
                  Guardar dibujo
                </Button>
                <Button size="sm" color="neutral" variant="outline" onClick={cancelCurrentAction}>
                  Cancelar
                </Button>
              </>
            ) : null}

            {selectedArea && !isCreating ? (
              <>
                <Button
                  size="sm"
                  color="neutral"
                  variant="outline"
                  onClick={openSelectedAreaEditor}
                >
                  Editar
                </Button>
                <Button
                  size="sm"
                  color={canSaveDirtyArea ? 'success' : 'neutral'}
                  variant={canSaveDirtyArea ? 'filled' : 'outline'}
                  disabled={isSavingArea || !canSaveDirtyArea}
                  onClick={handleSaveSelected}
                >
                  {saveSelectedLabel}
                </Button>
                {canSaveDirtyArea ? (
                  <Button size="sm" color="neutral" variant="outline" onClick={cancelCurrentAction}>
                    Descartar
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  color="error"
                  variant="outline"
                  disabled={selectedAreaHasAnimals || isSavingArea}
                  onClick={handleDeleteSelected}
                >
                  Eliminar
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {error ? (
          <p className="mx-4 mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="relative bg-stone-50">
          <svg
            ref={svgRef}
            role="img"
            aria-label="Lienzo de áreas de la granja"
            viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
            className="block h-[520px] w-full touch-none select-none"
            style={isCreating ? { cursor: PENCIL_CURSOR } : undefined}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onDoubleClick={() => {
              if (tool === 'polygon') finishPolygon()
            }}
          >
            <defs>
              <pattern id="farm-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#d6d3d1" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#farm-grid)" />

            {displayedAreas.map(({ area, layout }) => {
              const points = pointsToSvg(layout.points)
              const bounds = getBounds(layout.points)
              const labelX = bounds.minX * VIEWBOX_WIDTH + 12
              const labelY = bounds.minY * VIEWBOX_HEIGHT + 12
              const boxWidth = Math.max(160, Math.min(260, bounds.width * VIEWBOX_WIDTH - 24))
              const boxHeight = Math.max(104, Math.min(170, bounds.height * VIEWBOX_HEIGHT - 24))
              const group = animalsByArea.get(area.id) ?? []
              const isSelected = selectedAreaId === area.id
              const capacityLabel = area.capacity
                ? `${group.length}/${area.capacity}`
                : `${group.length}`

              return (
                <g
                  key={area.id}
                  onPointerDown={(event) => handleAreaPointerDown(event, area.id, layout)}
                  onDragOver={(event) => {
                    event.preventDefault()
                    setDropTargetId(area.id)
                  }}
                  onDragLeave={() => setDropTargetId(null)}
                  onDrop={(event) => handleDropAnimal(event, area.id)}
                  className="cursor-move"
                >
                  <polygon
                    points={points}
                    fill={layout.color || '#16a34a'}
                    fillOpacity={dropTargetId === area.id ? 0.3 : 0.16}
                    stroke={isSelected ? '#111827' : layout.color || '#16a34a'}
                    strokeWidth={isSelected ? 4 : 2}
                    strokeLinejoin="round"
                  />
                  <foreignObject
                    x={labelX}
                    y={labelY}
                    width={boxWidth}
                    height={boxHeight}
                    className="pointer-events-auto"
                  >
                    <div className="h-full overflow-hidden rounded-md border border-white/70 bg-white/90 p-2 shadow-sm backdrop-blur">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-gray-900">
                            <span aria-hidden="true">{areaTypeIcons[area.type]}</span> {area.name}
                          </p>
                          <p className="truncate text-[11px] font-medium text-gray-500">
                            {areaTypeLabels[area.type]}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                          {capacityLabel}
                        </span>
                      </div>
                      {area.description ? (
                        <p className="mt-1 line-clamp-2 text-[11px] text-gray-500">
                          {area.description}
                        </p>
                      ) : null}
                      <div className="mt-2 flex max-h-20 flex-wrap gap-1 overflow-hidden">
                        {group.slice(0, 12).map((animal) => renderAnimalAvatar(animal))}
                        {group.length > 12 ? (
                          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-gray-100 px-1 text-[11px] font-semibold text-gray-600">
                            +{group.length - 12}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </foreignObject>

                  {isSelected
                    ? layout.points.map((point, index) => {
                        const svgPoint = pointToSvg(point)
                        return (
                          <circle
                            key={`${area.id}-${index}`}
                            cx={svgPoint.x}
                            cy={svgPoint.y}
                            r={8}
                            fill="#ffffff"
                            stroke="#111827"
                            strokeWidth={3}
                            className="cursor-grab"
                            onPointerDown={(event) =>
                              handleVertexPointerDown(event, area.id, index)
                            }
                          />
                        )
                      })
                    : null}
                </g>
              )
            })}

            {draftLayout ? (
              <polygon
                points={pointsToSvg(draftLayout.points)}
                fill={draftLayout.color}
                fillOpacity={0.18}
                stroke={draftLayout.color}
                strokeDasharray="10 8"
                strokeWidth={3}
              />
            ) : null}

            {polygonPoints.length > 0 ? (
              <g>
                <polyline
                  points={pointsToSvg(polygonPoints)}
                  fill="none"
                  stroke="#16a34a"
                  strokeDasharray="10 8"
                  strokeWidth={3}
                />
                {polygonPoints.map((point, index) => {
                  const svgPoint = pointToSvg(point)
                  return (
                    <circle
                      key={`${point.x}-${point.y}-${index}`}
                      cx={svgPoint.x}
                      cy={svgPoint.y}
                      r={6}
                      fill="#16a34a"
                    />
                  )
                })}
              </g>
            ) : null}
          </svg>

          {activeAreas.length === 0 && !pendingLayout ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
              <div className="max-w-sm rounded-lg border border-dashed border-gray-300 bg-white/95 px-4 py-5 text-center shadow-sm">
                <p className="text-sm font-semibold text-gray-900">Dibuja tu primera área</p>
                <p className="mt-1 text-sm text-gray-500">
                  Usa Crear área. Cuadrado es el modo inicial; también puedes cambiar a polígono.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <Modal
        isOpen={Boolean(pendingLayout)}
        onClose={() => setPendingLayout(null)}
        title="Guardar área dibujada"
        size="md"
      >
        <form onSubmit={handleCreateArea} className="space-y-4">
          <div>
            <label
              htmlFor="mapped-area-name"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Nombre del área *
            </label>
            <input
              id="mapped-area-name"
              type="text"
              required
              value={areaForm.name}
              onChange={(event) => setAreaForm((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Ej. Potrero norte"
            />
          </div>
          <div>
            <label
              htmlFor="mapped-area-type"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Tipo *
            </label>
            <select
              id="mapped-area-type"
              value={areaForm.type}
              onChange={(event) =>
                setAreaForm((prev) => ({ ...prev, type: event.target.value as FarmArea['type'] }))
              }
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {FARM_AREA_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="mapped-area-capacity"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Capacidad
            </label>
            <input
              id="mapped-area-capacity"
              type="number"
              min="1"
              value={areaForm.capacity}
              onChange={(event) =>
                setAreaForm((prev) => ({ ...prev, capacity: event.target.value }))
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Número máximo de animales"
            />
          </div>
          <div>
            <label
              htmlFor="mapped-area-description"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Descripción
            </label>
            <textarea
              id="mapped-area-description"
              rows={3}
              value={areaForm.description}
              onChange={(event) =>
                setAreaForm((prev) => ({ ...prev, description: event.target.value }))
              }
              className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Notas visibles dentro del lienzo"
            />
          </div>
          <div>
            <span className="mb-2 block text-sm font-medium text-gray-700">Color</span>
            <ColorSwatches
              value={areaForm.color}
              onChange={(color) => setAreaForm((prev) => ({ ...prev, color }))}
            />
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
            <Button
              type="button"
              color="neutral"
              variant="outline"
              disabled={isSavingArea}
              onClick={() => setPendingLayout(null)}
            >
              Cancelar
            </Button>
            <Button type="submit" color="success" disabled={isSavingArea || !areaForm.name.trim()}>
              {isSavingArea ? 'Guardando...' : 'Guardar área'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isAreaEditorOpen && Boolean(selectedArea)}
        onClose={() => setIsAreaEditorOpen(false)}
        title={selectedArea ? `Editar ${selectedArea.name}` : 'Editar área'}
        size="lg"
      >
        <form onSubmit={handleSaveAreaDetails} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="edit-area-name"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Título del corral *
              </label>
              <input
                id="edit-area-name"
                type="text"
                required
                value={areaEditForm.name}
                onChange={(event) =>
                  setAreaEditForm((prev) => ({ ...prev, name: event.target.value }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label
                htmlFor="edit-area-type"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Tipo
              </label>
              <select
                id="edit-area-type"
                value={areaEditForm.type}
                onChange={(event) =>
                  setAreaEditForm((prev) => ({
                    ...prev,
                    type: event.target.value as FarmArea['type'],
                  }))
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {FARM_AREA_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
            <div>
              <label
                htmlFor="edit-area-capacity"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Capacidad
              </label>
              <input
                id="edit-area-capacity"
                type="number"
                min="1"
                value={areaEditForm.capacity}
                onChange={(event) =>
                  setAreaEditForm((prev) => ({ ...prev, capacity: event.target.value }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label
                htmlFor="edit-area-description"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Descripción
              </label>
              <input
                id="edit-area-description"
                type="text"
                value={areaEditForm.description}
                onChange={(event) =>
                  setAreaEditForm((prev) => ({ ...prev, description: event.target.value }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium text-gray-700">Color</span>
            <ColorSwatches
              value={areaEditForm.color}
              onChange={(color) => setAreaEditForm((prev) => ({ ...prev, color }))}
            />
          </div>

          <section className="border-t border-gray-200 pt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-900">Animales en el corral</h3>
              <div className="flex items-center gap-2">
                {selectedAreaAnimals.length > 0 ? (
                  <Button
                    type="button"
                    size="xs"
                    color="neutral"
                    variant="outline"
                    onClick={emptySelectedArea}
                  >
                    Sacar todos a pendientes
                  </Button>
                ) : null}
                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                  {selectedAreaAnimals.length}
                </span>
              </div>
            </div>
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-2">
              {selectedAreaAnimals.length === 0 ? (
                <p className="px-2 py-4 text-center text-sm text-gray-500">
                  No hay animales asignados.
                </p>
              ) : (
                selectedAreaAnimals.map((animal) => (
                  <div
                    key={animal.id}
                    className="flex min-h-11 items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-2 py-1"
                  >
                    {renderAnimalChip(animal, true)}
                    <Button
                      type="button"
                      size="xs"
                      color="neutral"
                      variant="outline"
                      disabled={savingIds.has(animal.id)}
                      onClick={() => onMoveAnimal(animal.id, UNASSIGNED_AREA_ID)}
                    >
                      Quitar
                    </Button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section>
            <label
              htmlFor="assign-area-animal"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Asignar animal a esta área
            </label>
            <input
              id="assign-area-animal"
              type="search"
              value={assignAnimalSearch}
              onChange={(event) => setAssignAnimalSearch(event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Buscar por número, nombre, raza o notas..."
            />
            {assignAnimalSearch.trim() ? (
              <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-2">
                {assignableAnimals.length === 0 ? (
                  <p className="px-2 py-4 text-center text-sm text-gray-500">
                    No encontré animales para asignar.
                  </p>
                ) : (
                  assignableAnimals.map((animal) => (
                    <div
                      key={animal.id}
                      className="flex min-h-11 items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-2 py-1"
                    >
                      {renderAnimalChip(animal, true)}
                      <Button
                        type="button"
                        size="xs"
                        color="success"
                        variant="outline"
                        disabled={savingIds.has(animal.id) || !selectedArea}
                        onClick={() => {
                          if (!selectedArea) return
                          onMoveAnimal(animal.id, selectedArea.id)
                          setAssignAnimalSearch('')
                        }}
                      >
                        Asignar
                      </Button>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </section>

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
            <Button
              type="button"
              color="neutral"
              variant="outline"
              disabled={isSavingArea}
              onClick={() => setIsAreaEditorOpen(false)}
            >
              Cerrar
            </Button>
            <Button
              type="submit"
              color="success"
              disabled={isSavingArea || !areaEditForm.name.trim()}
            >
              {isSavingArea ? 'Guardando...' : 'Guardar datos'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export { UNASSIGNED_AREA_ID }
