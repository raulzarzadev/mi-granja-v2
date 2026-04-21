import { doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Animal } from '@/types/animals'

type AnimalPatch = Partial<Animal> | ((a: { id: string }) => Partial<Animal>)

interface Opts {
  /** Tamaño de chunk (Firestore límite = 500, default 400) */
  chunkSize?: number
  /** Callback con progreso (current, total) después de cada commit */
  onProgress?: (current: number, total: number) => void
}

/**
 * Actualiza N animales en Firestore usando writeBatch en chunks.
 * Respeta el límite de 500 ops por batch y reporta progreso.
 */
export async function batchUpdateAnimals(
  ids: string[],
  patch: AnimalPatch,
  opts: Opts = {},
): Promise<void> {
  const chunkSize = opts.chunkSize ?? 400
  const total = ids.length
  if (total === 0) return

  for (let i = 0; i < total; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize)
    const batch = writeBatch(db)
    for (const id of chunk) {
      const data = typeof patch === 'function' ? patch({ id }) : patch
      batch.update(doc(db, 'animals', id), {
        ...data,
        updatedAt: serverTimestamp(),
      })
    }
    await batch.commit()
    opts.onProgress?.(Math.min(i + chunkSize, total), total)
  }
}
