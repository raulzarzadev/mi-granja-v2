import { Timestamp } from 'firebase/firestore'

export function serializeObj<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj
  }

  // Si es un array, procesar cada elemento
  if (Array.isArray(obj)) {
    return obj.map((item) => serializeObj(item)) as unknown as T
  }

  // Verificar si es un Timestamp
  if (obj instanceof Timestamp) {
    return obj.toMillis() as unknown as T
  }

  if (obj instanceof Date) {
    return obj.getTime() as unknown as T
  }

  // Si es un objeto, procesar cada propiedad
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeObj(value)
    }

    return result as T
  }

  // Si no es un objeto, array o Timestamp, devolverlo sin cambios
  return obj
}
