'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { FaChevronLeft, FaChevronRight, FaClock } from 'react-icons/fa'

const MONTHS_SHORT = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
]

function daysInMonth(month: number, year: number): number {
  if (!month || !year) return 31
  return new Date(year, month, 0).getDate()
}

function parseDateValue(value: string): {
  day: number
  month: number
  year: number
  hours: number
  minutes: number
  hasTime: boolean
} {
  if (!value) return { day: 0, month: 0, year: 0, hours: 0, minutes: 0, hasTime: false }
  const hasTime = value.includes('T')
  const [datePart, timePart] = value.split('T')
  const [y, m, d] = (datePart || '').split('-').map(Number)
  const [h, min] = hasTime ? (timePart || '').split(':').map(Number) : [0, 0]
  if (!y || !m || !d) return { day: 0, month: 0, year: 0, hours: 0, minutes: 0, hasTime: false }
  return { day: d, month: m, year: y, hours: h || 0, minutes: min || 0, hasTime }
}

function toDateString(
  day: number,
  month: number,
  year: number,
  includeTime?: boolean,
  hours?: number,
  minutes?: number,
): string {
  if (!day || !month || !year) return ''
  const d = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  if (includeTime && hours != null && minutes != null) {
    return `${d}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }
  return d
}

function getDecadeStart(y: number): number {
  return Math.floor(y / 10) * 10
}

/** Day of week the 1st falls on (0=Mon … 6=Sun) */
function firstWeekday(month: number, year: number): number {
  const d = new Date(year, month - 1, 1).getDay() // 0=Sun
  return d === 0 ? 6 : d - 1 // shift to Mon-based
}

const DAYS_HEADER = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do']

type PickerType = 'day' | 'month' | 'year' | 'time' | null

function Popover({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 z-50 mt-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg"
    >
      {children}
    </div>
  )
}

export interface DatePickerButtonsProps {
  /** Current value in YYYY-MM-DD or YYYY-MM-DDTHH:mm format */
  value: string
  /** Called with new value (or "" if incomplete) */
  onChange: (value: string) => void
  /** Minimum selectable year */
  minYear?: number
  /** Maximum selectable year */
  maxYear?: number
  /** Default decade to show when no year is selected */
  defaultDecade?: number
  /** Placeholder labels */
  placeholders?: { day?: string; month?: string; year?: string }
  /** Label shown above the picker */
  label?: string
  /** Helper text shown below the buttons */
  helperText?: string
  /** Show "Hoy" shortcut button */
  showToday?: boolean
  /** Show time picker button */
  showTime?: boolean
}

const currentYear = new Date().getFullYear()

const QUICK_HOURS = [
  { label: '00:00', h: 0, m: 0 },
  { label: '07:00', h: 7, m: 0 },
  { label: '09:00', h: 9, m: 0 },
  { label: '10:00', h: 10, m: 0 },
  { label: '14:00', h: 14, m: 0 },
  { label: '18:00', h: 18, m: 0 },
  { label: '22:00', h: 22, m: 0 },
  { label: '23:59', h: 23, m: 59 },
]

export function DatePickerButtons({
  value,
  onChange,
  minYear = 1930,
  maxYear = currentYear,
  defaultDecade = 2000,
  placeholders = {},
  label,
  helperText,
  showToday = false,
  showTime = false,
}: DatePickerButtonsProps) {
  const [activePicker, setActivePicker] = useState<PickerType>(null)
  const [yearPageStart, setYearPageStart] = useState<number>(() => getDecadeStart(defaultDecade))

  const parsed = parseDateValue(value)
  const { day, month, year, hours, minutes, hasTime } = parsed
  const maxDays = daysInMonth(month || 1, year || 2000)
  const dayOffset = useMemo(() => firstWeekday(month || 1, year || 2000), [month, year])

  const emit = (d: number, m: number, y: number, h: number, min: number, time: boolean) => {
    const max = daysInMonth(m, y)
    if (d > max) d = max
    onChange(toDateString(d, m, y, time, h, min))
  }

  const updateDate = (d: number, m: number, y: number) => {
    const now = new Date()
    if (!d) d = now.getDate()
    if (!m) m = now.getMonth() + 1
    if (!y) y = now.getFullYear()
    emit(d, m, y, hours, minutes, showTime && hasTime)
  }

  const updateTime = (h: number, min: number) => {
    const now = new Date()
    const d = day || now.getDate()
    const m = month || now.getMonth() + 1
    const y = year || now.getFullYear()
    emit(d, m, y, h, min, true)
  }

  const setToday = () => {
    const t = new Date()
    emit(t.getDate(), t.getMonth() + 1, t.getFullYear(), t.getHours(), t.getMinutes(), showTime)
  }

  const btnBase =
    'h-10 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium transition-colors hover:bg-gray-50 active:bg-gray-100 cursor-pointer'

  const { day: dayPh = 'Día', month: monthPh = 'Mes', year: yearPh = 'Año' } = placeholders

  return (
    <div className="relative max-w-sm">
      {(label || showToday) && (
        <div className="flex items-center justify-between mb-1">
          {label && <label className="text-xs font-medium text-gray-500">{label}</label>}
          {showToday && (
            <button
              type="button"
              onClick={setToday}
              className="text-[11px] text-blue-600 hover:underline"
            >
              Hoy
            </button>
          )}
        </div>
      )}
      <div className="flex gap-1.5">
        {/* Day */}
        <button
          type="button"
          onClick={() => setActivePicker(activePicker === 'day' ? null : 'day')}
          className={`${btnBase} w-14 flex-none text-center ${activePicker === 'day' ? 'ring-2 ring-blue-500' : ''}`}
        >
          {day ? day : <span className="text-gray-500">{dayPh}</span>}
        </button>

        {/* Month */}
        <button
          type="button"
          onClick={() => setActivePicker(activePicker === 'month' ? null : 'month')}
          className={`${btnBase} flex-1 text-center ${activePicker === 'month' ? 'ring-2 ring-blue-500' : ''}`}
        >
          {month ? MONTHS_SHORT[month - 1] : <span className="text-gray-500">{monthPh}</span>}
        </button>

        {/* Year */}
        <button
          type="button"
          onClick={() => {
            if (activePicker !== 'year') setYearPageStart(getDecadeStart(year || defaultDecade))
            setActivePicker(activePicker === 'year' ? null : 'year')
          }}
          className={`${btnBase} w-[4.5rem] flex-none text-center ${activePicker === 'year' ? 'ring-2 ring-blue-500' : ''}`}
        >
          {year ? year : <span className="text-gray-500">{yearPh}</span>}
        </button>

        {/* Time */}
        {showTime && (
          <button
            type="button"
            onClick={() => setActivePicker(activePicker === 'time' ? null : 'time')}
            className={`${btnBase} flex-none text-center flex items-center gap-1 px-2 ${activePicker === 'time' ? 'ring-2 ring-blue-500' : ''}`}
          >
            <FaClock className="w-3 h-3 text-gray-400" />
            <span className={hasTime ? '' : 'text-gray-400'}>
              {hasTime
                ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
                : '--:--'}
            </span>
          </button>
        )}
      </div>
      {helperText && <p className="text-[11px] text-gray-500 mt-1">{helperText}</p>}

      {/* Day picker — calendar grid */}
      <Popover open={activePicker === 'day'} onClose={() => setActivePicker(null)}>
        <table className="border-collapse">
          <thead>
            <tr>
              {DAYS_HEADER.map((dh) => (
                <th
                  key={dh}
                  className="h-7 w-9 text-center text-[10px] font-semibold text-gray-400"
                >
                  {dh}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(() => {
              const cells: (number | null)[] = [
                ...Array.from({ length: dayOffset }, () => null),
                ...Array.from({ length: maxDays }, (_, i) => i + 1),
              ]
              const rows: (number | null)[][] = []
              for (let i = 0; i < cells.length; i += 7) {
                rows.push(cells.slice(i, i + 7))
              }
              return rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((d, ci) =>
                    d ? (
                      <td key={ci} className="p-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            updateDate(d, month, year)
                            setActivePicker(null)
                          }}
                          className={`h-8 w-8 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                            d === day ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                          }`}
                        >
                          {d}
                        </button>
                      </td>
                    ) : (
                      <td key={ci} />
                    ),
                  )}
                </tr>
              ))
            })()}
          </tbody>
        </table>
      </Popover>

      {/* Month picker */}
      <Popover open={activePicker === 'month'} onClose={() => setActivePicker(null)}>
        <div className="grid grid-cols-4 gap-1 w-80">
          {MONTHS_SHORT.map((m, i) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                updateDate(day, i + 1, year)
                setActivePicker(null)
              }}
              className={`h-9 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                i + 1 === month ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </Popover>

      {/* Year picker — fixed table row */}
      <Popover open={activePicker === 'year'} onClose={() => setActivePicker(null)}>
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="p-0">
                <button
                  type="button"
                  disabled={yearPageStart <= minYear}
                  onClick={() => setYearPageStart((s) => Math.max(s - 10, getDecadeStart(minYear)))}
                  className="p-1 rounded-md text-gray-600 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  aria-label="Años más antiguos"
                >
                  <FaChevronLeft className="w-3 h-3" />
                </button>
              </th>
              <th colSpan={8} className="text-center text-xs text-gray-500 font-medium">
                {yearPageStart}–{yearPageStart + 9}
              </th>
              <th className="p-0 text-right">
                <button
                  type="button"
                  disabled={yearPageStart + 9 >= maxYear}
                  onClick={() => setYearPageStart((s) => Math.min(s + 10, getDecadeStart(maxYear)))}
                  className="p-1 rounded-md text-gray-600 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  aria-label="Años más recientes"
                >
                  <FaChevronRight className="w-3 h-3" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {Array.from({ length: 10 }, (_, i) => {
                const y = yearPageStart + i
                const inRange = y >= minYear && y <= maxYear
                return (
                  <td key={y} className="p-0.5" style={{ width: '2.75rem' }}>
                    {inRange ? (
                      <button
                        type="button"
                        onClick={() => {
                          updateDate(day, month, y)
                          setActivePicker(null)
                        }}
                        className={`h-8 w-full rounded-md text-xs font-medium transition-colors cursor-pointer ${
                          y === year ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                        }`}
                      >
                        {y}
                      </button>
                    ) : null}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </Popover>

      {/* Time picker */}
      {showTime && (
        <Popover open={activePicker === 'time'} onClose={() => setActivePicker(null)}>
          <div className="w-60">
            <div className="flex flex-wrap gap-1 mb-2">
              {QUICK_HOURS.map((qh) => (
                <button
                  key={qh.label}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    updateTime(qh.h, qh.m)
                    setActivePicker(null)
                  }}
                  className={`h-8 px-2 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    hours === qh.h && minutes === qh.m && hasTime
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {qh.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 border-t border-gray-100 pt-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                defaultValue={hasTime ? String(hours).padStart(2, '0') : ''}
                key={`h-${hasTime ? hours : 'empty'}`}
                placeholder="HH"
                onBlur={(e) => {
                  const raw = e.target.value.replace(/\D/g, '').slice(0, 2)
                  if (raw === '') return
                  const h = Math.min(23, Number(raw))
                  updateTime(h, hasTime ? minutes : 0)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur()
                }}
                onWheel={(e) => e.currentTarget.blur()}
                className="h-8 w-12 rounded-md border border-gray-300 bg-white text-center text-sm"
              />
              <span className="text-lg font-bold text-gray-400">:</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                defaultValue={hasTime ? String(minutes).padStart(2, '0') : ''}
                key={`m-${hasTime ? minutes : 'empty'}`}
                placeholder="mm"
                onBlur={(e) => {
                  const raw = e.target.value.replace(/\D/g, '').slice(0, 2)
                  if (raw === '') return
                  const min = Math.min(59, Number(raw))
                  updateTime(hasTime ? hours : 0, min)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur()
                }}
                onWheel={(e) => e.currentTarget.blur()}
                className="h-8 w-12 rounded-md border border-gray-300 bg-white text-center text-sm"
              />
              <button
                type="button"
                onClick={() => setActivePicker(null)}
                className="text-xs text-blue-600 hover:underline ml-auto"
              >
                OK
              </button>
            </div>
          </div>
        </Popover>
      )}
    </div>
  )
}
