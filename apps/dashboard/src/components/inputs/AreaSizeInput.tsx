'use client'

import { type PointerEvent, useCallback, useEffect, useRef, useState } from 'react'
import { PiMinus, PiPlus } from 'react-icons/pi'

export default function AreaSizeInput({
  id,
  value,
  onChange,
  disabled = false,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const currentValue = useRef(value)
  currentValue.current = value
  const repeatTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const repeated = useRef(false)
  const [repeatingAmount, setRepeatingAmount] = useState<number | null>(null)
  const stopRepeating = useCallback(() => {
    if (repeatTimer.current !== null) clearTimeout(repeatTimer.current)
    repeatTimer.current = null
    setRepeatingAmount(null)
  }, [])
  useEffect(() => {
    window.addEventListener('blur', stopRepeating)
    document.addEventListener('visibilitychange', stopRepeating)
    return () => {
      stopRepeating()
      window.removeEventListener('blur', stopRepeating)
      document.removeEventListener('visibilitychange', stopRepeating)
    }
  }, [stopRepeating])
  useEffect(() => {
    if (disabled || (repeatTimer.current !== null && Number(value) <= 0)) stopRepeating()
  }, [disabled, value, stopRepeating])
  const changeBy = (amount: number) => {
    const current = Number(currentValue.current) || 0
    const next = String(Math.round(Math.max(0, current + amount) * 100) / 100)
    currentValue.current = next
    onChange(next)
  }
  const startRepeating = (event: PointerEvent<HTMLButtonElement>, amount: number) => {
    if (event.button !== 0 || disabled) return
    stopRepeating()
    repeated.current = false
    event.currentTarget.setPointerCapture?.(event.pointerId)
    const tick = () => {
      repeated.current = true
      setRepeatingAmount(amount)
      changeBy(amount)
      if (amount < 0 && Number(currentValue.current) <= 0) return
      repeatTimer.current = setTimeout(tick, 80)
    }
    repeatTimer.current = setTimeout(tick, 400)
  }
  const clickStep = (amount: number) => {
    if (!repeated.current) changeBy(amount)
    repeated.current = false
  }
  const buttonClass =
    'flex h-11 w-11 shrink-0 touch-none select-none cursor-pointer items-center justify-center rounded-xl text-gray-600 hover:bg-green-50 hover:text-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:cursor-not-allowed disabled:opacity-40'
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-gray-700">
        Metros cuadrados
      </label>
      <div className="flex items-center gap-1 rounded-2xl border border-gray-300 bg-white p-1 focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-500">
        <button
          type="button"
          aria-label="Reducir metros cuadrados"
          disabled={disabled || !value || Number(value) <= 0}
          onPointerDown={(event) => startRepeating(event, -1)}
          onPointerUp={stopRepeating}
          onPointerCancel={stopRepeating}
          onLostPointerCapture={stopRepeating}
          onContextMenu={(event) => event.preventDefault()}
          onClick={() => clickStep(-1)}
          className={`${buttonClass} ${repeatingAmount === -1 ? 'bg-green-100 text-green-700' : ''}`}
        >
          <PiMinus
            aria-hidden="true"
            size={20}
            className={
              repeatingAmount === -1
                ? 'animate-[pulse_0.6s_ease-in-out_infinite] motion-reduce:animate-none'
                : undefined
            }
          />
        </button>
        <input
          id={id}
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          placeholder="0"
          className="min-w-0 w-full appearance-none border-0 bg-transparent text-center text-xl font-semibold text-gray-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="text-sm text-gray-500">m²</span>
        <button
          type="button"
          aria-label="Aumentar metros cuadrados"
          disabled={disabled}
          onPointerDown={(event) => startRepeating(event, 1)}
          onPointerUp={stopRepeating}
          onPointerCancel={stopRepeating}
          onLostPointerCapture={stopRepeating}
          onContextMenu={(event) => event.preventDefault()}
          onClick={() => clickStep(1)}
          className={`${buttonClass} ${repeatingAmount === 1 ? 'bg-green-100 text-green-700' : ''}`}
        >
          <PiPlus
            aria-hidden="true"
            size={20}
            className={
              repeatingAmount === 1
                ? 'animate-[pulse_0.6s_ease-in-out_infinite] motion-reduce:animate-none'
                : undefined
            }
          />
        </button>
      </div>
    </div>
  )
}
