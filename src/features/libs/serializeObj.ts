import { Timestamp } from 'firebase/firestore'

export function serializeObj<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj
  }

  // Si es un array, procesar cada elemento
  if (Array.isArray(obj)) {
    return obj.map((item) => serializeObj(item)) as unknown as T
  }

  // Verificar si es un Timestamp (con check de seguridad para entornos de test)
  try {
    if (
      typeof Timestamp !== 'undefined' &&
      typeof Timestamp === 'function' &&
      obj instanceof Timestamp
    ) {
      return obj.toMillis() as unknown as T
    }
  } catch {
    // Ignorar errores en entornos de test donde Timestamp no está disponible
  }

  // Verificar si es un objeto tipo Timestamp (para compatibilidad con mocks)
  if (
    obj &&
    typeof obj === 'object' &&
    'toMillis' in obj &&
    typeof (obj as { toMillis: unknown }).toMillis === 'function'
  ) {
    return (obj as { toMillis: () => number }).toMillis() as unknown as T
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
export function deserializeObj<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj
  }

  // Si es un array, procesar cada elemento
  if (Array.isArray(obj)) {
    return obj.map((item) => deserializeObj(item)) as unknown as T
  }

  // Verificar si es un Timestamp (con check de seguridad para entornos de test)
  try {
    if (
      typeof Timestamp !== 'undefined' &&
      typeof Timestamp === 'function' &&
      obj instanceof Timestamp
    ) {
      return Timestamp.fromMillis(obj as unknown as number) as unknown as T
    }
  } catch {
    // Ignorar errores en entornos de test donde Timestamp no está disponible
  }

  // Verificar si es un objeto tipo Timestamp (para compatibilidad con mocks)
  if (
    obj &&
    typeof obj === 'object' &&
    'fromMillis' in obj &&
    typeof (obj as { fromMillis: unknown }).fromMillis === 'function'
  ) {
    return (obj as { fromMillis: (millis: number) => Timestamp }).fromMillis(
      obj as unknown as number
    ) as unknown as T
  }

  if (typeof obj === 'number') {
    return new Date(obj) as unknown as T
  }

  // Si es un objeto, procesar cada propiedad
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(obj)) {
      result[key] = deserializeObj(value)
    }

    return result as T
  }

  // Si no es un objeto, array o Timestamp, devolverlo sin cambios
  return obj
}
