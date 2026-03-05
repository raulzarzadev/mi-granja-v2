'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import React, { KeyboardEvent, ReactNode, useCallback, useMemo } from 'react'

type Tab = {
  label: string
  content: ReactNode
  badgeCount?: number
}

type TabsProps = {
  tabs: Tab[]
  initialActiveTab?: number
  /** Identificador unico usado como parametro en la URL (ej. ?tab=animales) */
  tabsId?: string
  /** Si debe persistir el estado (por defecto true) */
  persistState?: boolean
}

/** Genera un slug a partir del label del tab, quitando emojis */
const slugify = (label: string): string =>
  label
    .replace(/\p{Emoji_Presentation}/gu, '')
    .replace(/\p{Emoji}\uFE0F?/gu, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const Tabs: React.FC<TabsProps> = ({ tabs, initialActiveTab = 0, tabsId, persistState = true }) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const paramKey = tabsId || 'tab'

  // Pre-compute slugs
  const slugs = useMemo(
    () => tabs.map((tab, i) => slugify(tab.label) || String(i)),
    [tabs.map((t) => t.label).join(',')],
  )

  // Resolve active tab from URL, then fallback to initialActiveTab
  const activeTab = useMemo(() => {
    if (typeof window === 'undefined') return initialActiveTab

    const paramValue = searchParams.get(paramKey)
    if (paramValue) {
      const idx = slugs.indexOf(paramValue)
      if (idx >= 0) return idx
    }

    return initialActiveTab
  }, [searchParams, paramKey, slugs, initialActiveTab])

  const changeActiveTab = useCallback(
    (newIndex: number) => {
      if (!persistState) return

      const params = new URLSearchParams(searchParams.toString())
      params.set(paramKey, slugs[newIndex])
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [searchParams, paramKey, slugs, pathname, router, persistState],
  )

  const handleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) {
      e.preventDefault()
      let next = activeTab
      if (e.key === 'ArrowRight') next = (activeTab + 1) % tabs.length
      if (e.key === 'ArrowLeft') next = (activeTab - 1 + tabs.length) % tabs.length
      if (e.key === 'Home') next = 0
      if (e.key === 'End') next = tabs.length - 1
      changeActiveTab(next)
    }
  }

  return (
    <div>
      {/* Navegacion de tabs */}
      <div
        role="tablist"
        aria-label="Secciones"
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin"
        onKeyDown={handleKey}
      >
        {tabs.map((tab, index) => {
          const isActive = index === activeTab
          return (
            <button
              key={slugs[index]}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tab-panel-${slugs[index]}`}
              id={`tab-${slugs[index]}`}
              onClick={() => changeActiveTab(index)}
              className={`group relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium outline-none transition-all border ${
                isActive
                  ? 'bg-green-600 text-white border-green-600 shadow-sm'
                  : 'bg-white/70 text-gray-600 border-gray-200 hover:bg-gray-50'
              } focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1`}
            >
              <span className="whitespace-nowrap select-none leading-none">{tab.label}</span>
              {typeof tab.badgeCount === 'number' && tab.badgeCount > 0 && (
                <span
                  className={`inline-flex items-center justify-center rounded-full px-2 h-5 min-w-5 text-[10px] font-semibold tracking-wide leading-none transition-colors ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 text-gray-700 group-hover:bg-gray-300'
                  }`}
                >
                  {tab.badgeCount}
                </span>
              )}
              {isActive && (
                <span className="absolute inset-0 rounded-full ring-2 ring-green-500/40 pointer-events-none" />
              )}
            </button>
          )
        })}
      </div>
      {/* Contenido */}
      <div
        id={`tab-panel-${slugs[activeTab]}`}
        role="tabpanel"
        aria-labelledby={`tab-${slugs[activeTab]}`}
      >
        {tabs[activeTab]?.content}
      </div>
    </div>
  )
}

export default Tabs
