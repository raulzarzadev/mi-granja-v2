'use client'

import React, {
  createContext,
  KeyboardEvent,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { IconLabel } from './Icon/emoji-icons'

type Tab = {
  label: string
  content: ReactNode
  badgeCount?: number
  hideOnMobile?: boolean
  description?: string
}

/** Sub-tabs que un Tabs anidado expone al menú lateral del Tabs padre */
type SubTabsInfo = {
  slugs: string[]
  labels: string[]
  badges: Array<number | undefined>
  /** Tabs anidado: el activo se lee de este parámetro de la URL */
  paramKey?: string
  initialActiveTab?: number
  /** Sub-items controlados (ej. filtros): el registrante maneja el activo y la selección */
  activeIndex?: number
  onSelect?: (index: number) => void
}

/**
 * Solo lo provee un Tabs con sidebarOnDesktop, para su nivel inmediato de hijos.
 * Registra sub-tabs y devuelve la función para desregistrarlos.
 */
const SubTabsContext = createContext<((info: SubTabsInfo) => () => void) | null>(null)

/** Evento para sincronizar Tabs cuando otro cambia la URL (pushState no dispara popstate) */
const TABS_URL_CHANGE = 'tabs:url-change'

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
  /** Desde md (768px+) muestra los tabs como menú lateral a la izquierda */
  sidebarOnDesktop?: boolean
  /** Fija las pestañas principales al borde inferior en móvil. */
  bottomOnMobile?: boolean
  sidebarHeader?: ReactNode
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
  window.dispatchEvent(new Event(TABS_URL_CHANGE))
}

/** Resuelve el índice activo según el parámetro de la URL (exacto o por prefijo) */
const resolveIndexFromUrl = (paramKey: string, slugs: string[], fallback: number): number => {
  const paramValue = getParam(paramKey)
  if (!paramValue) return fallback
  const idx = slugs.indexOf(paramValue)
  if (idx >= 0) return idx
  // Prefix match — allows stable links when slugs include dynamic counts (e.g. "empadre-5")
  const prefixIdx = slugs.findIndex((s) => s.startsWith(`${paramValue}-`))
  return prefixIdx >= 0 ? prefixIdx : fallback
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
  sidebarOnDesktop = false,
  bottomOnMobile = false,
  sidebarHeader,
}) => {
  // Clases que solo aplican cuando el tab se muestra como menú lateral en escritorio
  const sb = (classes: string) => (sidebarOnDesktop ? classes : '')
  const paramKey = tabsId || 'tab'

  const slugs = useMemo(
    () => tabs.map((tab, i) => slugify(tab.label) || String(i)),
    [tabs.map((t) => t.label).join(',')],
  )

  const resolveTab = useCallback((): number => {
    if (typeof window === 'undefined') return initialActiveTab
    return resolveIndexFromUrl(paramKey, slugs, initialActiveTab)
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
    window.addEventListener(TABS_URL_CHANGE, onPopState)
    return () => {
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener(TABS_URL_CHANGE, onPopState)
    }
  }, [resolveTab])

  // Registrar mis tabs en el menú lateral del Tabs padre (si lo hay)
  const registerInParent = useContext(SubTabsContext)
  const labelsKey = tabs.map((t) => t.label).join(',')
  const badgesKey = tabs.map((t) => t.badgeCount ?? '').join(',')
  useEffect(() => {
    if (!registerInParent) return
    return registerInParent({
      paramKey,
      slugs,
      labels: tabs.map((t) => t.label),
      badges: tabs.map((t) => t.badgeCount),
      initialActiveTab,
    })
  }, [registerInParent, paramKey, slugs, labelsKey, badgesKey, initialActiveTab])

  // Sub-tabs del tab activo, mostrados anidados en el menú lateral
  // Puede haber más de un Tabs hijo (ej. un modal con tabs); se muestra el primero registrado
  const [subTabsList, setSubTabsList] = useState<Array<{ id: symbol; info: SubTabsInfo }>>([])
  const subTabs = subTabsList[0]?.info ?? null
  const registerSubTabs = useCallback((info: SubTabsInfo) => {
    const id = Symbol('sub-tabs')
    setSubTabsList((list) => [...list, { id, info }])
    return () => setSubTabsList((list) => list.filter((entry) => entry.id !== id))
  }, [])
  const [activeSubTab, setActiveSubTab] = useState(0)
  useEffect(() => {
    const paramKey = subTabs?.paramKey
    if (!subTabs || !paramKey) return
    const sync = () =>
      setActiveSubTab(resolveIndexFromUrl(paramKey, subTabs.slugs, subTabs.initialActiveTab ?? 0))
    sync()
    window.addEventListener('popstate', sync)
    window.addEventListener(TABS_URL_CHANGE, sync)
    return () => {
      window.removeEventListener('popstate', sync)
      window.removeEventListener(TABS_URL_CHANGE, sync)
    }
  }, [subTabs])

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
    if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
      if (!sidebarOnDesktop && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) return
      e.preventDefault()
      let next = activeTab
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (activeTab + 1) % tabs.length
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
        next = (activeTab - 1 + tabs.length) % tabs.length
      if (e.key === 'Home') next = 0
      if (e.key === 'End') next = tabs.length - 1
      changeActiveTab(next)
    }
  }

  return (
    <div
      data-bottom-navigation={bottomOnMobile || undefined}
      style={
        bottomOnMobile
          ? ({
              '--mobile-tab-count': tabs.filter((tab) => !tab.hideOnMobile).length,
            } as React.CSSProperties)
          : undefined
      }
      className={`w-full min-w-0 max-w-full overflow-x-clip ${sb('md:flex md:items-start md:gap-4 lg:gap-6 md:overflow-x-visible')}`}
    >
      <style>{`
        @media (max-width: 767px) {
          [data-bottom-navigation] {
            padding-bottom: calc(5rem + env(safe-area-inset-bottom, 0px));
          }
          [data-bottom-navigation] > .tabs-scrollbar-shell {
            position: fixed;
            inset: var(--fixed-bottom-edge, 100dvh) auto auto var(--fixed-left-inset, 0px);
            transform: translateY(-100%);
            width: var(--fixed-visible-width, 100%);
            max-width: 100vw;
            box-sizing: border-box;
            z-index: 30;
            border-top: 1px solid rgb(229 231 235);
            background: white;
            padding: 0.375rem max(0.25rem, env(safe-area-inset-right)) env(safe-area-inset-bottom, 0px) max(0.25rem, env(safe-area-inset-left));
            box-shadow: 0 -4px 16px rgb(0 0 0 / 0.05);
          }
          [data-bottom-navigation] > .tabs-scrollbar-shell > [role="tablist"] {
            display: grid;
            grid-template-columns: repeat(var(--mobile-tab-count, 5), minmax(0, 1fr));
            width: 100%;
            min-width: 0;
            gap: 0.125rem;
            overflow: visible;
            padding: 0;
          }
          [data-bottom-navigation] > .tabs-scrollbar-shell > [role="tablist"] > [data-hide-on-mobile] {
            display: none;
          }
          [data-bottom-navigation] > .tabs-scrollbar-shell > [role="tablist"] > [role="tab"] {
            width: 100%;
            max-width: 100%;
            min-width: 0;
            min-height: 3.75rem;
            justify-content: center;
            padding: 0.375rem 0.125rem;
            border: 0;
            border-radius: 0.75rem;
            box-shadow: none;
            font-size: 10px;
            background: white;
            color: rgb(75 85 99);
            transition-property: background-color, color;
          }
          [data-bottom-navigation] > .tabs-scrollbar-shell > [role="tablist"] > [aria-selected="true"] {
            background: rgb(240 253 244);
            color: rgb(21 128 61);
            font-weight: 700;
          }
          [data-bottom-navigation] .bottom-tab-label {
            flex-direction: column;
            gap: 0.375rem;
          }
          [data-bottom-navigation] .bottom-tab-label > svg {
            width: 1.5rem;
            height: 1.5rem;
          }
          [data-bottom-navigation] .bottom-tab-badge {
            position: absolute;
            top: 0;
            right: 0.125rem;
            background: rgb(185 28 28);
            color: white;
            padding: 0 0.25rem;
          }
          [data-bottom-navigation] .bottom-tab-ring,
          [data-bottom-navigation] > .tabs-scrollbar-shell > .tabs-scrollbar-track {
            display: none;
          }
        }
        .tabs-scrollbar-native-hidden {
          scrollbar-width: none !important;
        }

        .tabs-scrollbar-native-hidden::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `}</style>
      {bottomOnMobile && trailingAction && (
        <div className="mb-2 flex justify-end md:hidden">{trailingAction}</div>
      )}
      <div
        className={`tabs-scrollbar-shell max-w-full overflow-x-hidden ${
          scrollSpy ? 'sticky top-0 z-20 bg-white/95 backdrop-blur' : ''
        } ${sb('md:sticky md:top-4 md:w-48 lg:w-56 md:shrink-0 md:overflow-visible md:rounded-2xl md:border md:border-gray-200 md:bg-white md:p-2 md:shadow-sm')}`}
      >
        {sidebarHeader && <div className="mb-2 hidden md:block">{sidebarHeader}</div>}
        <div
          ref={tabListRef}
          role="tablist"
          aria-label="Secciones"
          className={`flex gap-2 overflow-x-auto pb-1 pt-1 ${sidebarOnDesktop ? 'md:flex-col md:gap-1 md:overflow-visible md:p-0' : 'md:gap-1.5 md:py-0.5'} ${
            hideScrollbar
              ? '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
              : 'tabs-scrollbar'
          } tabs-scrollbar-native-hidden`}
          onKeyDown={handleKey}
        >
          {tabs.map((tab, index) => {
            const isActive = index === activeTab
            const showSubTabs = sidebarOnDesktop && isActive && subTabs && subTabs.slugs.length > 1
            return (
              <React.Fragment key={slugs[index]}>
                <button
                  role="tab"
                  data-hide-on-mobile={(bottomOnMobile && tab.hideOnMobile) || undefined}
                  aria-selected={isActive}
                  aria-controls={`tab-panel-${slugs[index]}`}
                  id={`tab-${slugs[index]}`}
                  onClick={() => changeActiveTab(index, scrollSpy)}
                  className={`group relative flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium outline-none transition-all cursor-pointer ${
                    isActive
                      ? 'bg-green-600 text-white border-green-600 shadow-sm'
                      : `bg-white/70 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300 hover:shadow-sm ${sb('md:border-transparent md:bg-transparent md:hover:shadow-none')}`
                  } ${sidebarOnDesktop ? 'md:w-full md:rounded-xl md:justify-between' : 'md:min-h-8 md:gap-1.5 md:px-3 md:py-1 md:text-xs'} focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1`}
                >
                  <IconLabel
                    label={tab.label}
                    className={`whitespace-nowrap select-none leading-none ${bottomOnMobile ? 'bottom-tab-label' : ''}`}
                    iconClassName={sidebarOnDesktop ? 'h-[18px] w-[18px]' : 'h-4 w-4'}
                  />
                  {typeof tab.badgeCount === 'number' && tab.badgeCount > 0 && (
                    <span
                      className={`${bottomOnMobile ? 'bottom-tab-badge' : ''} inline-flex items-center justify-center rounded-full px-2 h-5 min-w-5 text-[10px] font-semibold tracking-wide leading-none transition-colors ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-200 text-gray-700 group-hover:bg-gray-300'
                      }`}
                    >
                      {tab.badgeCount}
                    </span>
                  )}
                  {isActive && (
                    <span
                      className={`${bottomOnMobile ? 'bottom-tab-ring' : ''} absolute inset-0 rounded-full ring-2 ring-green-500/40 pointer-events-none ${sb('md:hidden')}`}
                    />
                  )}
                </button>
                {showSubTabs && (
                  <div className="hidden md:flex flex-col gap-0.5 border-l-2 border-green-100 ml-5 pl-2 my-1">
                    {subTabs.labels.map((label, subIndex) => {
                      const isSubActive = subIndex === (subTabs.activeIndex ?? activeSubTab)
                      const badge = subTabs.badges[subIndex]
                      return (
                        <button
                          key={subTabs.slugs[subIndex]}
                          type="button"
                          aria-current={isSubActive ? 'page' : undefined}
                          onClick={() =>
                            subTabs.onSelect
                              ? subTabs.onSelect(subIndex)
                              : subTabs.paramKey &&
                                setParam(subTabs.paramKey, subTabs.slugs[subIndex])
                          }
                          className={`flex min-h-9 w-full items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-left text-sm transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
                            isSubActive
                              ? 'bg-green-100 font-semibold text-green-900'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          }`}
                        >
                          <IconLabel label={label} className="truncate" />
                          {typeof badge === 'number' && badge > 0 && (
                            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-200 px-1.5 text-[10px] font-semibold text-gray-700">
                              {badge}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </React.Fragment>
            )
          })}
          {trailingAction && (
            <div
              className={`${bottomOnMobile ? 'hidden md:flex' : 'flex'} items-center ml-1 ${sb('md:ml-0 md:mt-1 md:border-t md:border-gray-100 md:px-2 md:pt-2')}`}
            >
              {trailingAction}
            </div>
          )}
        </div>
        {!hideScrollbar && scrollbar.visible && (
          <div
            className={`tabs-scrollbar-track ${sb('md:hidden')}`}
            aria-hidden="true"
            style={{
              width: '100%',
              height: '4px',
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
      <SubTabsContext.Provider value={sidebarOnDesktop ? registerSubTabs : null}>
        <div className={`min-w-0 ${sb('md:flex-1')}`}>
          {tabs[activeTab]?.description && (
            <p className="mt-1 px-2 text-xs leading-4 text-gray-500">
              {tabs[activeTab].description}
            </p>
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
      </SubTabsContext.Provider>
    </div>
  )
}

/**
 * Expone sub-items (ej. filtros) en el menú lateral del Tabs padre con sidebarOnDesktop.
 * Sin Tabs padre con menú lateral no hace nada.
 */
export const useSidebarSubItems = ({
  labels,
  badges = [],
  activeIndex,
  onSelect,
}: {
  labels: string[]
  badges?: Array<number | undefined>
  activeIndex: number
  onSelect: (index: number) => void
}) => {
  const register = useContext(SubTabsContext)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const labelsKey = labels.join(',')
  const badgesKey = badges.join(',')
  useEffect(() => {
    if (!register) return
    return register({
      slugs: labels,
      labels,
      badges,
      activeIndex,
      onSelect: (index) => onSelectRef.current(index),
    })
  }, [register, labelsKey, badgesKey, activeIndex])
}

export default Tabs
