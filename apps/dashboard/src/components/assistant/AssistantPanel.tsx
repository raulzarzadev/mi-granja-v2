'use client'

import { type ReactNode, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import ButtonClose from '@/components/buttons/ButtonClose'
import { useFixedViewport } from '@/hooks/useFixedViewport'

export default function AssistantPanel({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
}) {
  const viewport = useFixedViewport(isOpen)
  const panel = useRef<HTMLElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    if (!isOpen) return
    document.documentElement.setAttribute('data-assistant-open', '')
    const previous = document.activeElement as HTMLElement | null
    panel.current?.focus()
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.querySelector('[role="dialog"]')) close.current()
    }
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.documentElement.removeAttribute('data-assistant-open')
      document.removeEventListener('keydown', handleEscape)
      if (previous?.isConnected) previous.focus()
    }
  }, [isOpen])
  if (!isOpen || typeof document === 'undefined') return null
  return createPortal(
    <aside
      ref={panel}
      tabIndex={-1}
      aria-label="Asistente IA"
      style={{
        ...viewport,
        top: 'var(--fixed-top-inset, 0px)',
        left: 'var(--fixed-left-inset, 0px)',
        height: 'var(--fixed-visible-height, 100dvh)',
        maxWidth: 'var(--fixed-visible-width, 100vw)',
      }}
      className="assistant-panel fixed z-[51] flex w-full flex-col overflow-hidden border-r border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-sm outline-none md:w-[380px] xl:w-[420px]"
    >
      <header className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <h2 className="min-w-0 text-base font-semibold text-slate-900">{title}</h2>
        <ButtonClose
          title="Cerrar asistente"
          onClick={onClose}
          className="h-11 shrink-0 justify-center rounded-lg px-2 !text-slate-600 hover:bg-slate-100 hover:!text-slate-900 focus-visible:ring-2 focus-visible:ring-green-700"
        />
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </aside>,
    document.body,
  )
}
