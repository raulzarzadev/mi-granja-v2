'use client'

import type { ReactNode } from 'react'
import { EmojiIcon, IconLabel } from '@/components/Icon/emoji-icons'

type QuickFilterMenuProps = {
  label: string
  selectedLabel: ReactNode
  value: string
  allLabel: string
  children?: ReactNode
  options: Array<{ value: string; label: string }>
  open: boolean
  onToggle: () => void
  onChange: (value: string) => void
}

export const QuickFilterMenu = ({
  label,
  selectedLabel,
  value,
  allLabel,
  options,
  open,
  onToggle,
  onChange,
  children,
}: QuickFilterMenuProps) => (
  <div className="relative">
    <button
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={onToggle}
      className={`inline-flex min-h-8 items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-1 ${
        value
          ? 'border-slate-300 bg-white text-slate-800 ring-2 ring-slate-400 ring-offset-1'
          : open
            ? 'border-slate-300 bg-slate-50 text-slate-800'
            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
      }`}
    >
      <span>{selectedLabel || label}</span>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="currentColor"
        className={`size-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.51a.75.75 0 0 1-1.08 0l-4.25-4.51a.75.75 0 0 1 .02-1.06Z"
          clipRule="evenodd"
        />
      </svg>
    </button>
    {open && (
      <div
        role="menu"
        aria-label={`Filtrar por ${label.toLowerCase()}`}
        className="absolute left-0 top-full z-30 mt-2 min-w-36 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
      >
        <button
          type="button"
          role="menuitemradio"
          aria-checked={value === ''}
          onClick={() => onChange('')}
          className={`flex min-h-9 w-full items-center justify-between rounded-md px-2.5 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 ${
            value === ''
              ? 'bg-slate-100 font-medium text-slate-900'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          {allLabel}
          {value === '' && (
            <span aria-hidden="true">
              <EmojiIcon emoji="✓" />
            </span>
          )}
        </button>
        {children}
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="menuitemradio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className={`flex min-h-9 w-full items-center justify-between rounded-md px-2.5 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 ${
              value === option.value
                ? 'bg-slate-100 font-medium text-slate-900'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <IconLabel label={option.label} />
            {value === option.value && (
              <span aria-hidden="true">
                <EmojiIcon emoji="✓" />
              </span>
            )}
          </button>
        ))}
      </div>
    )}
  </div>
)
