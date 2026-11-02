'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'
import AiAssistant from '@/components/AiAssistant'
import { EmojiIcon } from '@/components/Icon/emoji-icons'
import ModalAnimalForm from '@/components/ModalAnimalForm'
import { useAnimalSelection } from './AnimalSelectionContext'

export default function QuickCreateButton({
  placement = 'floating',
}: {
  placement?: 'floating' | 'sidebar'
}) {
  const router = useRouter()
  const { selectedAnimalIds } = useAnimalSelection()
  const [expanded, setExpanded] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [animalOpen, setAnimalOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const actionsId = useId()

  useEffect(() => {
    if (!expanded) return
    const closeOutside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setExpanded(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpanded(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [expanded])

  const labelClass =
    'quick-create-label pointer-events-auto absolute left-1/2 top-full mt-1.5 w-20 -translate-x-1/2 rounded-lg bg-white px-1 py-1 text-center text-[11px] font-semibold leading-4 text-slate-800 shadow-sm'

  const actionClass =
    'quick-create-action pointer-events-auto absolute flex h-14 w-14 items-center justify-center rounded-full border border-green-200 bg-white text-green-800 shadow-lg transition-colors hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2'

  return (
    <>
      <style>{`
        @media (max-width: 767px) {
          .quick-create-floating {
            top: calc(var(--fixed-bottom-edge, 100dvh) - 9rem - env(safe-area-inset-bottom, 0px));
            bottom: auto;
            left: calc(var(--fixed-left-inset, 0px) + var(--fixed-visible-width, 100vw) - max(1rem, env(safe-area-inset-right)) - 3.5rem);
            right: auto;
          }
        }
        .quick-create-sidebar .quick-create-action {
          position: relative;
          inset: auto;
          width: 100%;
          height: auto;
          min-height: 44px;
          justify-content: flex-start;
          gap: 0.5rem;
          border: 0;
          border-radius: 0.75rem;
          padding: 0.5rem 0.75rem;
          box-shadow: none;
          animation: quick-create-label-in 200ms ease-out both;
        }
        .quick-create-sidebar .quick-create-label {
          position: static;
          width: auto;
          margin: 0;
          padding: 0;
          translate: none;
          transform: none;
          background: transparent;
          box-shadow: none;
          font-size: 12px;
          text-align: left;
          animation: none;
        }
        .quick-create-action {
          animation: quick-create-orbit 440ms cubic-bezier(0.16, 1.35, 0.35, 1) both;
          animation-delay: var(--orbit-delay, 0ms);
        }
        .quick-create-action:nth-child(1) {
          --orbit-x: 0rem;
          --orbit-y: 12rem;
          --orbit-delay: 0ms;
        }
        .quick-create-action:nth-child(2) {
          --orbit-x: 6rem;
          --orbit-y: 10.375rem;
          --orbit-delay: 55ms;
        }
        .quick-create-action:nth-child(3) {
          --orbit-x: 10.375rem;
          --orbit-y: 6rem;
          --orbit-delay: 110ms;
        }
        .quick-create-action:nth-child(4) {
          --orbit-x: 12rem;
          --orbit-y: 0rem;
          --orbit-delay: 165ms;
        }
        .quick-create-label {
          animation: quick-create-label-in 200ms ease-out both;
          animation-delay: calc(var(--orbit-delay, 0ms) + 220ms);
        }
        @keyframes quick-create-orbit {
          from { opacity: 0; transform: translate(var(--orbit-x), var(--orbit-y)) scale(0.25); }
          to { opacity: 1; transform: translate(0, 0) scale(1); }
        }
        @keyframes quick-create-label-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .quick-create-action, .quick-create-label { animation: none; }
        }
      `}</style>
      <div
        ref={containerRef}
        className={
          placement === 'sidebar'
            ? 'quick-create-sidebar flex w-full flex-col-reverse gap-2'
            : 'quick-create-floating fixed z-40 h-14 w-14 md:hidden'
        }
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) setExpanded(false)
        }}
      >
        {expanded && (
          <div
            id={actionsId}
            role="group"
            aria-label="Crear nuevo"
            className={
              placement === 'sidebar'
                ? 'ml-4 flex flex-col gap-1 border-l border-green-100 pl-2'
                : 'pointer-events-none absolute inset-0'
            }
          >
            <Link
              href="/registro/nuevo"
              onClick={() => setExpanded(false)}
              className={`${actionClass} bottom-48 right-0`}
            >
              <EmojiIcon emoji="📋" className="h-6 w-6" />
              <span className={labelClass}>Nuevo registro</span>
            </Link>
            <button
              type="button"
              className={`${actionClass} bottom-[10.375rem] right-24`}
              onClick={() => {
                setExpanded(false)
                setAnimalOpen(true)
              }}
            >
              <EmojiIcon emoji="🐄" className="h-6 w-6" />
              <span className={labelClass}>Nuevo animal</span>
            </button>
            <Link
              href="/empadre/nueva"
              onClick={() => setExpanded(false)}
              className={`${actionClass} bottom-24 right-[10.375rem]`}
            >
              <EmojiIcon emoji="🐐" className="h-6 w-6" />
              <span className={labelClass}>Nuevo empadre</span>
            </Link>
            {placement === 'floating' && (
              <button
                type="button"
                className={`${actionClass} bottom-0 right-48`}
                onClick={() => {
                  setExpanded(false)
                  setAssistantOpen(true)
                }}
              >
                <EmojiIcon emoji="✨" className="h-6 w-6" />
                <span className={labelClass}>Asistente IA</span>
              </button>
            )}
          </div>
        )}
        <button
          ref={triggerRef}
          type="button"
          aria-label={
            selectedAnimalIds.length
              ? `Crear registro para ${selectedAnimalIds.length} animales seleccionados`
              : expanded
                ? 'Cerrar acciones de creación'
                : 'Crear nuevo'
          }
          aria-expanded={expanded}
          aria-controls={expanded ? actionsId : undefined}
          onClick={() => {
            if (selectedAnimalIds.length) {
              setExpanded(false)
              const params = new URLSearchParams({ animalIds: selectedAnimalIds.join(',') })
              router.push(`/registro/nuevo?${params}`)
            } else {
              setExpanded((current) => !current)
            }
          }}
          className={
            placement === 'sidebar'
              ? 'flex min-h-11 w-full items-center gap-2 rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2'
              : `relative flex h-14 w-14 items-center justify-center rounded-full bg-green-700 text-white shadow-lg transition-colors hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-4`
          }
        >
          {placement === 'floating' && !expanded && (
            <span aria-hidden="true" className="absolute right-1.5 top-1.5">
              <EmojiIcon emoji="✨" className="h-3.5 w-3.5" />
            </span>
          )}
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className={`h-7 w-7 transition-transform duration-300 ease-out motion-reduce:transition-none ${expanded ? 'rotate-45' : ''}`}
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          {placement === 'sidebar' && (
            <span>{selectedAnimalIds.length ? 'Crear registro' : 'Crear nuevo'}</span>
          )}
        </button>
      </div>
      {placement === 'sidebar' && (
        <button
          type="button"
          onClick={() => {
            setExpanded(false)
            setAssistantOpen(true)
          }}
          className="mt-2 flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-800 transition-colors hover:bg-green-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2"
        >
          <EmojiIcon emoji="✨" className="h-5 w-5" />
          <span>Asistente IA</span>
        </button>
      )}
      <AiAssistant
        open={assistantOpen}
        showTrigger={false}
        onOpenChange={(open) => {
          setAssistantOpen(open)
          if (!open) triggerRef.current?.focus()
        }}
      />
      <ModalAnimalForm
        open={animalOpen}
        onClose={() => {
          setAnimalOpen(false)
          triggerRef.current?.focus()
        }}
        showTrigger={false}
        formVariant="simple"
      />
    </>
  )
}
