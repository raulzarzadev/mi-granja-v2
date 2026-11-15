'use client'

import type { DragEvent, FormEvent, PointerEvent } from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { PiCaretRight, PiCheck, PiMapTrifold, PiMinus, PiPlus, PiTable } from 'react-icons/pi'
import AnimalTag from '@/components/AnimalTag'
import Button from '@/components/buttons/Button'
import ButtonConfirm from '@/components/buttons/ButtonConfirm'
import { EmojiIcon } from '@/components/Icon/emoji-icons'
import AreaSizeInput from '@/components/inputs/AreaSizeInput'
import AutoGrowTextarea from '@/components/inputs/AutoGrowTextarea'
import InputIconSelect from '@/components/inputs/InputIconSelect'
import InputSelectAnimals from '@/components/inputs/InputSelectAnimals'
import { Modal } from '@/components/Modal'
import { useFarmAreasCRUD } from '@/hooks/useFarmAreasCRUD'
import { useFarmCRUD } from '@/hooks/useFarmCRUD'
import { animalMatchesSearch } from '@/lib/animal-search'
import type { Animal } from '@/types/animals'
import { FARM_AREA_TYPES, type FarmArea } from '@/types/farm'
import FarmAreasTable from './FarmAreasTable'
import FarmMapToolbar from './FarmMapToolbar'

type Point = { x: number; y: number }
type AreaLayout = NonNullable<FarmArea['layout']>
type Tool = 'select' | 'polygon'

const VIEWBOX_WIDTH = 2000
const VIEWBOX_HEIGHT = 1240
const UNASSIGNED_AREA_ID = '__unassigned__'

const AREA_COLORS = ['#16a34a', '#0f766e', '#d97706', '#2563eb', '#9333ea', '#dc2626']
const AREA_COLOR_LABELS = ['Verde', 'Turquesa', 'Naranja', 'Azul', 'Morado', 'Rojo']

// Cursor lápiz para el modo dibujo (crosshair como fallback). Hotspot en la punta.
const PENCIL_CURSOR =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23111827' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 20h9'/%3E%3Cpath d='M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z'/%3E%3C/svg%3E\") 2 22, crosshair"

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
      {AREA_COLORS.map((color, index) => {
        const selected = value.toLowerCase() === color.toLowerCase()
        return (
          <button
            key={color}
            type="button"
            aria-label={`Color ${AREA_COLOR_LABELS[index]}`}
            aria-pressed={selected}
            onClick={() => onChange(color)}
            className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 ${
              selected ? 'bg-gray-100' : 'hover:bg-gray-50'
            }`}
          >
            <span
              style={{ backgroundColor: color }}
              className="flex h-7 w-7 items-center justify-center rounded-full ring-1 ring-black/10"
            >
              {selected ? <PiCheck aria-hidden="true" size={18} className="text-white" /> : null}
            </span>
          </button>
        )
      })}
      <label
        className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl hover:bg-gray-50 focus-within:ring-2 focus-within:ring-green-600"
        title="Elegir otro color"
      >
        <span
          aria-hidden="true"
          className="flex h-7 w-7 items-center justify-center rounded-full ring-1 ring-black/10"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, #ffffffaa, transparent 65%), radial-gradient(circle at 20% 20%, #ef4444, transparent 65%), radial-gradient(circle at 80% 20%, #facc15, transparent 65%), radial-gradient(circle at 80% 80%, #22c55e, transparent 65%), radial-gradient(circle at 20% 80%, #3b82f6, transparent 65%), #a855f7',
          }}
        >
          <PiPlus size={18} className="text-white drop-shadow" />
        </span>
        <input
          type="color"
          aria-label="Elegir otro color"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#16a34a'}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  )
}

interface FarmMapEditorProps {
  areas: FarmArea[]
  animalsByArea: Map<string, Animal[]>
  selectedAnimalId: string
  savingIds: Set<string>
  onSelectAnimal: (animalId: string) => void
  onMoveAnimal: (
    animalId: string,
    areaId: string,
    waitForPersistence?: boolean,
    expectedFromAreaId?: string | null,
  ) => Promise<void>
  /** Vista inicial. Por defecto tabla. */
  defaultView?: 'map' | 'table'
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

const isFinitePoint = (point: unknown): point is Point => {
  if (!point || typeof point !== 'object') return false
  const candidate = point as Partial<Point>
  return typeof candidate.x === 'number' && typeof candidate.y === 'number'
}

const normalizeLayoutPoints = (points: unknown): Point[] | null => {
  if (!Array.isArray(points) || points.length < 3 || !points.every(isFinitePoint)) return null

  const hasPixelCoordinates = points.some((point) => point.x > 1 || point.y > 1)
  const normalized = points.map((point) => ({
    x: clamp01(hasPixelCoordinates ? point.x / VIEWBOX_WIDTH : point.x),
    y: clamp01(hasPixelCoordinates ? point.y / VIEWBOX_HEIGHT : point.y),
  }))
  const bounds = getBounds(normalized)

  if (bounds.width <= 0.001 || bounds.height <= 0.001) return null
  return normalized
}

const normalizeStoredLayout = (
  layout: FarmArea['layout'] | undefined,
  fallback: AreaLayout,
): AreaLayout => {
  if (!layout) return fallback

  const normalizedPoints = normalizeLayoutPoints(layout.points)
  if (!normalizedPoints) return fallback

  return {
    kind: layout.kind === 'polygon' ? 'polygon' : 'rect',
    coordinateSystem: 'normalized',
    color: layout.color || fallback.color,
    points: normalizedPoints,
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

/** Cuadrado por defecto para áreas creadas desde la tabla; se escalona para no encimarse. */
const createDefaultSquareLayout = (index: number, color: string): AreaLayout => {
  const width = 0.16
  const height = (width * VIEWBOX_WIDTH) / VIEWBOX_HEIGHT
  const offset = (index % 8) * 0.04
  const x = 0.06 + offset
  const y = 0.08 + offset
  return rectLayoutFromPoints({ x, y }, { x: x + width, y: y + height }, color)
}

export default function FarmMapEditor({
  areas,
  animalsByArea,
  selectedAnimalId,
  savingIds,
  onSelectAnimal,
  onMoveAnimal,
  defaultView = 'table',
}: FarmMapEditorProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [viewMode, setViewMode] = useState<'map' | 'table'>(defaultView)
  const mapPosition = useRef<{ left: number; top: number } | null>(null)
  const changeView = (next: 'map' | 'table') => {
    if (viewMode === 'map' && viewportRef.current)
      mapPosition.current = {
        left: viewportRef.current.scrollLeft,
        top: viewportRef.current.scrollTop,
      }
    setViewMode(next)
  }
  useLayoutEffect(() => {
    if (viewMode === 'map' && mapPosition.current && viewportRef.current) {
      viewportRef.current.scrollLeft = mapPosition.current.left
      viewportRef.current.scrollTop = mapPosition.current.top
    }
  }, [viewMode])
  const [zoom, setZoom] = useState(100)
  const zoomAnchor = useRef<{ x: number; y: number } | null>(null)
  const changeZoom = (nextZoom: number) => {
    const next = Math.max(50, Math.min(200, nextZoom))
    const viewport = viewportRef.current
    if (next === zoom || !viewport) return
    zoomAnchor.current = {
      x: (viewport.scrollLeft + viewport.clientWidth / 2) / viewport.scrollWidth,
      y: (viewport.scrollTop + viewport.clientHeight / 2) / viewport.scrollHeight,
    }
    setZoom(next)
  }
  useLayoutEffect(() => {
    const viewport = viewportRef.current
    const anchor = zoomAnchor.current
    if (!viewport || !anchor) return
    viewport.scrollTo({
      left: anchor.x * viewport.scrollWidth - viewport.clientWidth / 2,
      top: anchor.y * viewport.scrollHeight - viewport.clientHeight / 2,
      behavior: 'instant',
    })
    zoomAnchor.current = null
  }, [zoom])
  const centerCanvasOnOpen = useCallback((viewport: HTMLDivElement | null) => {
    viewportRef.current = viewport
    if (!viewport) return
    viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2
    viewport.scrollTop = (viewport.scrollHeight - viewport.clientHeight) / 2
  }, [])
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [canvasScale, setCanvasScale] = useState(1)
  const canvasObserver = useRef<ResizeObserver | null>(null)
  const attachCanvas = useCallback((canvas: SVGSVGElement | null) => {
    canvasObserver.current?.disconnect()
    svgRef.current = canvas
    if (!canvas) return
    const measure = () =>
      setCanvasScale(Math.max(0.05, canvas.getBoundingClientRect().width / VIEWBOX_WIDTH))
    measure()
    canvasObserver.current = new ResizeObserver(measure)
    canvasObserver.current.observe(canvas)
  }, [])
  const startAnimalDrag = (event: DragEvent<HTMLElement>, animalId: string) => {
    event.stopPropagation()
    event.dataTransfer.setData('text/plain', animalId)
    event.dataTransfer.effectAllowed = 'move'
    const bounds = event.currentTarget.getBoundingClientRect()
    event.dataTransfer.setDragImage(
      event.currentTarget,
      event.clientX - bounds.left,
      event.clientY - bounds.top,
    )
  }
  const panDrag = useRef<{
    pointerId: number
    x: number
    y: number
    left: number
    top: number
  } | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [handTool, setHandTool] = useState(false)
  const [spacePressed, setSpacePressed] = useState(false)
  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      if (
        event.code !== 'Space' ||
        (event.target instanceof Element &&
          event.target.closest('input, textarea, select, button, [contenteditable="true"]'))
      )
        return
      if (!(event.target instanceof Node) || !viewportRef.current?.contains(event.target)) return
      event.preventDefault()
      setSpacePressed(true)
    }
    const keyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') setSpacePressed(false)
    }
    const reset = () => {
      setSpacePressed(false)
      panDrag.current = null
      setIsPanning(false)
    }
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    window.addEventListener('blur', reset)
    return () => {
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      window.removeEventListener('blur', reset)
    }
  }, [])
  const { currentFarm } = useFarmCRUD()
  const { createArea, updateArea, deleteArea } = useFarmAreasCRUD()
  const [tool, setTool] = useState<Tool>('select')
  const [selectedAreaId, setSelectedAreaId] = useState('')
  const [expandedAreaDetails, setExpandedAreaDetails] = useState<Set<string>>(new Set())
  const [frontAreaId, setFrontAreaId] = useState('')
  const [emptyAreaError, setEmptyAreaError] = useState<string | null>(null)
  const [deleteAreaOpen, setDeleteAreaOpen] = useState(false)
  const [moveAnimalTarget, setMoveAnimalTarget] = useState<Animal | null>(null)
  const [localLayouts, setLocalLayouts] = useState<Map<string, AreaLayout>>(new Map())
  const [dirtyAreaIds, setDirtyAreaIds] = useState<Set<string>>(new Set())
  const [polygonPoints, setPolygonPoints] = useState<Point[]>([])
  const [moveDrag, setMoveDrag] = useState<{
    areaId: string
    start: Point
    originalPoints: Point[]
    clientX: number
    clientY: number
  } | null>(null)
  const [vertexDrag, setVertexDrag] = useState<{ areaId: string; pointIndex: number } | null>(null)
  const [pendingLayout, setPendingLayout] = useState<AreaLayout | null>(null)
  // true cuando el área se crea desde la tabla (cuadrado por defecto, sin dibujo)
  const [isQuickCreate, setIsQuickCreate] = useState(false)
  const [isAreaEditorOpen, setIsAreaEditorOpen] = useState(false)
  const [areaEditId, setAreaEditId] = useState('')
  const [isUnassignedOpen, setIsUnassignedOpen] = useState(false)
  const [unassignedSearch, setUnassignedSearch] = useState('')
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [isSavingArea, setIsSavingArea] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [areaForm, setAreaForm] = useState({
    name: '',
    type: 'pasture' as FarmArea['type'],
    areaM2: '',
    description: '',
    color: AREA_COLORS[0],
  })
  const [areaEditForm, setAreaEditForm] = useState({
    name: '',
    type: 'pasture' as FarmArea['type'],
    areaM2: '',
    description: '',
    color: AREA_COLORS[0],
  })

  useEffect(() => {
    if (!dirtyAreaIds.size && !polygonPoints.length && !pendingLayout) return
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [dirtyAreaIds.size, polygonPoints.length, pendingLayout])

  const activeAreas = useMemo(() => areas.filter((area) => area.isActive), [areas])

  const displayedAreas = useMemo(
    () =>
      activeAreas.map((area, index) => {
        const color = area.layout?.color || AREA_COLORS[index % AREA_COLORS.length]
        const fallbackLayout = createFallbackLayout(index, activeAreas.length, color)
        const layout =
          localLayouts.get(area.id) || normalizeStoredLayout(area.layout, fallbackLayout)

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
    const lastAreaNumber = (currentFarm?.areas ?? areas).reduce((last, area) => {
      const match =
        area.name.trim().match(/^\u00e1?rea\s+(\d+)$/i) || area.name.trim().match(/^area\s+(\d+)$/i)
      return match ? Math.max(last, Number(match[1])) : last
    }, 0)
    setPendingLayout(layout)
    setAreaForm({
      name: `Área ${lastAreaNumber + 1}`,
      type: 'pasture',
      areaM2: '',
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

  const openQuickCreate = () => {
    cancelCurrentAction()
    setError(null)
    setIsQuickCreate(true)
    openCreateModal(
      createDefaultSquareLayout(
        activeAreas.length,
        AREA_COLORS[activeAreas.length % AREA_COLORS.length],
      ),
    )
  }

  const returnToDrawing = () => {
    if (isSavingArea) return
    if (isQuickCreate) {
      setPendingLayout(null)
      setIsQuickCreate(false)
      setError(null)
      return
    }
    if (pendingLayout) setPolygonPoints(pendingLayout.points)
    setPendingLayout(null)
    setTool('polygon')
    setError(null)
  }

  const cancelCurrentAction = () => {
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
    setSelectedAreaId('')
  }

  const beginCreatePolygon = () => {
    cancelCurrentAction()
    setSelectedAreaId('')
    setError(null)
    setTool('polygon')
    setHandTool(false)
  }

  const beginPan = (event: PointerEvent<SVGSVGElement>) => {
    const viewport = viewportRef.current
    if (!viewport || panDrag.current) return
    event.preventDefault()
    viewport.focus({ preventScroll: true })
    event.currentTarget.setPointerCapture(event.pointerId)
    panDrag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: viewport.scrollLeft,
      top: viewport.scrollTop,
    }
    setIsPanning(true)
  }

  const handleCanvasPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return
    if (tool === 'select') {
      beginPan(event)
      if (!dirtyAreaIds.has(selectedAreaId)) setSelectedAreaId('')
      return
    }
    viewportRef.current?.focus({ preventScroll: true })
    const point = getCanvasPoint(event)
    if (!point) return

    if (tool === 'polygon') {
      if (polygonPoints.length > 0) {
        const matrix = svgRef.current?.getScreenCTM()
        const first = pointToSvg(polygonPoints[0])
        if (matrix) {
          const screenX = matrix.a * first.x + matrix.c * first.y + matrix.e
          const screenY = matrix.b * first.x + matrix.d * first.y + matrix.f
          if (Math.hypot(event.clientX - screenX, event.clientY - screenY) <= 22) {
            finishPolygon()
            return
          }
        }
      }
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
    if (tool !== 'select' || isSavingArea) return
    event.stopPropagation()
    if (areaId !== selectedAreaId) {
      void selectAreaForEditing(areaId)
      return
    }
    const point = getCanvasPoint(event)
    if (!point) return

    setSelectedAreaId(areaId)
    svgRef.current?.setPointerCapture(event.pointerId)
    setMoveDrag({
      areaId,
      start: point,
      originalPoints: layout.points,
      clientX: event.clientX,
      clientY: event.clientY,
    })
  }

  const handleVertexPointerDown = (
    event: PointerEvent<SVGCircleElement>,
    areaId: string,
    pointIndex: number,
  ) => {
    if (tool !== 'select' || isSavingArea) return
    event.stopPropagation()
    svgRef.current?.setPointerCapture(event.pointerId)
    setSelectedAreaId(areaId)
    setVertexDrag({ areaId, pointIndex })
  }

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const pan = panDrag.current
    if (pan && viewportRef.current) {
      if (pan.pointerId !== event.pointerId) return
      event.preventDefault()
      viewportRef.current.scrollTo({
        left: pan.left - (event.clientX - pan.x),
        top: pan.top - (event.clientY - pan.y),
        behavior: 'instant',
      })
      return
    }
    const point = getCanvasPoint(event)
    if (!point) return

    if (moveDrag) {
      if (Math.hypot(event.clientX - moveDrag.clientX, event.clientY - moveDrag.clientY) < 4) return
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
    panDrag.current = null
    setIsPanning(false)
    setMoveDrag(null)
    setVertexDrag(null)
  }

  const handleDropAnimal = (event: DragEvent<Element>, areaId: string) => {
    event.preventDefault()
    event.stopPropagation()
    setDropTargetId(null)
    const animalId = event.dataTransfer.getData('text/plain')
    if (animalId) {
      void onMoveAnimal(animalId, areaId, false).catch(() => {
        setError('No se pudo mover el animal. Intenta de nuevo.')
      })
      if (areaId !== UNASSIGNED_AREA_ID) void selectAreaForEditing(areaId)
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
        areaM2: areaForm.areaM2 ? Number(areaForm.areaM2) : null,
        description: areaForm.description.trim(),
        isActive: true,
        notes: '',
        layout: { ...pendingLayout, color: areaForm.color },
      })
      setPendingLayout(null)
      setIsQuickCreate(false)
      setSelectedAreaId(createdArea.id)
    } catch (err) {
      console.error('Error creating mapped area:', err)
      setError(
        isQuickCreate
          ? 'No se pudo crear el área. Intenta de nuevo.'
          : 'No se pudo crear el área dibujada. Intenta de nuevo.',
      )
    } finally {
      setIsSavingArea(false)
    }
  }

  const handleSaveSelected = async () => {
    const layout = selectedAreaId ? localLayouts.get(selectedAreaId) : null
    if (!selectedAreaId || isSavingArea) return false
    if (!dirtyAreaIds.has(selectedAreaId) || !layout) {
      setSelectedAreaId('')
      return true
    }

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
      setSelectedAreaId('')
      return true
    } catch (err) {
      console.error('Error saving area layout:', err)
      setError('No se pudo guardar el lienzo del área. Intenta de nuevo.')
      return false
    } finally {
      setIsSavingArea(false)
    }
  }

  const selectAreaForEditing = async (areaId: string) => {
    if (isSavingArea) return false
    if (areaId !== selectedAreaId && dirtyAreaIds.has(selectedAreaId)) {
      if (!(await handleSaveSelected())) return false
    }
    if (activeAreas.some((area) => area.id === areaId)) {
      setSelectedAreaId(areaId)
      return true
    }
    return false
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
      setDeleteAreaOpen(false)
    } catch (err) {
      console.error('Error deleting area:', err)
      setError('No se pudo eliminar el área. Intenta de nuevo.')
    } finally {
      setIsSavingArea(false)
    }
  }

  const openAnimalMove = (animal: Animal) => {
    if (savingIds.has(animal.id)) return
    onSelectAnimal(animal.id)
    setMoveAnimalTarget(animal)
  }
  const moveAnimalFromDialog = (areaId: string) => {
    if (!moveAnimalTarget) return
    const animal = moveAnimalTarget
    setMoveAnimalTarget(null)
    void onMoveAnimal(animal.id, areaId, false).catch(() => {
      setError('No se pudo mover el animal. Intenta de nuevo.')
    })
    if (areaId !== UNASSIGNED_AREA_ID && !isAreaEditorOpen) void selectAreaForEditing(areaId)
  }

  const renderAnimalChip = (animal: Animal, compact = false) => {
    const isSaving = savingIds.has(animal.id)
    return (
      <button
        key={animal.id}
        type="button"
        draggable={!isSaving}
        disabled={isSaving}
        aria-label={`Mover animal ${animal.animalNumber}`}
        title={`Mover animal ${animal.animalNumber}`}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation()
          openAnimalMove(animal)
        }}
        onDragStart={(event) => startAnimalDrag(event, animal.id)}
        className="inline-flex min-h-11 max-w-full shrink-0 cursor-grab items-center rounded-xl p-0.5 text-left active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 disabled:cursor-wait disabled:opacity-50"
      >
        <AnimalTag
          animal={animal}
          active={selectedAnimalId === animal.id}
          size="md"
          showAge={!compact}
        />
      </button>
    )
  }
  const renderAnimalAvatar = (animal: Animal) => renderAnimalChip(animal, true)

  const selectedArea = activeAreas.find((area) => area.id === selectedAreaId)
  const editedArea = activeAreas.find((area) => area.id === areaEditId)
  const selectedAreaHasAnimals = selectedAreaId
    ? (animalsByArea.get(selectedAreaId) ?? []).length > 0
    : false
  const canSaveDirtyArea = selectedAreaId ? dirtyAreaIds.has(selectedAreaId) : false
  const isCreating = tool === 'polygon'

  // El dibujo solo existe en el mapa: al pasar a tabla se descarta para que
  // "Crear área" vuelva a estar disponible.
  useEffect(() => {
    if (viewMode !== 'table' || tool !== 'polygon') return
    setPolygonPoints([])
    setTool('select')
  }, [viewMode, tool])

  const openAreaEditor = (area: FarmArea) => {
    setAreaEditId(area.id)
    setAreaEditForm({
      name: area.name,
      type: area.type,
      areaM2: area.areaM2 != null ? String(area.areaM2) : '',
      description: area.description || '',
      color:
        displayedAreas.find((item) => item.area.id === area.id)?.layout.color || AREA_COLORS[0],
    })
    setError(null)
    setIsAreaEditorOpen(true)
  }

  // Saca todos los animales del área seleccionada a "Pendientes de asignar".
  const emptySelectedArea = async () => {
    if (!selectedArea) return
    const group = animalsByArea.get(selectedArea.id) ?? []
    setEmptyAreaError(null)
    try {
      for (const animal of group) {
        await onMoveAnimal(animal.id, UNASSIGNED_AREA_ID, true, selectedArea.id)
      }
    } catch (error) {
      setEmptyAreaError(
        'No se pudo completar. Los animales ya movidos permanecen en pendientes; vuelve a confirmar para sacar los restantes.',
      )
      throw error
    }
  }

  const handleSaveAreaDetails = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editedArea || isSavingArea || !areaEditForm.name.trim()) return

    setIsSavingArea(true)
    setError(null)
    try {
      await updateArea(editedArea.id, {
        name: areaEditForm.name.trim(),
        type: areaEditForm.type,
        areaM2: areaEditForm.areaM2 ? Number(areaEditForm.areaM2) : null,
        description: areaEditForm.description.trim(),
        ...(editedArea.layout
          ? { layout: { ...editedArea.layout, color: areaEditForm.color } }
          : {}),
      })
      setLocalLayouts((previous) => {
        const draft = previous.get(editedArea.id)
        if (!draft) return previous
        return new Map(previous).set(editedArea.id, { ...draft, color: areaEditForm.color })
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
  const allAreaAnimals = useMemo(() => Array.from(animalsByArea.values()).flat(), [animalsByArea])

  const assignToSelectedArea = async (animalIds: string[]) => {
    if (!selectedArea) return
    try {
      for (const animalId of animalIds) {
        if (savingIds.has(animalId)) continue
        await onMoveAnimal(animalId, selectedArea.id, false)
      }
    } catch {
      setError('No se pudo asignar el animal. Intenta de nuevo.')
    }
  }

  const removeFromSelectedArea = async (animalId: string) => {
    if (savingIds.has(animalId)) return
    try {
      await onMoveAnimal(animalId, UNASSIGNED_AREA_ID, false)
    } catch {
      setError('No se pudo sacar el animal. Intenta de nuevo.')
    }
  }

  const unassignedAnimals = useMemo(
    () => animalsByArea.get(UNASSIGNED_AREA_ID) ?? [],
    [animalsByArea],
  )
  const visibleUnassignedAnimals = useMemo(() => {
    if (!unassignedSearch.trim()) return unassignedAnimals

    return unassignedAnimals.filter((animal) => animalMatchesSearch(animal, unassignedSearch))
  }, [unassignedAnimals, unassignedSearch])

  return (
    <div>
      {activeAreas.length === 0 && !isCreating && !pendingLayout ? (
        <section
          aria-labelledby="first-area-title"
          className="mt-4 rounded-[2rem] border border-green-200 bg-[#fbfdf8] px-5 py-10 text-center shadow-sm sm:px-8 sm:py-14"
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-green-700 text-4xl text-white shadow-[0_8px_0_#bbf7d0]">
            <EmojiIcon emoji="⛳" />
          </div>
          <p className="mt-8 text-sm font-bold uppercase tracking-[0.16em] text-green-800">
            Cada animal en su lugar
          </p>
          <h2
            id="first-area-title"
            className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
          >
            Crea tu primera área
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
            Distribuye a tus animales de forma visual o en una tabla. Organiza tus corrales y
            potreros para llevar el control y conteo de cada área.
          </p>
          <button
            type="button"
            onClick={beginCreatePolygon}
            className="mt-7 min-h-14 w-full max-w-xs rounded-2xl bg-green-700 px-6 py-3 text-base font-bold text-white shadow-[0_6px_0_#14532d] transition hover:bg-green-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-300 focus-visible:ring-offset-2"
          >
            Crear mi primera área
          </button>
          <div className="mx-auto mt-10 grid max-w-2xl gap-3 text-left sm:grid-cols-2">
            <div className="rounded-2xl border border-green-100 bg-white p-5">
              <h3 className="font-bold text-slate-900">Distribución visual</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Dibuja tus áreas y mueve a tus animales entre ellas.
              </p>
            </div>
            <div className="rounded-2xl border border-green-100 bg-white p-5">
              <h3 className="font-bold text-slate-900">Control y conteo</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Consulta tus animales en tabla y revisa cuántos hay en cada área.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <div className="space-y-3">
          <header className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div className="min-w-[min(100%,18rem)] flex-1">
              <h2 className="text-base font-semibold text-gray-900">
                Áreas de {currentFarm?.name || 'tu granja'}
              </h2>
              <p className="mt-1 text-sm text-gray-600" aria-live="polite">
                {viewMode === 'table'
                  ? 'Consulta tus áreas y despliega cada fila para ver sus animales.'
                  : handTool || spacePressed
                    ? 'Arrastra en cualquier dirección, también en diagonal.'
                    : tool === 'polygon'
                      ? polygonPoints.length >= 3
                        ? 'Pulsa el primer punto para cerrar el polígono.'
                        : 'Marca los puntos del contorno. Necesitas al menos tres.'
                      : selectedArea
                        ? `Editando ${selectedArea.name}. Arrastra el contorno o mueve sus puntos.`
                        : 'Selecciona un área para editarla o crea una nueva.'}
              </p>
            </div>
            <div
              role="group"
              aria-label="Controles de vista de áreas"
              className="persistent-scrollbar-native-hidden flex w-full min-w-0 max-w-full items-center gap-2 overflow-x-auto py-1 sm:w-auto"
            >
              <div
                role="group"
                aria-label="Vista de áreas"
                className="flex shrink-0 items-center rounded-lg border border-gray-200 bg-white p-0.5"
              >
                {(
                  [
                    { value: 'table', label: 'Tabla', icon: PiTable },
                    { value: 'map', label: 'Mapa', icon: PiMapTrifold },
                  ] as const
                ).map(({ value, label, icon: ViewIcon }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={viewMode === value}
                    onClick={() => changeView(value)}
                    className={`flex h-9 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-600 ${viewMode === value ? 'bg-green-50 text-green-800' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    <ViewIcon aria-hidden="true" size={16} />
                    {label}
                  </button>
                ))}
              </div>
              {viewMode === 'map' ? (
                <div
                  role="group"
                  aria-label="Zoom del lienzo"
                  className="flex shrink-0 items-center rounded-lg border border-gray-200 bg-white p-0.5"
                >
                  <button
                    type="button"
                    aria-label="Alejar lienzo"
                    title="Alejar"
                    disabled={zoom <= 50}
                    onClick={() => changeZoom(zoom - 25)}
                    className="flex h-9 w-8 cursor-pointer items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <PiMinus aria-hidden="true" size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Zoom ${zoom} por ciento. Restablecer a 100 por ciento`}
                    title="Restablecer zoom"
                    onClick={() => changeZoom(100)}
                    className="h-9 min-w-12 cursor-pointer rounded-md px-1 text-sm font-medium tabular-nums text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-600"
                  >
                    {zoom}%
                  </button>
                  <button
                    type="button"
                    aria-label="Acercar lienzo"
                    title="Acercar"
                    disabled={zoom >= 200}
                    onClick={() => changeZoom(zoom + 25)}
                    className="flex h-9 w-8 cursor-pointer items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <PiPlus aria-hidden="true" size={16} />
                  </button>
                </div>
              ) : null}
              {isCreating || (!isAreaEditorOpen && (!selectedArea || viewMode === 'table')) ? (
                <Button
                  type="button"
                  size="sm"
                  color="success"
                  className="ml-auto h-10 shrink-0 rounded-lg px-3 sm:ml-0"
                  disabled={isSavingArea || isCreating}
                  onClick={async () => {
                    if (dirtyAreaIds.has(selectedAreaId) && !(await handleSaveSelected())) return
                    if (viewMode === 'table') {
                      openQuickCreate()
                      return
                    }
                    beginCreatePolygon()
                  }}
                >
                  <PiPlus aria-hidden="true" size={16} />
                  {isCreating ? 'Creando…' : 'Crear área'}
                </Button>
              ) : null}
            </div>
          </header>
          <section
            hidden={viewMode !== 'map'}
            className="relative overflow-hidden rounded-lg border border-gray-200 bg-white"
          >
            <div className="absolute left-1/2 top-2 z-20 w-max max-w-[calc(100%_-_1rem)] -translate-x-1/2 rounded-2xl border border-gray-200 bg-white p-1 shadow-md shadow-gray-900/5 sm:top-3 sm:p-1.5">
              <FarmMapToolbar
                mode={isCreating ? 'draw' : selectedArea ? 'edit' : 'browse'}
                hand={handTool}
                pendingCount={unassignedAnimals.length}
                pointCount={polygonPoints.length}
                dirty={canSaveDirtyArea}
                busy={isSavingArea}
                hasAnimals={selectedAreaHasAnimals}
                areaName={selectedArea?.name}
                onHand={() => setHandTool((current) => !current)}
                onPending={() => setIsUnassignedOpen(true)}
                onUndoPoint={() => setPolygonPoints((points) => points.slice(0, -1))}
                onFinish={finishPolygon}
                onCancel={cancelCurrentAction}
                onEdit={() => {
                  if (selectedArea) openAreaEditor(selectedArea)
                }}
                onDone={() => {
                  void handleSaveSelected()
                }}
                onDelete={() => {
                  setError(null)
                  setDeleteAreaOpen(true)
                }}
              />
            </div>

            {error && !pendingLayout && !isAreaEditorOpen && !deleteAreaOpen ? (
              <p
                role="alert"
                className="absolute bottom-3 left-3 right-3 z-20 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 shadow-sm"
              >
                {error}
              </p>
            ) : null}

            <div
              ref={centerCanvasOnOpen}
              tabIndex={0}
              role="region"
              aria-label="Lienzo de áreas. Arrastra para desplazarte o usa las flechas del teclado."
              className="persistent-scrollbar-native-hidden max-h-[70dvh] touch-none overflow-auto overscroll-contain scroll-auto bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-600"
            >
              <div className="relative" style={{ width: `${zoom * 2}%` }}>
                <svg
                  ref={attachCanvas}
                  role="group"
                  aria-label="Contornos de las áreas de la granja"
                  viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
                  className="block aspect-[1000/620] w-full touch-none select-none"
                  style={{
                    cursor: isPanning
                      ? 'grabbing'
                      : handTool || spacePressed || !isCreating
                        ? 'grab'
                        : PENCIL_CURSOR,
                  }}
                  onPointerDownCapture={(event) => {
                    if ((event.button === 0 && (handTool || spacePressed)) || event.button === 1) {
                      if (
                        event.target instanceof Element &&
                        event.target.closest('button, input, a')
                      )
                        return
                      event.stopPropagation()
                      beginPan(event)
                    }
                  }}
                  onPointerDown={handleCanvasPointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onLostPointerCapture={handlePointerUp}
                >
                  <defs>
                    <pattern id="farm-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                      <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#d6d3d1" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#farm-grid)" />

                  {displayedAreas.map(({ area, layout }) => {
                    const points = pointsToSvg(layout.points)
                    const isSelected = selectedAreaId === area.id

                    return (
                      <g
                        key={area.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Editar contorno de ${area.name}`}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            void selectAreaForEditing(area.id)
                          }
                        }}
                        onPointerDown={(event) => handleAreaPointerDown(event, area.id, layout)}
                        onDragOver={(event) => {
                          event.preventDefault()
                          setDropTargetId(area.id)
                        }}
                        onDragLeave={() => setDropTargetId(null)}
                        onDrop={(event) => handleDropAnimal(event, area.id)}
                        className={
                          handTool || spacePressed || isPanning ? 'cursor-inherit' : 'cursor-move'
                        }
                      >
                        <polygon
                          points={points}
                          fill={layout.color || '#16a34a'}
                          fillOpacity={dropTargetId === area.id ? 0.3 : 0.16}
                          stroke={isSelected ? '#111827' : layout.color || '#16a34a'}
                          strokeWidth={isSelected ? 4 : 2}
                          strokeLinejoin="round"
                        />

                        {isSelected
                          ? layout.points.map((point, index) => {
                              const svgPoint = pointToSvg(point)
                              return (
                                <g key={`${area.id}-${index}`}>
                                  <circle
                                    cx={svgPoint.x}
                                    cy={svgPoint.y}
                                    r={22 / canvasScale}
                                    fill="transparent"
                                    className="cursor-grab"
                                    onPointerDown={(event) =>
                                      handleVertexPointerDown(event, area.id, index)
                                    }
                                  />
                                  <circle
                                    cx={svgPoint.x}
                                    cy={svgPoint.y}
                                    r={6 / canvasScale}
                                    fill="white"
                                    stroke="#166534"
                                    strokeWidth={2 / canvasScale}
                                    className="pointer-events-none"
                                  />
                                </g>
                              )
                            })
                          : null}
                      </g>
                    )
                  })}

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
                            r={(index === 0 ? 8 : 4) / canvasScale}
                            fill={index === 0 ? '#ffffff' : '#16a34a'}
                            stroke="#16a34a"
                            strokeWidth={index === 0 ? 3 : 0}
                            role={index === 0 && polygonPoints.length >= 3 ? 'button' : undefined}
                            tabIndex={index === 0 && polygonPoints.length >= 3 ? 0 : undefined}
                            aria-label={
                              index === 0 ? 'Cerrar polígono en el primer punto' : undefined
                            }
                            className={
                              index === 0 && polygonPoints.length >= 3
                                ? 'cursor-pointer'
                                : undefined
                            }
                            onKeyDown={(event) => {
                              if (index === 0 && (event.key === 'Enter' || event.key === ' ')) {
                                event.preventDefault()
                                finishPolygon()
                              }
                            }}
                          />
                        )
                      })}
                    </g>
                  ) : null}
                </svg>

                <div className="pointer-events-none absolute inset-0">
                  {displayedAreas.map(({ area, layout }) => {
                    const bounds = getBounds(layout.points)
                    const group = animalsByArea.get(area.id) ?? []
                    const detailsExpanded = expandedAreaDetails.has(area.id)
                    const labelScale = Math.max(0.65, Math.min(0.85, zoom / 100))
                    return (
                      <div
                        key={area.id}
                        className={
                          isCreating || handTool || spacePressed
                            ? 'pointer-events-none absolute'
                            : 'pointer-events-auto absolute'
                        }
                        style={{
                          left: `calc(${bounds.minX * 100}% + 12px)`,
                          top: `calc(${bounds.minY * 100}% + 12px)`,
                          width: '180px',
                          maxWidth: 'calc(100% - 24px)',
                          transform: `scale(${labelScale})`,
                          transformOrigin: 'top left',
                          zIndex: detailsExpanded ? (frontAreaId === area.id ? 12 : 10) : 1,
                        }}
                        onDragOver={(event) => {
                          event.preventDefault()
                          setDropTargetId(area.id)
                        }}
                        onDragLeave={() => setDropTargetId(null)}
                        onDrop={(event) => handleDropAnimal(event, area.id)}
                      >
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                          <button
                            type="button"
                            aria-expanded={detailsExpanded}
                            aria-label={`${detailsExpanded ? 'Ocultar' : 'Mostrar'} detalles de ${area.name}`}
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={() => {
                              setFrontAreaId(area.id)
                              setExpandedAreaDetails((previous) => {
                                const next = new Set(previous)
                                if (next.has(area.id)) next.delete(area.id)
                                else next.add(area.id)
                                return next
                              })
                            }}
                            className="flex min-h-11 w-full cursor-pointer items-center gap-1.5 px-2 text-left text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-600"
                          >
                            <PiCaretRight
                              aria-hidden="true"
                              className={`shrink-0 transition-transform ${detailsExpanded ? 'rotate-90' : ''}`}
                            />
                            <span className="min-w-0 flex-1 py-1">
                              <span className="flex items-center gap-1 truncate text-sm font-bold leading-5">
                                <EmojiIcon emoji={areaTypeIcons[area.type]} />
                                <span className="truncate">{area.name}</span>
                              </span>
                            </span>
                            <span
                              aria-label={`${group.length} ${group.length === 1 ? 'animal' : 'animales'}`}
                              className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-gray-700"
                            >
                              {group.length}
                            </span>
                          </button>
                          {detailsExpanded ? (
                            <div className="px-2 pb-2">
                              <p className="pb-1 text-xs font-normal tabular-nums text-gray-500">
                                {area.areaM2 != null
                                  ? `${area.areaM2.toLocaleString('es')} m²`
                                  : '— m²'}
                              </p>
                              {area.description ? (
                                <p className="mt-1 line-clamp-1 text-xs text-gray-500">
                                  {area.description}
                                </p>
                              ) : null}
                              <div className="mt-2 grid max-h-44 grid-cols-1 justify-items-start gap-1.5 overflow-auto overscroll-contain py-1 pr-1">
                                {group.map((animal) => renderAnimalAvatar(animal))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {activeAreas.length === 0 && !pendingLayout && polygonPoints.length === 0 ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                    <div className="max-w-sm rounded-lg border border-dashed border-gray-300 bg-white/95 px-4 py-5 text-center shadow-sm">
                      <p className="text-sm font-semibold text-gray-900">Dibuja tu primera área</p>
                      <p className="mt-1 text-sm text-gray-500">
                        Marca los puntos del contorno y pulsa el primero para cerrar el polígono.
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
          <div hidden={viewMode !== 'table'} className="space-y-3">
            {error && !isAreaEditorOpen ? (
              <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
            <FarmAreasTable
              areas={activeAreas}
              animalsByArea={animalsByArea}
              renderAnimal={(animal) => renderAnimalChip(animal, true)}
              busy={isSavingArea}
              onEdit={(area) => {
                void (async () => {
                  if (await selectAreaForEditing(area.id)) openAreaEditor(area)
                })()
              }}
              onMap={(areaId) => {
                changeView('map')
                if (areaId === UNASSIGNED_AREA_ID) {
                  setIsUnassignedOpen(true)
                  return
                }
                void (async () => {
                  if (!(await selectAreaForEditing(areaId))) return
                  requestAnimationFrame(() => {
                    const viewport = viewportRef.current
                    const canvas = svgRef.current
                    const displayedArea = displayedAreas.find((item) => item.area.id === areaId)
                    if (!viewport || !canvas || !displayedArea) return
                    const bounds = getBounds(displayedArea.layout.points)
                    const canvasSize = canvas.getBoundingClientRect()
                    viewport.scrollTo({
                      left:
                        ((bounds.minX + bounds.maxX) / 2) * canvasSize.width -
                        viewport.clientWidth / 2,
                      top:
                        ((bounds.minY + bounds.maxY) / 2) * canvasSize.height -
                        viewport.clientHeight / 2,
                      behavior: 'instant',
                    })
                    viewport.focus({ preventScroll: true })
                  })
                })()
              }}
            />
          </div>
        </div>
      )}

      <Modal
        isOpen={deleteAreaOpen}
        onClose={() => {
          if (!isSavingArea) setDeleteAreaOpen(false)
        }}
        title="Eliminar área"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-base text-gray-700">
            ¿Eliminar «{selectedArea?.name}»? Se borrará su dibujo y sus datos. Esta acción no se
            puede deshacer.
          </p>
          {error ? (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              color="neutral"
              className="min-h-11 rounded-xl"
              disabled={isSavingArea}
              onClick={() => setDeleteAreaOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              color="error"
              className="min-h-11 rounded-xl"
              disabled={isSavingArea || selectedAreaHasAnimals}
              onClick={handleDeleteSelected}
            >
              {isSavingArea ? 'Eliminando…' : 'Eliminar área'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(moveAnimalTarget)}
        onClose={() => setMoveAnimalTarget(null)}
        title={moveAnimalTarget ? `Mover ${moveAnimalTarget.animalNumber}` : 'Mover animal'}
        size="md"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Selecciona el área de destino.</p>
          <div className="max-h-[45dvh] space-y-1 overflow-y-auto">
            {[{ id: UNASSIGNED_AREA_ID, name: 'Pendientes de asignar' }, ...activeAreas].map(
              (area) => (
                <Button
                  key={area.id}
                  type="button"
                  variant="ghost"
                  color="neutral"
                  className="min-h-11 w-full justify-start rounded-xl text-left"
                  disabled={(moveAnimalTarget?.currentAreaId ?? UNASSIGNED_AREA_ID) === area.id}
                  onClick={() => {
                    void moveAnimalFromDialog(area.id)
                  }}
                >
                  {area.name}
                  {(moveAnimalTarget?.currentAreaId ?? UNASSIGNED_AREA_ID) === area.id ? (
                    <span className="ml-auto text-xs text-gray-500">Actual</span>
                  ) : null}
                </Button>
              ),
            )}
          </div>
          <div className="flex justify-end border-t border-gray-100 pt-3">
            <Button
              type="button"
              color="neutral"
              variant="ghost"
              className="min-h-11 rounded-xl"
              onClick={() => setMoveAnimalTarget(null)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isUnassignedOpen}
        onClose={() => {
          setIsUnassignedOpen(false)
          setUnassignedSearch('')
        }}
        title="Pendientes de asignar"
        size="xl"
      >
        <div
          onDragOver={(event) => {
            event.preventDefault()
            setDropTargetId(UNASSIGNED_AREA_ID)
          }}
          onDragLeave={() => setDropTargetId(null)}
          onDrop={(event) => handleDropAnimal(event, UNASSIGNED_AREA_ID)}
          className={`space-y-4 rounded-lg border p-3 transition-colors sm:p-4 ${
            dropTargetId === UNASSIGNED_AREA_ID
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 bg-white'
          }`}
        >
          <div>
            <label
              htmlFor="unassigned-animal-search"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Buscar animal
            </label>
            <input
              id="unassigned-animal-search"
              type="search"
              value={unassignedSearch}
              onChange={(event) => setUnassignedSearch(event.target.value)}
              placeholder="Número, nombre, raza o notas..."
              className="min-h-11 w-full rounded-md border border-gray-300 px-3 text-base text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="mt-2 text-xs text-gray-500">
              {visibleUnassignedAnimals.length} de {unassignedAnimals.length} animales sin área.
              Pulsa una ficha para elegir su destino.
            </p>
          </div>

          {unassignedAnimals.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center">
              <p className="text-sm font-medium text-gray-700">Todos los animales tienen área.</p>
            </div>
          ) : visibleUnassignedAnimals.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center">
              <p className="text-sm font-medium text-gray-700">No encontramos coincidencias.</p>
              <p className="mt-1 text-xs text-gray-500">Prueba con otro número, nombre o raza.</p>
            </div>
          ) : (
            <div className="flex max-h-[60vh] flex-wrap content-start gap-2 overflow-y-auto rounded-md bg-gray-50 p-2 sm:p-3">
              {visibleUnassignedAnimals.map((animal) => renderAnimalChip(animal))}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(pendingLayout)}
        onClose={returnToDrawing}
        title={isQuickCreate ? 'Nueva área' : 'Guardar área dibujada'}
        size="md"
      >
        <form onSubmit={handleCreateArea} className="space-y-4">
          {error ? (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
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
            <InputIconSelect
              id="mapped-area-type"
              value={areaForm.type}
              onChange={(type) => setAreaForm((prev) => ({ ...prev, type }))}
              options={FARM_AREA_TYPES.map((type) => ({
                value: type.value,
                label: type.label,
                icon: type.icon,
              }))}
            />
          </div>
          <div>
            <label
              htmlFor="mapped-area-description"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Descripción
            </label>
            <AutoGrowTextarea
              id="mapped-area-description"
              value={areaForm.description}
              onChange={(event) =>
                setAreaForm((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="Notas visibles dentro del lienzo"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] items-start gap-3">
            <AreaSizeInput
              id="mapped-area-size"
              value={areaForm.areaM2}
              disabled={isSavingArea}
              onChange={(value) => setAreaForm((prev) => ({ ...prev, areaM2: value }))}
            />
            <div>
              <span className="mb-2 block text-sm font-medium text-gray-700">Color</span>
              <ColorSwatches
                value={areaForm.color}
                onChange={(color) => setAreaForm((prev) => ({ ...prev, color }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
            <Button
              type="button"
              color="neutral"
              variant="outline"
              disabled={isSavingArea}
              onClick={returnToDrawing}
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
        isOpen={isAreaEditorOpen && Boolean(editedArea)}
        onClose={() => {
          if (!isSavingArea) setIsAreaEditorOpen(false)
        }}
        title={editedArea ? `Editar ${editedArea.name}` : 'Editar área'}
        size="lg"
      >
        <form onSubmit={handleSaveAreaDetails} className="space-y-4">
          {error ? (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="edit-area-name"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Nombre del área *
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
              <InputIconSelect
                id="edit-area-type"
                value={areaEditForm.type}
                onChange={(type) => setAreaEditForm((prev) => ({ ...prev, type }))}
                options={FARM_AREA_TYPES.map((type) => ({
                  value: type.value,
                  label: type.label,
                  icon: type.icon,
                }))}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="edit-area-description"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Descripción
            </label>
            <AutoGrowTextarea
              id="edit-area-description"
              value={areaEditForm.description}
              onChange={(event) =>
                setAreaEditForm((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="Notas visibles dentro del lienzo"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] items-start gap-3">
            <AreaSizeInput
              id="edit-area-size"
              value={areaEditForm.areaM2}
              disabled={isSavingArea}
              onChange={(value) => setAreaEditForm((prev) => ({ ...prev, areaM2: value }))}
            />
            <div>
              <span className="mb-2 block text-sm font-medium text-gray-700">Color</span>
              <ColorSwatches
                value={areaEditForm.color}
                onChange={(color) => setAreaEditForm((prev) => ({ ...prev, color }))}
              />
            </div>
          </div>

          <section className="border-t border-gray-200 pt-4">
            <InputSelectAnimals
              animals={allAreaAnimals}
              selectedIds={selectedAreaAnimals.map((animal) => animal.id)}
              areas={activeAreas.filter((area) => area.id !== selectedArea?.id)}
              onAdd={(animalId) => void assignToSelectedArea([animalId])}
              onAddMany={(ids) => void assignToSelectedArea(ids)}
              onRemove={(animalId) => void removeFromSelectedArea(animalId)}
              disabled={!selectedArea}
              label="Animales en el área"
              selectedPosition="below"
              placeholder="Buscar por número, nombre, tipo o raza..."
            />
            {/* Montado aunque el grupo quede vacío: la confirmación sigue abierta mientras se guarda */}
            <div className={selectedAreaAnimals.length > 0 ? 'mt-2 flex justify-end' : 'hidden'}>
              <ButtonConfirm
                key={selectedArea?.id}
                openLabel="Sacar a todos"
                confirmLabel="Sí, sacar a todos"
                confirmText={`¿Sacar a los ${selectedAreaAnimals.length} animales de «${selectedArea?.name}»? Quedarán en pendientes de asignar. Sus fichas y registros se conservan.`}
                openProps={{
                  type: 'button',
                  size: 'sm',
                  color: 'neutral',
                  variant: 'ghost',
                  className: 'min-h-11 rounded-xl',
                }}
                confirmProps={{ type: 'button', color: 'error' }}
                onConfirm={emptySelectedArea}
              >
                {emptyAreaError ? (
                  <p role="alert" className="text-sm text-red-700">
                    {emptyAreaError}
                  </p>
                ) : null}
              </ButtonConfirm>
            </div>
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
