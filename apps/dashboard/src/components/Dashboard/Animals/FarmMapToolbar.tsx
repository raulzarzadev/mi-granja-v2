'use client'

import { useEffect, useRef, useState } from 'react'
import {
  PiArrowCounterClockwise,
  PiCheck,
  PiDotsThree,
  PiHandPalm,
  PiPencilSimple,
  PiTrash,
} from 'react-icons/pi'
import Button from '@/components/buttons/Button'

type Props = {
  mode: 'browse' | 'draw' | 'edit'
  hand: boolean
  pendingCount: number
  pointCount: number
  dirty: boolean
  busy: boolean
  hasAnimals: boolean
  areaName?: string
  onHand: () => void
  onPending: () => void
  onUndoPoint: () => void
  onFinish: () => void
  onCancel: () => void
  onEdit: () => void
  onDone: () => void
  onDelete: () => void
}

export default function FarmMapToolbar(props: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menu = useRef<HTMLDivElement>(null)
  useEffect(() => {
    setMenuOpen(false)
  }, [props.mode, props.areaName])
  useEffect(() => {
    if (!menuOpen) return
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !menu.current?.contains(event.target)) setMenuOpen(false)
    }
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setMenuOpen(false)
        menu.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', keyDown)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', keyDown)
    }
  }, [menuOpen])
  const secondary = 'min-h-11 rounded-xl px-3 font-medium'
  return (
    <div
      role="group"
      aria-label="Herramientas de áreas"
      aria-busy={props.busy}
      className="flex flex-wrap items-center justify-center gap-1"
    >
      <button
        type="button"
        aria-pressed={props.hand}
        aria-label="Mover lienzo"
        title="Mover lienzo · Espacio + arrastrar"
        disabled={props.busy}
        onClick={props.onHand}
        className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 disabled:cursor-not-allowed disabled:opacity-50 ${props.hand ? 'bg-green-50 text-green-800 ring-1 ring-inset ring-green-200' : 'text-gray-600 hover:bg-gray-100'}`}
      >
        <PiHandPalm aria-hidden="true" size={20} />
        <span>Mover</span>
      </button>
      <span aria-hidden="true" className="mx-1 h-6 w-px bg-gray-200" />
      {props.mode === 'browse' ? (
        <Button
          type="button"
          size="sm"
          color="neutral"
          variant="ghost"
          className={secondary}
          onClick={props.onPending}
        >
          Pendientes{' '}
          <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-xs tabular-nums text-gray-600">
            {props.pendingCount}
          </span>
        </Button>
      ) : null}
      {props.mode === 'draw' ? (
        <>
          <span className="px-2 text-sm tabular-nums text-gray-500">{props.pointCount} puntos</span>
          <Button
            type="button"
            size="sm"
            color="neutral"
            variant="ghost"
            className={secondary}
            disabled={props.pointCount === 0}
            onClick={props.onUndoPoint}
          >
            <PiArrowCounterClockwise aria-hidden="true" size={18} />
            <span>Deshacer</span>
          </Button>
          <Button
            type="button"
            size="sm"
            color="neutral"
            variant="ghost"
            className={secondary}
            onClick={props.onCancel}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            color="success"
            className={secondary}
            disabled={props.pointCount < 3}
            onClick={props.onFinish}
          >
            <PiCheck aria-hidden="true" size={18} />
            Terminar
          </Button>
        </>
      ) : null}
      {props.mode === 'edit' ? (
        <>
          <Button
            type="button"
            size="sm"
            color="neutral"
            variant="ghost"
            className={secondary}
            disabled={props.busy}
            onClick={props.onEdit}
          >
            <PiPencilSimple aria-hidden="true" size={18} />
            Datos
          </Button>
          <Button
            type="button"
            size="sm"
            color="success"
            className={secondary}
            disabled={props.busy}
            onClick={props.onDone}
          >
            <PiCheck aria-hidden="true" size={18} />
            {props.busy ? 'Guardando…' : 'Listo'}
          </Button>
          <div ref={menu} className="relative">
            <button
              type="button"
              aria-label="Más opciones del área"
              aria-expanded={menuOpen}
              title="Más opciones del área"
              disabled={props.busy}
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PiDotsThree aria-hidden="true" size={24} />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-full z-30 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
                {props.dirty ? (
                  <Button
                    type="button"
                    size="sm"
                    color="neutral"
                    variant="ghost"
                    className="min-h-11 w-full justify-start rounded-lg text-left"
                    onClick={() => {
                      setMenuOpen(false)
                      props.onCancel()
                    }}
                  >
                    <PiArrowCounterClockwise aria-hidden="true" size={18} />
                    Descartar cambios
                  </Button>
                ) : null}
                {props.dirty ? <hr className="my-1 border-gray-100" /> : null}
                <Button
                  type="button"
                  size="sm"
                  color="error"
                  variant="ghost"
                  disabled={props.hasAnimals}
                  className="min-h-11 w-full justify-start rounded-lg text-left"
                  onClick={() => {
                    setMenuOpen(false)
                    props.onDelete()
                  }}
                >
                  <PiTrash aria-hidden="true" size={18} />
                  Eliminar área
                </Button>
                {props.hasAnimals ? (
                  <p className="px-3 py-2 text-xs leading-5 text-gray-600">
                    Saca primero los animales de esta área para eliminarla.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  )
}
