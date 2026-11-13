'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { useAppFeedback } from '@/components/AppFeedbackProvider'
import { Modal } from '@/components/Modal'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useFarmPermissions } from '@/hooks/useFarmPermissions'
import { compressAnimalPhoto, uploadAnimalPhoto } from '@/lib/animal-photo'
import type { Animal } from '@/types/animals'

const photoUrls = (animal: Animal) => [
  ...new Set([animal.imageUrl, ...(animal.imageUrls ?? [])].filter((url): url is string => !!url)),
]
type Photo = { id: string; url: string; file?: File }

function PhotoEditor({ animal, onClose }: { animal: Animal; onClose: () => void }) {
  const { has } = useFarmPermissions()
  const canEdit = has('animals', 'update')
  const { update } = useAnimalCRUD()
  const { confirmAction } = useAppFeedback()
  const [photos, setPhotos] = useState<Photo[]>(() =>
    photoUrls(animal).map((url) => ({ id: url, url })),
  )
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const lock = useRef(false)
  const localUrls = useRef(new Set<string>())
  const uploaded = useRef(new Map<string, string>())
  useEffect(
    () => () => {
      for (const url of localUrls.current) URL.revokeObjectURL(url)
    },
    [],
  )

  const selectFiles = async (files: File[]) => {
    if (lock.current || !canEdit || !files.length) return
    if (photos.length + files.length > 12) {
      setError('Puedes guardar hasta 12 fotos por animal.')
      return
    }
    lock.current = true
    setBusy(true)
    setError('')
    try {
      for (const [i, file] of files.entries()) {
        setStatus(`Optimizando foto ${i + 1} de ${files.length}…`)
        const compressed = await compressAnimalPhoto(file)
        const url = URL.createObjectURL(compressed)
        localUrls.current.add(url)
        setPhotos((current) => [...current, { id: crypto.randomUUID(), url, file: compressed }])
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo preparar la foto.')
    } finally {
      lock.current = false
      setBusy(false)
      setStatus('')
    }
  }
  const save = async () => {
    if (lock.current || !canEdit) return
    lock.current = true
    setBusy(true)
    setError('')
    try {
      const urls: string[] = []
      for (const [i, photo] of photos.entries()) {
        setStatus(`Guardando foto ${i + 1} de ${photos.length}…`)
        if (photo.file && !uploaded.current.has(photo.id))
          uploaded.current.set(photo.id, await uploadAnimalPhoto(photo.file))
        urls.push(uploaded.current.get(photo.id) ?? photo.url)
      }
      await update(animal.id, { imageUrls: urls, imageUrl: urls[0] ?? '' })
      onClose()
    } catch {
      setError('No se pudieron guardar las fotos. Tus cambios siguen aquí; intenta de nuevo.')
    } finally {
      lock.current = false
      setBusy(false)
      setStatus('')
    }
  }
  return (
    <Modal
      isOpen
      onClose={() => {
        if (!lock.current) onClose()
      }}
      title={`Fotos de ${animal.animalNumber}`}
      size="xl"
      closeOnEscape={!busy}
      closeOnOverlayClick={!busy}
      footer={
        canEdit ? (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="min-h-11 rounded-lg bg-green-700 px-4 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
            >
              {busy ? 'Procesando…' : 'Guardar fotos'}
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {canEdit && (
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor={`photos-${animal.id}`}>
              Agregar fotos
            </label>
            <input
              id={`photos-${animal.id}`}
              type="file"
              multiple
              accept="image/*,.heic,.heif,.tif,.tiff"
              disabled={busy}
              onChange={(event) => {
                const files = Array.from(event.target.files ?? [])
                event.target.value = ''
                void selectFiles(files)
              }}
              className="block min-h-11 w-full min-w-0 text-sm file:mr-2 file:min-h-11 file:rounded-lg file:border-0 file:bg-green-50 file:px-3 file:text-green-800"
            />
            <p className="mt-1 text-xs text-slate-500">
              Se optimizan antes de subir. Hasta 12 fotos; originales de hasta 50 MB. GIF y archivos
              de varias páginas se guardan como una foto fija.
            </p>
          </div>
        )}
        {status && (
          <p role="status" className="text-sm text-green-700">
            {status}
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {!photos.length && (
          <p className="py-8 text-center text-sm text-slate-500">
            Este animal todavía no tiene fotos.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white"
            >
              <a
                href={photo.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Abrir foto ${index + 1}`}
              >
                <Image
                  src={photo.url}
                  alt={`Foto ${index + 1} de ${animal.animalNumber}`}
                  width={400}
                  height={300}
                  unoptimized
                  className="aspect-[4/3] w-full object-cover"
                />
              </a>
              <div className="flex flex-wrap items-center justify-between gap-1 p-2">
                {index === 0 ? (
                  <span className="text-xs font-medium text-green-700">Portada</span>
                ) : (
                  canEdit && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        setPhotos((current) => [
                          photo,
                          ...current.filter((entry) => entry.id !== photo.id),
                        ])
                      }
                      className="min-h-11 text-xs text-green-700 hover:underline disabled:opacity-50"
                    >
                      Usar de portada
                    </button>
                  )
                )}
                {canEdit && (
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={`Quitar foto ${index + 1}`}
                    onClick={async () => {
                      if (
                        await confirmAction({
                          title: 'Quitar foto',
                          message: `¿Quitar esta foto de ${animal.animalNumber}? El cambio se aplicará al guardar.`,
                          confirmLabel: 'Quitar foto',
                          danger: true,
                        })
                      )
                        setPhotos((current) => current.filter((entry) => entry.id !== photo.id))
                    }}
                    className="flex h-11 w-11 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      className="h-5 w-5"
                    >
                      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5m4-5v5" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

export default function AnimalPhotos({ animal }: { animal: Animal }) {
  const [open, setOpen] = useState(false)
  const urls = photoUrls(animal)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-green-700 hover:bg-green-50"
      >
        {urls[0] ? (
          <Image
            src={urls[0]}
            alt=""
            width={36}
            height={36}
            unoptimized
            className="h-9 w-9 rounded-lg object-cover"
          />
        ) : (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className="h-5 w-5"
          >
            <path d="M4 6h4l2-2h4l2 2h4v14H4z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        )}
        {urls.length ? `Fotos (${urls.length})` : 'Fotos del animal'}
      </button>
      {open && <PhotoEditor animal={animal} onClose={() => setOpen(false)} />}
    </>
  )
}
