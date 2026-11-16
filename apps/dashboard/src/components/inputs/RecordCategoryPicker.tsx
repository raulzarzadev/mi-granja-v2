'use client'

import { useState } from 'react'
import { EmojiIcon } from '@/components/Icon/emoji-icons'
import { type RecordCategory, record_category_icons, record_category_labels } from '@/types/animals'

interface RecordCategoryPickerProps {
  options: ReadonlyArray<RecordCategory>
  value: RecordCategory[]
  onChange: (next: RecordCategory[]) => void
  label?: string
  /**
   * El valor inicial es una preselección automática: el primer toque la reemplaza
   * en lugar de sumarse.
   */
  replaceDefaultOnFirstPick?: boolean
  disabled?: boolean
}

/** Selección múltiple de categorías de registro. Siempre queda al menos una. */
export default function RecordCategoryPicker({
  options,
  value,
  onChange,
  label = 'Categorías',
  replaceDefaultOnFirstPick = false,
  disabled = false,
}: RecordCategoryPickerProps) {
  const [touched, setTouched] = useState(!replaceDefaultOnFirstPick)
  const toggle = (category: RecordCategory) => {
    if (!touched) {
      setTouched(true)
      onChange([category])
      return
    }
    if (value.includes(category)) {
      if (value.length > 1) onChange(value.filter((item) => item !== category))
      return
    }
    onChange([...value, category])
  }

  return (
    <fieldset disabled={disabled}>
      <legend className="mb-2 block text-sm font-medium">
        {label} <span className="font-normal text-gray-500">(puedes elegir varias)</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((category) => {
          const selected = value.includes(category)
          return (
            <button
              key={category}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(category)}
              className={`inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 disabled:cursor-not-allowed disabled:opacity-60 ${
                selected
                  ? 'border-green-500 bg-green-50 text-green-800'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <EmojiIcon emoji={record_category_icons[category]} />
              {record_category_labels[category]}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
