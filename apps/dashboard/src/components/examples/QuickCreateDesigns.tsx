'use client'

import { useState } from 'react'
import { EmojiIcon } from '@/components/Icon/emoji-icons'
import { Icon } from '@/components/Icon/icon'

/** Comparación visual de las propuestas del acceso flotante. */
export default function QuickCreateDesigns() {
  const [preview, setPreview] = useState('')
  const button =
    'flex h-14 w-14 cursor-pointer items-center justify-center bg-green-700 text-white transition-colors hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-4'
  const sparkle = (
    <span aria-hidden="true">
      <EmojiIcon emoji="✨" className="h-6 w-6" />
    </span>
  )
  const plus = (
    <span aria-hidden="true">
      <Icon icon="add" className="h-7 w-7" />
    </span>
  )
  const create = (name: string) => setPreview(`${name}: abre las opciones de creación.`)
  const assistant = (name: string) => setPreview(`${name}: acceso directo al asistente IA.`)
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Tres propuestas para comparar. Pulsa los botones para ver qué acceso representa cada uno.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900">1 · Integrado</h3>
          <div className="flex h-44 items-center justify-center rounded-lg bg-gray-50 my-4">
            <button
              type="button"
              aria-label="Probar diseño integrado"
              onClick={() => create('Integrado')}
              className={`${button} relative rounded-full shadow-lg`}
            >
              {plus}
              <span aria-hidden="true" className="absolute right-1.5 top-1.5">
                <EmojiIcon emoji="✨" className="h-3.5 w-3.5" />
              </span>
            </button>
          </div>
          <p className="text-sm text-gray-600">Un círculo. La IA aparece en el menú del (+).</p>
        </article>
        <article className="rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900">2 · Dos botones</h3>
          <div className="flex h-44 flex-col items-center justify-center gap-3 rounded-lg bg-gray-50 my-4">
            <button
              type="button"
              aria-label="Probar IA en dos botones"
              onClick={() => assistant('Dos botones')}
              className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border border-green-200 bg-white text-green-700 shadow-md hover:bg-green-50 focus-visible:ring-2 focus-visible:ring-green-700"
            >
              {sparkle}
            </button>
            <button
              type="button"
              aria-label="Probar crear en dos botones"
              onClick={() => create('Dos botones')}
              className={`${button} rounded-full shadow-lg`}
            >
              {plus}
            </button>
          </div>
          <p className="text-sm text-gray-600">Accesos separados a IA y creación.</p>
        </article>
        <article className="rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900">3 · Cápsula</h3>
          <div className="flex h-44 items-center justify-center rounded-lg bg-gray-50 my-4">
            <div className="flex rounded-full shadow-lg">
              <button
                type="button"
                aria-label="Probar IA en cápsula"
                onClick={() => assistant('Cápsula')}
                className={`${button} rounded-l-full`}
              >
                {sparkle}
              </button>
              <button
                type="button"
                aria-label="Probar crear en cápsula"
                onClick={() => create('Cápsula')}
                className={`${button} rounded-r-full border-l border-white/20`}
              >
                {plus}
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-600">Una pieza con dos accesos, sin superposición.</p>
        </article>
      </div>
      <p role="status" className="min-h-5 text-sm text-green-800">
        {preview}
      </p>
    </div>
  )
}
