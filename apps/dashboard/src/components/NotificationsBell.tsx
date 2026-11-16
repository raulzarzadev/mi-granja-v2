'use client'

import Link from 'next/link'
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { EmojiIcon, IconLabel } from '@/components/Icon/emoji-icons'
import { CalendarBell } from '@/components/Icon/farm-icons'
import { REMINDER_TYPE_ICONS } from '@/components/ReminderRow'
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

/**
 * Campana de notificaciones del Navbar.
 * Badge = today + overdue. Dropdown muestra primeros 8.
 */
const NotificationsBell: React.FC = () => {
  const { getOverdueReminders, getTodayReminders, getBadgeCount } = useReminders()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties | null>(null)

  useLayoutEffect(() => {
    if (!open) return
    const updatePosition = () => {
      const button = ref.current?.querySelector('button')
      if (!button) return
      const viewport = window.visualViewport
      const leftEdge = viewport?.offsetLeft ?? 0
      const topEdge = viewport?.offsetTop ?? 0
      const visibleWidth = viewport?.width ?? window.innerWidth
      const visibleHeight = viewport?.height ?? window.innerHeight
      const margin = 12
      const width = Math.min(320, visibleWidth - margin * 2)
      const bounds = button.getBoundingClientRect()
      const left = Math.max(
        leftEdge + margin,
        Math.min(bounds.right - width, leftEdge + visibleWidth - width - margin),
      )
      const top = Math.max(
        topEdge + margin,
        Math.min(bounds.bottom + 8, topEdge + visibleHeight - 120),
      )
      setPanelStyle({
        left,
        top,
        width,
        maxHeight: Math.max(0, topEdge + visibleHeight - top - margin),
      })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    window.visualViewport?.addEventListener('resize', updatePosition)
    window.visualViewport?.addEventListener('scroll', updatePosition)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      window.visualViewport?.removeEventListener('resize', updatePosition)
      window.visualViewport?.removeEventListener('scroll', updatePosition)
    }
  }, [open])

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
        aria-label={`Notificaciones y recordatorios${count > 0 ? `: ${count} pendientes` : ''}`}
        className="relative flex items-center justify-center h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-colors cursor-pointer"
      >
        <CalendarBell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center shadow">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && panelStyle && (
        <div
          style={panelStyle}
          className="fixed origin-top-right rounded-lg shadow-lg bg-white ring-1 ring-black/5 z-50 overflow-y-auto overscroll-contain"
          role="menu"
        >
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Notificaciones y recordatorios</h3>
            {count > 0 && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                {count}
              </span>
            )}
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              <span className="block text-2xl mb-1">
                <EmojiIcon emoji="🎉" />
              </span>
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
                          <IconLabel label={REMINDER_TYPE_ICONS[r.type] || '📝'} />
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
              href="/recordatorios"
              onClick={() => setOpen(false)}
              className="block w-full text-center px-4 py-2 text-sm text-green-700 hover:bg-green-50 font-medium"
            >
              Ver todos
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationsBell
