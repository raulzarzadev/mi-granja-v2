'use client'

import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from '@/components/Modal'
import { auth } from '@/lib/firebase'
import type { Animal } from '@/types/animals'

const MAX_IMAGES = 6
// Disabled until automatic handwritten-text localization is reliable.
const ENABLE_ANIMAL_LIST_CROPS = false
const MAX_IMAGE_BYTES = 5_000_000
const SUPPORTED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
])

type ReaderImage = {
  id: string
  file: File
  previewUrl: string
}

type ExtractedItem = {
  raw: string
  candidate: string
  confidence: 'high' | 'medium' | 'low'
  imageIndex: number
  box?: { x: number; y: number; width: number; height: number }
  cropUrl?: string
}

type ReaderResult = {
  items: ExtractedItem[]
  notes: string
}

type AnimalMatch = {
  key: string
  item: ExtractedItem
  animal?: Animal
  ambiguous: boolean
}

type ResultFilter = 'all' | 'found' | 'unmatched' | 'review'

interface ModalAnimalListReaderProps {
  isOpen: boolean
  onClose: () => void
  farmId: string
  animals: Animal[]
  selectedIds: string[]
  onApply: (animalIds: string[]) => void
}

const normalizeAnimalIdentifier = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}`))
    reader.readAsDataURL(file)
  })

const prepareImageForAnalysis = async (file: File) => {
  const source = await readFileAsDataUrl(file)

  try {
    const image = new window.Image()
    const loaded = new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error(`No se pudo preparar ${file.name}`))
    })
    image.src = source
    await loaded

    const maxDimension = 1800
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) return source

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.88)
  } catch {
    return source
  }
}

const confidenceLabels = {
  high: 'Lectura clara',
  medium: 'Revisar lectura',
  low: 'Lectura dudosa',
} as const

const confidenceClasses = {
  high: 'border-green-200 bg-green-50 text-green-800',
  medium: 'border-amber-200 bg-amber-50 text-amber-800',
  low: 'border-red-200 bg-red-50 text-red-800',
} as const

export default function ModalAnimalListReader({
  isOpen,
  onClose,
  farmId,
  animals,
  selectedIds,
  onApply,
}: ModalAnimalListReaderProps) {
  const [images, setImages] = useState<ReaderImage[]>([])
  const [result, setResult] = useState<ReaderResult | null>(null)
  const [selectedMatches, setSelectedMatches] = useState<Set<string>>(new Set())
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [completedImages, setCompletedImages] = useState(0)
  const [currentImage, setCurrentImage] = useState(0)
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all')
  const [expandedCrop, setExpandedCrop] = useState<ExtractedItem | null>(null)
  const analyzingRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [fileMessage, setFileMessage] = useState<string | null>(null)
  const imagesRef = useRef<ReaderImage[]>([])

  useEffect(() => {
    imagesRef.current = images
  }, [images])

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((image) => {
        URL.revokeObjectURL(image.previewUrl)
      })
    }
  }, [])

  useEffect(() => {
    if (isOpen) return
    imagesRef.current.forEach((image) => {
      URL.revokeObjectURL(image.previewUrl)
    })
    imagesRef.current = []
    setImages([])
    setCompletedImages(0)
    setResult(null)
    setResultFilter('all')
    setExpandedCrop(null)
    setSelectedMatches(new Set())
    setError(null)
    setFileMessage(null)
    setIsAnalyzing(false)
  }, [isOpen])

  const matches = useMemo<AnimalMatch[]>(() => {
    if (!result) return []

    const animalsByNumber = new Map<string, Animal[]>()
    for (const animal of animals) {
      const key = normalizeAnimalIdentifier(animal.animalNumber || '')
      if (!key) continue
      const current = animalsByNumber.get(key) || []
      current.push(animal)
      animalsByNumber.set(key, current)
    }

    return result.items.map((item, index) => {
      const key = normalizeAnimalIdentifier(item.candidate || item.raw)
      const candidates = animalsByNumber.get(key) || []
      return {
        key: `${index}-${item.raw}-${item.candidate}`,
        item,
        animal: candidates.length === 1 ? candidates[0] : undefined,
        ambiguous: candidates.length > 1,
      }
    })
  }, [animals, result])

  const matched = matches.filter((match) => match.animal && !match.ambiguous)
  const unmatched = matches.filter((match) => !match.animal || match.ambiguous)
  const found = matches.filter((match) => match.animal && !match.ambiguous)
  const review = matches.filter(
    (match) => match.item.confidence !== 'high' || !match.animal || match.ambiguous,
  )
  const visibleMatches = matches.filter((match) => {
    if (resultFilter === 'found') return Boolean(match.animal && !match.ambiguous)
    if (resultFilter === 'unmatched') return !match.animal || match.ambiguous
    if (resultFilter === 'review') {
      return match.item.confidence !== 'high' || !match.animal || match.ambiguous
    }
    return true
  })
  const uniqueMatchedIds = [...new Set(matched.map((match) => match.animal!.id))]
  const alreadySelectedCount = uniqueMatchedIds.filter((id) => selectedIds.includes(id)).length
  const newSelectionCount = [...selectedMatches].filter((id) => !selectedIds.includes(id)).length

  useEffect(() => {
    if (!result) return
    setSelectedMatches(new Set(uniqueMatchedIds.filter((id) => !selectedIds.includes(id))))
  }, [selectedIds, uniqueMatchedIds.join('|')])

  const replaceImages = (nextImages: ReaderImage[]) => {
    if (analyzingRef.current) return
    setCompletedImages(0)
    imagesRef.current.forEach((image) => {
      URL.revokeObjectURL(image.previewUrl)
    })
    imagesRef.current = nextImages
    setImages(nextImages)
    setResult(null)
    setSelectedMatches(new Set())
    setError(null)
  }

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return
    const files = Array.from(fileList)
    const validFiles = files.filter(
      (file) => SUPPORTED_IMAGE_TYPES.has(file.type) && file.size <= MAX_IMAGE_BYTES,
    )
    const rejectedCount = files.length - validFiles.length
    const availableFiles = validFiles.slice(0, MAX_IMAGES)
    const limitedCount = Math.max(0, validFiles.length - availableFiles.length)

    replaceImages(
      availableFiles.map((file, index) => ({
        id: `${file.name}-${file.lastModified}-${index}`,
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    )

    if (rejectedCount > 0 || limitedCount > 0) {
      setFileMessage(
        `Se omitieron ${rejectedCount + limitedCount} archivo${rejectedCount + limitedCount === 1 ? '' : 's'}. Usa imágenes JPG, PNG, WEBP o GIF de hasta 5 MB; máximo ${MAX_IMAGES}.`,
      )
    } else {
      setFileMessage(null)
    }
  }

  const analyzeImages = async () => {
    if (images.length === 0 || analyzingRef.current) return
    analyzingRef.current = true
    setIsAnalyzing(true)
    setError(null)

    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) throw new Error('Usuario no autenticado')

      for (let imageIndex = completedImages; imageIndex < images.length; imageIndex++) {
        setCurrentImage(imageIndex + 1)
        const dataUrls = [await prepareImageForAnalysis(images[imageIndex].file)]
        const response = await fetch('/api/ai/animal-list', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ farmId, images: dataUrls }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(
            typeof data.error === 'string' ? data.error : 'No se pudo analizar la lista',
          )
        }

        const source = ENABLE_ANIMAL_LIST_CROPS
          ? await new Promise<HTMLImageElement | null>((resolve) => {
              const image = new window.Image()
              image.onload = () => resolve(image)
              image.onerror = () => resolve(null)
              image.src = images[imageIndex].previewUrl
            })
          : null
        const items: ExtractedItem[] = (Array.isArray(data.items) ? data.items : []).map(
          (item: ExtractedItem) => {
            const box = item.box
            if (!source || !box) return item
            const rawX = (Math.max(0, box.x) * source.naturalWidth) / 1000
            const rawY = (Math.max(0, box.y) * source.naturalHeight) / 1000
            const rawWidth = (box.width * source.naturalWidth) / 1000
            const rawHeight = (box.height * source.naturalHeight) / 1000
            if (!(rawWidth > 0 && rawHeight > 0)) return item

            // Handwritten coordinates are approximate. Add enough context to keep the row
            // visible when the model lands a few pixels above or below the character.
            const horizontalPadding = rawWidth * 0.12
            const verticalPadding = rawHeight * 0.12
            const x = Math.max(0, rawX - horizontalPadding)
            const y = Math.max(0, rawY - verticalPadding)
            const right = Math.min(source.naturalWidth, rawX + rawWidth + horizontalPadding)
            const bottom = Math.min(source.naturalHeight, rawY + rawHeight + verticalPadding)
            const width = right - x
            const height = bottom - y
            const canvas = document.createElement('canvas')
            const scale = Math.min(1, 900 / width, 500 / height)
            canvas.width = Math.max(1, Math.round(width * scale))
            canvas.height = Math.max(1, Math.round(height * scale))
            const context = canvas.getContext('2d')
            if (!context) return item
            context.drawImage(source, x, y, width, height, 0, 0, canvas.width, canvas.height)
            return { ...item, cropUrl: canvas.toDataURL('image/jpeg', 0.9) }
          },
        )
        setResult((previous) => ({
          items: [...(previous?.items || []), ...items.map((item) => ({ ...item, imageIndex }))],
          notes: [
            previous?.notes,
            typeof data.notes === 'string' && data.notes
              ? `Foto ${imageIndex + 1}: ${data.notes}`
              : '',
          ]
            .filter(Boolean)
            .join('\n'),
        }))
        setCompletedImages(imageIndex + 1)
      }
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : 'No se pudo analizar la lista. Intenta de nuevo.',
      )
    } finally {
      analyzingRef.current = false
      setIsAnalyzing(false)
    }
  }

  const toggleMatch = (animalId: string) => {
    setSelectedMatches((current) => {
      const next = new Set(current)
      if (next.has(animalId)) next.delete(animalId)
      else next.add(animalId)
      return next
    })
  }

  const applyMatches = () => {
    onApply([...selectedMatches])
    onClose()
  }

  const recenterCrop = async (item: ExtractedItem, centerX: number, centerY: number) => {
    const sourceUrl = images[item.imageIndex]?.previewUrl
    if (!sourceUrl) return
    const source = await new Promise<HTMLImageElement | null>((resolve) => {
      const image = new window.Image()
      image.onload = () => resolve(image)
      image.onerror = () => resolve(null)
      image.src = sourceUrl
    })
    if (!source) return
    const width = Math.min(1000, Math.max(50, item.box?.width || 100))
    const height = Math.min(1000, Math.max(20, item.box?.height || 35))
    const box = {
      x: Math.max(0, Math.min(1000 - width, centerX * 1000 - width / 2)),
      y: Math.max(0, Math.min(1000 - height, centerY * 1000 - height / 2)),
      width,
      height,
    }
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round((width * source.naturalWidth) / 1000))
    canvas.height = Math.max(1, Math.round((height * source.naturalHeight) / 1000))
    const context = canvas.getContext('2d')
    if (!context) return
    context.drawImage(
      source,
      (box.x * source.naturalWidth) / 1000,
      (box.y * source.naturalHeight) / 1000,
      (width * source.naturalWidth) / 1000,
      (height * source.naturalHeight) / 1000,
      0,
      0,
      canvas.width,
      canvas.height,
    )
    const updated = { ...item, box, cropUrl: canvas.toDataURL('image/jpeg', 0.95) }
    setResult(
      (current) =>
        current && {
          ...current,
          items: current.items.map((entry) => (entry === item ? updated : entry)),
        },
    )
    setExpandedCrop(updated)
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          if (!analyzingRef.current) onClose()
        }}
        title="Leer lista de aretes"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-900">
              Compara una lista escrita con tus animales
            </p>
            <p className="mt-1 text-sm leading-5 text-gray-500">
              Sube una o varias fotos. La IA transcribirá los aretes y aquí podrás revisar cuáles
              existen antes de agregarlos a la selección. Cada imagen se procesa por separado y
              cuenta como una consulta de IA.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor="animal-list-images"
              className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus-within:ring-2 focus-within:ring-green-500 focus-within:ring-offset-2"
            >
              <span aria-hidden="true" className="mr-2 text-base">
                ＋
              </span>
              Seleccionar imágenes
              <input
                id="animal-list-images"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                disabled={isAnalyzing}
                onChange={(event) => {
                  handleFiles(event.target.files)
                  event.target.value = ''
                }}
                className="sr-only"
              />
            </label>
            <span className="text-xs text-gray-500">
              {images.length}/{MAX_IMAGES} imágenes
            </span>
          </div>

          {fileMessage && (
            <p
              role="status"
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
            >
              {fileMessage}
            </p>
          )}

          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {images.map((image) => (
                <figure
                  key={image.id}
                  className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
                >
                  <Image
                    src={image.previewUrl}
                    alt={`Vista previa de ${image.file.name}`}
                    width={400}
                    height={112}
                    unoptimized
                    className="h-28 w-full object-cover"
                  />
                  <figcaption className="truncate px-2 py-1 text-xs text-gray-600">
                    {image.file.name}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error} El proveedor puede haber cobrado esta lectura aunque no haya terminado. Volver
              a intentarlo realiza una nueva consulta.
            </p>
          )}

          {completedImages < images.length && (
            <button
              type="button"
              onClick={analyzeImages}
              disabled={images.length === 0 || isAnalyzing}
              className="min-h-11 w-full rounded-lg bg-green-600 px-4 text-sm font-semibold text-white transition hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isAnalyzing
                ? `Analizando imagen ${currentImage} de ${images.length}…`
                : completedImages > 0
                  ? 'Continuar con las imágenes pendientes'
                  : '✨ Analizar lista'}
            </button>
          )}

          {isAnalyzing && (
            <p role="status" className="text-center text-sm text-gray-500">
              Imagen {currentImage} de {images.length}. {completedImages} completadas. Leemos una
              imagen a la vez; cada una puede tardar hasta dos minutos.
            </p>
          )}

          {result && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2" aria-label="Filtros de la lista">
                {(
                  [
                    ['all', 'Todas', matches.length],
                    ['found', 'Encontradas', found.length],
                    ['unmatched', 'No existen o faltan', unmatched.length],
                    ['review', 'Revisar', review.length],
                  ] as const
                ).map(([filter, label, count]) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setResultFilter(filter)}
                    className={`min-h-10 rounded-full border px-3 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-1 ${resultFilter === filter ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-green-400 hover:bg-green-50'}`}
                  >
                    {label} ({count})
                  </button>
                ))}
              </div>

              <div
                className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                aria-label="Comparación de listas"
              >
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5">
                  <p className="text-xs text-gray-500">En imágenes</p>
                  <p className="mt-0.5 text-lg font-semibold text-gray-900">
                    {result.items.length}
                  </p>
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 p-2.5">
                  <p className="text-xs text-green-700">Encontrados</p>
                  <p className="mt-0.5 text-lg font-semibold text-green-800">{matched.length}</p>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5">
                  <p className="text-xs text-blue-700">Ya seleccionados</p>
                  <p className="mt-0.5 text-lg font-semibold text-blue-800">
                    {alreadySelectedCount}
                  </p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                  <p className="text-xs text-amber-700">No encontrados</p>
                  <p className="mt-0.5 text-lg font-semibold text-amber-800">{unmatched.length}</p>
                </div>
              </div>

              {result.items.length !== uniqueMatchedIds.length && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  La imagen contiene {result.items.length} renglones y {uniqueMatchedIds.length}{' '}
                  aretes únicos encontrados. Revisa los repetidos o los que no coinciden antes de
                  agregar.
                </p>
              )}

              {result.notes && <p className="text-sm text-gray-600">{result.notes}</p>}

              <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200">
                {matches.length === 0 ? (
                  <p className="px-3 py-4 text-center text-sm text-gray-500">
                    No se encontraron aretes legibles en las imágenes.
                  </p>
                ) : visibleMatches.length === 0 ? (
                  <p className="px-3 py-4 text-center text-sm text-gray-500">
                    No hay resultados en este filtro.
                  </p>
                ) : (
                  visibleMatches.map((match) => {
                    const animal = match.animal
                    const isChecked = Boolean(animal && selectedMatches.has(animal.id))
                    return (
                      <div key={match.key} className="flex items-center gap-3 px-3 py-2.5">
                        {animal && !match.ambiguous ? (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isAnalyzing}
                            onChange={() => toggleMatch(animal.id)}
                            aria-label={`Agregar animal ${animal.animalNumber}`}
                            className="h-4 w-4 shrink-0 rounded border-gray-300 text-green-600 focus:ring-2 focus:ring-green-500"
                          />
                        ) : (
                          <span
                            className="w-4 shrink-0 text-center text-amber-600"
                            aria-hidden="true"
                          >
                            !
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-gray-900">{match.item.raw}</span>
                            {animal && !match.ambiguous && (
                              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                                {animal.animalNumber}
                              </span>
                            )}
                            {match.ambiguous && (
                              <span className="text-xs font-medium text-amber-700">
                                Arete duplicado
                              </span>
                            )}
                            {!animal && !match.ambiguous && (
                              <span className="text-xs font-medium text-red-700">No existe</span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-gray-500">
                            Interpretado como: {match.item.candidate}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[11px] ${confidenceClasses[match.item.confidence]}`}
                          >
                            {confidenceLabels[match.item.confidence]}
                          </span>
                          {ENABLE_ANIMAL_LIST_CROPS && match.item.cropUrl && (
                            <button
                              type="button"
                              onClick={() => setExpandedCrop(match.item)}
                              aria-label={`Ampliar recorte de ${match.item.raw}`}
                              title="Ampliar recorte"
                              className="cursor-zoom-in rounded border border-gray-200 bg-gray-50 p-0.5 transition hover:border-green-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-1"
                            >
                              <Image
                                src={match.item.cropUrl}
                                alt={`Recorte de ${match.item.raw}, foto ${match.item.imageIndex + 1}`}
                                width={120}
                                height={48}
                                unoptimized
                                className="h-12 w-28 object-contain"
                              />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-gray-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => replaceImages([])}
                  disabled={isAnalyzing}
                  className="min-h-11 rounded-lg px-3 text-sm font-medium text-gray-600 transition hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
                >
                  Elegir otras imágenes
                </button>
                <div className="flex gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isAnalyzing}
                    className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={applyMatches}
                    disabled={newSelectionCount === 0 || isAnalyzing}
                    className="min-h-11 rounded-lg bg-green-600 px-4 text-sm font-semibold text-white transition hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    Agregar coincidencias ({newSelectionCount})
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
      <Modal
        isOpen={ENABLE_ANIMAL_LIST_CROPS && Boolean(expandedCrop)}
        onClose={() => setExpandedCrop(null)}
        title={expandedCrop ? `Recorte de ${expandedCrop.raw}` : 'Recorte'}
        size="md"
      >
        {expandedCrop?.cropUrl && (
          <div className="space-y-3">
            <Image
              src={expandedCrop.cropUrl}
              alt={`Recorte ampliado de ${expandedCrop.raw}`}
              width={900}
              height={500}
              unoptimized
              className="max-h-[65vh] w-full rounded-lg border border-gray-200 bg-gray-50 object-contain"
            />
            <p className="text-center text-sm text-gray-500">
              Lectura: <span className="font-medium text-gray-900">{expandedCrop.candidate}</span>
            </p>
            {images[expandedCrop.imageIndex] && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Toca el centro del arete en la foto para corregir el recorte. No consume IA.
                </p>
                <button
                  type="button"
                  aria-label="Corregir centro del recorte en la foto original"
                  className="block w-full cursor-crosshair overflow-hidden rounded border border-gray-300 focus-visible:ring-2 focus-visible:ring-green-600"
                  onClick={(event) => {
                    const bounds = event.currentTarget.getBoundingClientRect()
                    void recenterCrop(
                      expandedCrop,
                      event.detail === 0 ? 0.5 : (event.clientX - bounds.left) / bounds.width,
                      event.detail === 0 ? 0.5 : (event.clientY - bounds.top) / bounds.height,
                    )
                  }}
                >
                  <Image
                    src={images[expandedCrop.imageIndex].previewUrl}
                    alt="Foto original para localizar el arete"
                    width={900}
                    height={1200}
                    unoptimized
                    className="block h-auto w-full"
                  />
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
