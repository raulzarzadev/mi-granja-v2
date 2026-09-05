'use client'

import { useMemo, useState } from 'react'
import AnimalTag from '@/components/AnimalTag'
import { Modal } from '@/components/Modal'
import { animalAge } from '@/lib/animal-utils'
import { type Animal, animal_gender_config } from '@/types/animals'

function sortByAnimalNumber(list: Animal[]): Animal[] {
  return [...list].sort((a, b) =>
    (a.animalNumber || '').localeCompare(b.animalNumber || '', 'es', { numeric: true }),
  )
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ??
      character,
  )
}

const GENDER_ICON_PATHS = {
  hembra: {
    viewBox: '0 0 256 512',
    path: 'M128 0c35.346 0 64 28.654 64 64s-28.654 64-64 64c-35.346 0-64-28.654-64-64S92.654 0 128 0m119.283 354.179l-48-192A24 24 0 0 0 176 144h-11.36c-22.711 10.443-49.59 10.894-73.28 0H80a24 24 0 0 0-23.283 18.179l-48 192C4.935 369.305 16.383 384 32 384h56v104c0 13.255 10.745 24 24 24h32c13.255 0 24-10.745 24-24V384h56c15.591 0 27.071-14.671 23.283-29.821z',
  },
  macho: {
    viewBox: '0 0 192 512',
    path: 'M96 0c35.346 0 64 28.654 64 64s-28.654 64-64 64-64-28.654-64-64S60.654 0 96 0m48 144h-11.36c-22.711 10.443-49.59 10.894-73.28 0H48c-26.51 0-48 21.49-48 48v136c0 13.255 10.745 24 24 24h16v136c0 13.255 10.745 24 24 24h64c13.255 0 24-10.745 24-24V352h16c13.255 0 24-10.745 24-24V192c0-26.51-21.49-48-48-48z',
  },
} as const

function genderIconSvg(gender: Animal['gender']): string {
  const icon = GENDER_ICON_PATHS[gender]
  return `<svg viewBox="${icon.viewBox}" aria-hidden="true" focusable="false"><path d="${icon.path}" /></svg>`
}

interface AnimalPrintListModalProps {
  title: string
  animals: Animal[]
  onClose: () => void
}

export default function AnimalPrintListModal({
  title,
  animals,
  onClose,
}: AnimalPrintListModalProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const sorted = useMemo(() => sortByAnimalNumber(animals), [animals])

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handlePrint = () => {
    const rows = sorted
      .map((animal) => {
        const isChecked = checked.has(animal.id)
        const box = isChecked ? '☑' : '☐'
        const number = animal.animalNumber || animal.id.slice(0, 6)
        const gender = animal_gender_config[animal.gender]
        const genderClass = animal.gender === 'hembra' ? 'female' : 'male'
        const age = animalAge(animal, { format: 'short' })
        const ageLabel = age === 'No registrado' ? '—' : age
        return `<li><span class="box">${box}</span><span class="gender ${genderClass}" aria-label="${gender.label}">${genderIconSvg(animal.gender)}</span><span class="num">${escapeHtml(number)}</span><span class="age">${escapeHtml(ageLabel)}</span></li>`
      })
      .join('')

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Lista: ${title}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; color: #111; }
  h1 { font-size: 18px; margin: 0 0 16px; }
  .meta { font-size: 12px; color: #555; margin-bottom: 16px; }
  ul { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px 16px; }
  li { display: flex; align-items: center; gap: 6px; font-size: 13px; padding: 6px 0; break-inside: avoid; }
  .box { font-size: 16px; width: 18px; display: inline-block; }
  .num { font-weight: 500; }
  .gender { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 9999px; font-size: 14px; font-weight: 700; }
  .gender.female { background: #fce7f3; color: #db2777; }
  .gender.male { background: #dbeafe; color: #2563eb; }
  .gender svg { width: 12px; height: 16px; fill: currentColor; }
  .age { color: #6b7280; }
  @media print { body { padding: 12px; } }
</style>
</head>
<body>
  <h1>Lista de: ${title}</h1>
  <div class="meta">Total: ${sorted.length} · Marcados: ${checked.size}</div>
  <ul>${rows}</ul>
  <script>
    window.addEventListener('load', () => { setTimeout(() => { window.print(); }, 150); });
  </script>
</body>
</html>`

    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) return
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  }

  return (
    <Modal isOpen onClose={onClose} title={`Lista de: ${title}`} size="xl">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-600">
          Total: {sorted.length} · Marcados: {checked.size}
        </div>
        <button
          type="button"
          onClick={handlePrint}
          disabled={sorted.length === 0}
          className="min-h-11 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          🖨️ Imprimir
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center text-gray-500 py-8 text-sm">Sin animales en esta categoría</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {sorted.map((animal) => {
            const isChecked = checked.has(animal.id)
            return (
              <label
                key={animal.id}
                className="inline-flex items-center gap-2 min-h-11 rounded px-1 py-1 cursor-pointer hover:bg-gray-50 focus-within:ring-2 focus-within:ring-blue-600"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(animal.id)}
                  className="cursor-pointer"
                />
                <span className={isChecked ? 'opacity-60' : ''}>
                  <AnimalTag
                    animal={animal}
                    showAge
                    showSpecies={false}
                    showStage={false}
                    size="md"
                  />
                </span>
              </label>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
