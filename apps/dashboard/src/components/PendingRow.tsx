'use client'

import Link from 'next/link'
import React from 'react'
import { EmojiIcon } from '@/components/Icon/emoji-icons'

/** Etiqueta relativa de vencimiento: "Vencido hace 3d", "Hoy", "Mañana", "En 5d". */
export const dueLabel = (days: number) => {
  if (days < 0) return `Vencido hace ${Math.abs(days)}d`
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Mañana'
  return `En ${days}d`
}

export const formatShortDate = (date: Date) =>
  date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })

interface PendingRowProps {
  emoji: string
  title: string
  subtitle?: string
  /** Días hasta el vencimiento (negativo = vencido); sin valor no muestra etiqueta. */
  daysUntil?: number
  /** Texto a la derecha en lugar de la etiqueta de vencimiento. */
  rightLabel?: string
  badge?: React.ReactNode
  muted?: boolean
  href?: string
  onClick?: () => void
}

/** Fila compacta de un pendiente (parto, destete o recordatorio). */
const PendingRow = ({
  emoji,
  title,
  subtitle,
  daysUntil,
  rightLabel,
  badge,
  muted,
  href,
  onClick,
}: PendingRowProps) => {
  const overdue = !muted && daysUntil !== undefined && daysUntil < 0
  const className = `w-full flex items-center gap-3 rounded-lg border px-3 py-2 text-left bg-white transition-colors cursor-pointer hover:bg-gray-50 ${
    overdue ? 'border-red-200' : 'border-gray-200'
  } ${muted ? 'opacity-60' : ''}`
  const body = (
    <>
      <span className="text-xl">
        <EmojiIcon emoji={emoji} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-gray-900 truncate">{title}</span>
        {subtitle && <span className="block text-xs text-gray-500 truncate">{subtitle}</span>}
      </span>
      {badge}
      <span
        className={`text-xs whitespace-nowrap ${overdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}
      >
        {rightLabel ?? (daysUntil !== undefined ? dueLabel(daysUntil) : '')}
      </span>
    </>
  )
  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  )
}

export default PendingRow
