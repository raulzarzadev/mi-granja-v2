'use client'

import Link from 'next/link'
import React, { useEffect, useRef, useState } from 'react'
import { useReminders } from '@/hooks/useReminders'

const formatDueDate = (d: Date | string): string => {
  const date = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return ''
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
  if (diff < 0) return `Hace ${Math.abs(diff)}d`
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Mañana'
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

const TYPE_ICON: Record<string, string> = {
  medical: '🏥',
  breeding: '🐣',
  feeding: '🌾',
  weight: '⚖️',
  other: '📝',
}

/**
 * Campana de notificaciones del Navbar.
 * Badge = today + overdue. Dropdown muestra primeros 8.
 */
const NotificationsBell: React.FC = () => {
  const { getOverdueReminders, getTodayReminders, getBadgeCount } = useReminders()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const count = getBadgeCount()
  const items = [...getOverdueReminders(), ...getTodayReminders()]
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 8)

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Notificaciones${count > 0 ? `: ${count} pendientes` : ''}`}
        className="relative flex items-center justify-center h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-colors cursor-pointer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M12 2.25A6.75 6.75 0 0 0 5.25 9v3.27c0 .51-.2 1-.56 1.36l-1.06 1.06A1.5 1.5 0 0 0 4.69 17.25h14.62a1.5 1.5 0 0 0 1.06-2.56l-1.06-1.06a1.93 1.93 0 0 1-.56-1.36V9A6.75 6.75 0 0 0 12 2.25ZM9.75 19.5a2.25 2.25 0 0 0 4.5 0h-4.5Z"
            clipRule="evenodd"
          />
        </svg>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center shadow">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] origin-top-right rounded-lg shadow-lg bg-white ring-1 ring-black/5 z-50 overflow-hidden"
          role="menu"
        >
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Notificaciones</h3>
            {count > 0 && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                {count}
              </span>
            )}
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              <span className="block text-2xl mb-1">🎉</span>
              Sin recordatorios pendientes hoy.
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-gray-100">
              {items.map((r) => {
                const overdue = new Date(r.dueDate).getTime() < new Date().setHours(0, 0, 0, 0)
                return (
                  <li key={r.id}>
                    <Link
                      href={`/recordatorio/${r.id}`}
                      onClick={() => setOpen(false)}
                      className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-lg leading-none mt-0.5">
                          {TYPE_ICON[r.type] || '📝'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={`text-xs ${
                                overdue ? 'text-red-600 font-semibold' : 'text-gray-500'
                              }`}
                            >
                              {formatDueDate(r.dueDate)}
                            </span>
                            {r.priority === 'high' && (
                              <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                                Alta
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="border-t border-gray-100">
            <Link
              href="/?dashboard-main=recordatorios"
              onClick={() => setOpen(false)}
              className="block w-full text-center px-4 py-2 text-sm text-green-700 hover:bg-green-50 font-medium"
            >
              Ver todos los recordatorios
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationsBell
