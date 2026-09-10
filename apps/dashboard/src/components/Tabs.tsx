'use client'

import React, {
  KeyboardEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

type Tab = {
  label: string
  content: ReactNode
  badgeCount?: number
  description?: string
}

type TabsProps = {
  tabs: Tab[]
  initialActiveTab?: number
  /** Identificador unico usado como parametro en la URL (ej. ?dashboard-main=animales) */
  tabsId?: string
  /** Si debe persistir el estado (por defecto true) */
  persistState?: boolean
  /** Elemento opcional renderizado al final de la fila de tabs (ej. boton de ayuda) */
  trailingAction?: ReactNode
  /** Oculta la barra visual manteniendo el desplazamiento horizontal */
  hideScrollbar?: boolean
  /** Muestra todas las secciones y sincroniza el tab activo con el scroll vertical */
  scrollSpy?: boolean
  /** Distancia adicional desde los tabs para activar la siguiente sección */
  scrollSpyOffset?: number
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

/** Lee un parametro de la URL actual */
const getParam = (key: string): string | null => {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get(key)
}

/** Actualiza un parametro en la URL sin recargar la pagina */
const setParam = (key: string, value: string) => {
  const params = new URLSearchParams(window.location.search)
  params.set(key, value)
  const url = `${window.location.pathname}?${params.toString()}`
  window.history.pushState({}, '', url)
}

const getScrollableParent = (element: HTMLElement): HTMLElement | Window => {
  let parent = element.parentElement
  while (parent) {
    const overflowY = window.getComputedStyle(parent).overflowY
    if (/(auto|scroll|overlay)/.test(overflowY)) return parent
    parent = parent.parentElement
  }
  return window
}

const Tabs: React.FC<TabsProps> = ({
  tabs,
  initialActiveTab = 0,
  tabsId,
  persistState = true,
  trailingAction,
  hideScrollbar = false,
  scrollSpy = false,
  scrollSpyOffset = 160,
}) => {
  const paramKey = tabsId || 'tab'

  const slugs = useMemo(
    () => tabs.map((tab, i) => slugify(tab.label) || String(i)),
    [tabs.map((t) => t.label).join(',')],
  )

  const resolveTab = useCallback((): number => {
    if (typeof window === 'undefined') return initialActiveTab
    const paramValue = getParam(paramKey)
    if (paramValue) {
      // Exact match first
      const idx = slugs.indexOf(paramValue)
      if (idx >= 0) return idx
      // Prefix match — allows stable links when slugs include dynamic counts (e.g. "empadre-5")
      const prefixIdx = slugs.findIndex((s) => s === paramValue || s.startsWith(`${paramValue}-`))
      if (prefixIdx >= 0) return prefixIdx
    }
    return initialActiveTab
  }, [paramKey, slugs, initialActiveTab])

  const [activeTab, setActiveTab] = useState(resolveTab)
  const tabListRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<Array<HTMLElement | null>>([])
  const initialSectionScrollRef = useRef(false)
  const [scrollbar, setScrollbar] = useState({
    visible: false,
    thumbWidth: 0,
    thumbOffset: 0,
  })

  const updateScrollbar = useCallback(() => {
    const tabList = tabListRef.current
    if (!tabList || hideScrollbar) return

    const viewportWidth = tabList.clientWidth
    const maxScrollLeft = tabList.scrollWidth - viewportWidth

    if (maxScrollLeft <= 0 || viewportWidth === 0) {
      setScrollbar((current) =>
        current.visible ? { visible: false, thumbWidth: 0, thumbOffset: 0 } : current,
      )
      return
    }

    const thumbWidth = Math.max((viewportWidth / tabList.scrollWidth) * viewportWidth, 24)
    const maxThumbOffset = viewportWidth - thumbWidth
    const thumbOffset = (tabList.scrollLeft / maxScrollLeft) * maxThumbOffset

    setScrollbar({
      visible: true,
      thumbWidth,
      thumbOffset,
    })
  }, [hideScrollbar])

  useEffect(() => {
    const tabList = tabListRef.current
    if (!tabList || hideScrollbar) return

    updateScrollbar()
    tabList.addEventListener('scroll', updateScrollbar, { passive: true })
    window.addEventListener('resize', updateScrollbar)

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScrollbar) : null
    resizeObserver?.observe(tabList)
    Array.from(tabList.children).forEach((child) => {
      resizeObserver?.observe(child)
    })

    return () => {
      tabList.removeEventListener('scroll', updateScrollbar)
      window.removeEventListener('resize', updateScrollbar)
      resizeObserver?.disconnect()
    }
  }, [hideScrollbar, slugs, trailingAction, updateScrollbar])

  // Sync con URL al montar y al navegar back/forward
  useEffect(() => {
    setActiveTab(resolveTab())

    const onPopState = () => setActiveTab(resolveTab())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [resolveTab])

  const scrollToSection = useCallback((index: number) => {
    const section = sectionRefs.current[index]
    if (!section) return

    const scrollParent = getScrollableParent(section)
    const tabShell = tabListRef.current?.parentElement
    const stickyOffset = (tabShell?.getBoundingClientRect().height ?? 0) + 8
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const behavior = prefersReducedMotion ? 'auto' : 'smooth'

    if (scrollParent instanceof HTMLElement) {
      const parentRect = scrollParent.getBoundingClientRect()
      const top =
        scrollParent.scrollTop + section.getBoundingClientRect().top - parentRect.top - stickyOffset
      const previousScrollTop = scrollParent.scrollTop
      try {
        scrollParent.scrollTo({ top, behavior })
      } catch {
        scrollParent.scrollTop = top
      }
      requestAnimationFrame(() => {
        if (scrollParent.scrollTop === previousScrollTop) scrollParent.scrollTop = top
      })
      return
    }

    const top = window.scrollY + section.getBoundingClientRect().top - stickyOffset
    const previousScrollY = window.scrollY
    try {
      window.scrollTo({ top, behavior })
    } catch {
      window.scrollTo(0, top)
    }
    requestAnimationFrame(() => {
      if (window.scrollY === previousScrollY) window.scrollTo(0, top)
    })
  }, [])

  const changeActiveTab = useCallback(
    (newIndex: number, shouldScroll = false) => {
      setActiveTab(newIndex)
      if (persistState) {
        setParam(paramKey, slugs[newIndex])
      }
      if (shouldScroll) {
        scrollToSection(newIndex)
      }
    },
    [paramKey, persistState, scrollToSection, slugs],
  )

  const updateActiveFromScroll = useCallback(() => {
    if (!scrollSpy) return

    const tabListBottom = tabListRef.current?.getBoundingClientRect().bottom ?? 0
    let nextActiveTab = 0

    sectionRefs.current.forEach((section, index) => {
      if (section && section.getBoundingClientRect().top <= tabListBottom + scrollSpyOffset) {
        nextActiveTab = index
      }
    })

    setActiveTab((current) => (current === nextActiveTab ? current : nextActiveTab))
  }, [scrollSpy, scrollSpyOffset])

  useEffect(() => {
    if (!scrollSpy) return

    const firstSection = sectionRefs.current.find(Boolean)
    if (!firstSection) return

    const scrollParent = getScrollableParent(firstSection)

    let frame = 0
    const handleScroll = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        frame = 0
        updateActiveFromScroll()
      })
    }

    scrollParent.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)
    handleScroll()

    return () => {
      if (frame) cancelAnimationFrame(frame)
      scrollParent.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [scrollSpy, slugs, updateActiveFromScroll])

  useEffect(() => {
    if (!scrollSpy || activeTab === 0) return

    const tab = tabListRef.current?.querySelector<HTMLElement>(`#tab-${slugs[activeTab]}`)
    tab?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }, [activeTab, scrollSpy, slugs])

  useEffect(() => {
    if (!scrollSpy || initialSectionScrollRef.current) return

    initialSectionScrollRef.current = true
    if (activeTab === 0) return

    const frame = requestAnimationFrame(() => {
      scrollToSection(activeTab)
    })

    return () => cancelAnimationFrame(frame)
  }, [activeTab, scrollSpy, scrollToSection])

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
    <div className="w-full min-w-0 max-w-full overflow-x-clip">
      <style>{`
        .tabs-scrollbar-native-hidden {
          scrollbar-width: none !important;
        }

        .tabs-scrollbar-native-hidden::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `}</style>
      <div
        className={`tabs-scrollbar-shell max-w-full overflow-x-hidden ${
          scrollSpy
            ? 'sticky top-0 z-20 -mx-3 bg-white/95 px-3 pb-2 pt-2 backdrop-blur sm:-mx-4 sm:px-4'
            : ''
        }`}
      >
        <div
          ref={tabListRef}
          role="tablist"
          aria-label="Secciones"
          className={`flex gap-2 overflow-x-auto pb-1 pt-1 ${
            hideScrollbar
              ? '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
              : 'tabs-scrollbar'
          } tabs-scrollbar-native-hidden`}
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
                onClick={() => changeActiveTab(index, scrollSpy)}
                className={`group relative flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium outline-none transition-all cursor-pointer ${
                  isActive
                    ? 'bg-green-600 text-white border-green-600 shadow-sm'
                    : 'bg-white/70 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300 hover:shadow-sm'
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
          {trailingAction && <div className="flex items-center ml-1">{trailingAction}</div>}
        </div>
        {!hideScrollbar && scrollbar.visible && (
          <div
            className="tabs-scrollbar-track"
            aria-hidden="true"
            style={{
              width: '100%',
              height: '8px',
              marginTop: '2px',
              backgroundColor: 'rgb(226 232 240)',
              borderRadius: '9999px',
              overflow: 'hidden',
            }}
          >
            <div
              className="tabs-scrollbar-thumb"
              style={{
                height: '100%',
                width: `${scrollbar.thumbWidth}px`,
                backgroundColor: 'rgb(100 116 139)',
                borderRadius: '9999px',
                transform: `translateX(${scrollbar.thumbOffset}px)`,
              }}
            />
          </div>
        )}
      </div>
      {tabs[activeTab]?.description && (
        <p className="mt-1 px-2 text-xs leading-4 text-gray-500">{tabs[activeTab].description}</p>
      )}
      {scrollSpy ? (
        <div className="space-y-8">
          {tabs.map((tab, index) => (
            <section
              key={slugs[index]}
              ref={(element) => {
                sectionRefs.current[index] = element
              }}
              id={`tab-panel-${slugs[index]}`}
              role="tabpanel"
              aria-labelledby={`tab-${slugs[index]}`}
              className="scroll-mt-20"
            >
              {tab.content}
            </section>
          ))}
        </div>
      ) : (
        <div
          id={`tab-panel-${slugs[activeTab]}`}
          role="tabpanel"
          aria-labelledby={`tab-${slugs[activeTab]}`}
        >
          {tabs[activeTab]?.content}
        </div>
      )}
    </div>
  )
}

export default Tabs
