'use client'

import { useMemo, useState } from 'react'
import type { IconType } from 'react-icons'
import { EMOJI_ICON_GROUPS } from '@/components/Icon/emoji-icons'
import * as farmIcons from '@/components/Icon/farm-icons'
import { icons } from '@/components/Icon/icon'

const iconName = (icon: IconType) =>
  (icon as IconType & { displayName?: string }).displayName || icon.name || '—'

/** De dónde se importa cada icono, según su nombre */
const importPath = (name: string) =>
  name.startsWith('Pi')
    ? 'react-icons/pi'
    : name.startsWith('Dot')
      ? '@/components/Icon/emoji-icons'
      : '@/components/Icon/farm-icons'

type Entry = { key: string; icon: IconType; name: string; caption: string; hint?: string }

const IconCard = ({ entry }: { entry: Entry }) => {
  const Icon = entry.icon
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
      <Icon className="h-7 w-7 shrink-0 text-gray-800" />
      <div className="min-w-0 text-xs leading-5">
        <p className="truncate font-semibold text-gray-900">{entry.caption}</p>
        <p className="truncate font-mono text-gray-600">{entry.name}</p>
        {entry.hint && <p className="truncate font-mono text-[11px] text-gray-400">{entry.hint}</p>}
      </div>
    </div>
  )
}

const Grid = ({ title, entries }: { title: string; entries: Entry[] }) =>
  entries.length === 0 ? null : (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">
        {title} <span className="font-normal text-gray-400">({entries.length})</span>
      </h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {entries.map((entry) => (
          <IconCard key={entry.key} entry={entry} />
        ))}
      </div>
    </div>
  )

/**
 * Catálogo de iconos: propios, nombres de <Icon /> y equivalencias emoji → icono.
 */
export default function IconShowcase() {
  const [query, setQuery] = useState('')

  const sections = useMemo(() => {
    const custom: Entry[] = Object.entries(farmIcons).map(([name, icon]) => ({
      key: name,
      icon: icon as IconType,
      name,
      caption: name,
      hint: '@/components/Icon/farm-icons',
    }))
    const iconNames: Entry[] = Object.entries(icons).map(([key, icon]) => {
      const name = iconName(icon as IconType)
      return {
        key,
        icon: icon as IconType,
        name,
        caption: `<Icon icon="${key}" />`,
        hint: importPath(name),
      }
    })
    const emojiGroups = EMOJI_ICON_GROUPS.map((group) => ({
      title: `Emoji → icono · ${group.title}`,
      entries: group.items.map(([emoji, icon]) => {
        const name = iconName(icon)
        return {
          key: emoji,
          icon,
          name,
          caption: `${emoji}  <EmojiIcon emoji="${emoji}" />`,
          hint: importPath(name),
        }
      }),
    }))
    return [
      { title: 'Iconos propios (estilo Phosphor)', entries: custom },
      { title: 'Nombres de <Icon />', entries: iconNames },
      ...emojiGroups,
    ]
  }, [])

  const q = query.trim().toLowerCase()
  const filtered = sections.map((section) => ({
    ...section,
    entries: q
      ? section.entries.filter((e) =>
          [e.key, e.name, e.caption, e.hint].some((v) => v?.toLowerCase().includes(q)),
        )
      : section.entries,
  }))

  return (
    <div className="space-y-6">
      <label htmlFor="icon-search" className="block max-w-sm">
        <span className="mb-1 block text-sm text-gray-600">Buscar por nombre o emoji</span>
        <input
          id="icon-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="cow, 🐑, calendar…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </label>
      {filtered.map((section) => (
        <Grid key={section.title} title={section.title} entries={section.entries} />
      ))}
    </div>
  )
}
