'use client'

import { useCallback, useState } from 'react'

const PREFIX = 'mg_pref_'

/**
 * Hook para persistir preferencias de UI en localStorage.
 * Usa un prefijo `mg_pref_` para evitar colisiones.
 *
 * @param key - Clave única (ej: 'view_mode', 'beta_dismissed')
 * @param defaultValue - Valor por defecto si no hay nada guardado
 */
export function useLocalPreference<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const storageKey = `${PREFIX}${key}`

  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue
    try {
      const stored = localStorage.getItem(storageKey)
      return stored !== null ? JSON.parse(stored) : defaultValue
    } catch {
      return defaultValue
    }
  })

  const set = useCallback(
    (newValue: T) => {
      setValue(newValue)
      try {
        localStorage.setItem(storageKey, JSON.stringify(newValue))
      } catch {
        // localStorage full or unavailable
      }
    },
    [storageKey],
  )

  return [value, set]
}
