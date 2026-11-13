'use client'

import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { auth, storage } from '@/lib/firebase'

export const MAX_ANIMAL_PHOTO_INPUT_BYTES = 50 * 1024 * 1024
export const ANIMAL_PHOTO_TARGET_BYTES = 450 * 1024
const MAX_EDGE = 1920

type Decoded = { source: CanvasImageSource; width: number; height: number; close: () => void }
async function decodeNative(blob: Blob): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' })
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      }
    } catch {
      /* Safari admite algunos formatos solo mediante Image. */
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const image = new Image()
    image.onload = () =>
      resolve({
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        close: () => URL.revokeObjectURL(url),
      })
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo abrir la imagen.'))
    }
    image.src = url
  })
}
async function decode(file: File): Promise<Decoded> {
  try {
    return await decodeNative(file)
  } catch {
    /* Conversores bajo demanda. */
  }
  if (/\.(heic|heif)$/i.test(file.name) || /image\/hei[cf]/i.test(file.type)) {
    try {
      const { default: heic2any } = await import('heic2any')
      const converted = await heic2any({ blob: file, toType: 'image/png' })
      return await decodeNative(Array.isArray(converted) ? converted[0] : converted)
    } catch {
      throw new Error('No se pudo convertir esta foto HEIC. Prueba otra foto o expórtala como JPG.')
    }
  }
  if (/\.(tif|tiff)$/i.test(file.name) || /image\/tiff/i.test(file.type)) {
    const UTIF = await import('utif')
    const data = await file.arrayBuffer()
    const images = UTIF.decode(data)
    const frame = images.sort(
      (a, b) => Number(b.t256) * Number(b.t257) - Number(a.t256) * Number(a.t257),
    )[0]
    if (!frame) throw new Error('El TIFF no contiene una imagen.')
    if (Number(frame.t256) * Number(frame.t257) > 60000000)
      throw new Error('La resolución de esta imagen es demasiado grande.')
    UTIF.decodeImage(data, frame)
    if (!frame.width || !frame.height || frame.width * frame.height > 60000000)
      throw new Error('La resolución de esta imagen es demasiado grande.')
    const canvas = document.createElement('canvas')
    canvas.width = frame.width
    canvas.height = frame.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('No se pudo preparar la imagen.')
    context.putImageData(
      new ImageData(new Uint8ClampedArray(UTIF.toRGBA8(frame)), frame.width, frame.height),
      0,
      0,
    )
    return {
      source: canvas,
      width: canvas.width,
      height: canvas.height,
      close: () => {
        canvas.width = 0
        canvas.height = 0
      },
    }
  }
  throw new Error('No se pudo leer esta imagen. Prueba otra foto o expórtala como JPG, PNG o HEIC.')
}
const encode = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo comprimir la imagen.'))),
      type,
      quality,
    )
  })

/** Reencodifica antes de subir: orientación, proporciones y eliminación de metadatos. */
export async function compressAnimalPhoto(file: File): Promise<File> {
  if (!file.size) throw new Error('La imagen está vacía.')
  if (file.size > MAX_ANIMAL_PHOTO_INPUT_BYTES)
    throw new Error('La imagen original supera los 50 MB.')
  let timedOut = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const decoding = decode(file).then((image) => {
    if (timedOut) {
      image.close()
      throw new Error('La imagen tardó demasiado en abrirse.')
    }
    return image
  })
  let image: Decoded
  try {
    image = await Promise.race([
      decoding,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          timedOut = true
          reject(
            new Error(
              'La imagen tardó demasiado en abrirse. Prueba otra foto o expórtala como JPG.',
            ),
          )
        }, 45000)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
  const canvas = document.createElement('canvas')
  try {
    if (!image.width || !image.height || image.width * image.height > 60000000)
      throw new Error('La resolución de esta imagen es demasiado grande.')
    let edge = Math.min(MAX_EDGE, Math.max(image.width, image.height))
    while (true) {
      const ratio = Math.min(1, edge / Math.max(image.width, image.height))
      canvas.width = Math.max(1, Math.round(image.width * ratio))
      canvas.height = Math.max(1, Math.round(image.height * ratio))
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Tu navegador no pudo preparar la imagen.')
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image.source, 0, 0, canvas.width, canvas.height)
      for (const quality of [0.86, 0.79, 0.72]) {
        let blob = await encode(canvas, 'image/webp', quality)
        if (blob.type !== 'image/webp') blob = await encode(canvas, 'image/jpeg', quality)
        if (blob.size <= ANIMAL_PHOTO_TARGET_BYTES) {
          const extension = blob.type === 'image/webp' ? 'webp' : 'jpg'
          return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.${extension}`, {
            type: blob.type,
          })
        }
      }
      if (edge <= 640) throw new Error('No se pudo reducir esta imagen. Prueba otra foto.')
      edge = Math.max(640, Math.floor(edge * 0.8))
    }
  } finally {
    image.close()
    canvas.width = 0
    canvas.height = 0
  }
}

export async function uploadAnimalPhoto(file: File): Promise<string> {
  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('Inicia sesión para subir fotos.')
  const extension = file.type === 'image/webp' ? 'webp' : 'jpg'
  const target = ref(storage, `users/${userId}/animal-photos/${crypto.randomUUID()}.${extension}`)
  await uploadBytes(target, file, {
    contentType: file.type,
    cacheControl: 'public,max-age=31536000,immutable',
  })
  return getDownloadURL(target)
}
