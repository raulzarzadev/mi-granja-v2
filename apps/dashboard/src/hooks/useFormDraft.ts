import { useEffect, useRef } from 'react'

// Restore only on opening a draft; never overwrite it with the pre-restore render.
export function useFormDraft<T>(
  key: string | undefined,
  open: boolean,
  value: T,
  restore: (value: T) => void,
) {
  const restoreRef = useRef(restore)
  restoreRef.current = restore
  const skipWrite = useRef(false)
  useEffect(() => {
    if (!key || !open) return
    skipWrite.current = true
    try {
      const raw = localStorage.getItem(key)
      if (raw) restoreRef.current(JSON.parse(raw) as T)
    } catch (error) {
      console.warn('No se pudo recuperar el borrador', error)
    }
  }, [key, open])
  useEffect(() => {
    if (!key || !open) return
    if (skipWrite.current) {
      skipWrite.current = false
      return
    }
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.warn('No se pudo guardar el borrador', error)
    }
  }, [key, open, value])
}
