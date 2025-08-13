import React, { useState, ReactNode, KeyboardEvent } from 'react'

type Tab = {
  label: string
  content: ReactNode
  badgeCount?: number
}

type TabsProps = {
  tabs: Tab[]
  initialActiveTab?: number
}

const Tabs: React.FC<TabsProps> = ({ tabs, initialActiveTab = 0 }) => {
  const [activeTab, setActiveTab] = useState(initialActiveTab)

  const handleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) {
      e.preventDefault()
      let next = activeTab
      if (e.key === 'ArrowRight') next = (activeTab + 1) % tabs.length
      if (e.key === 'ArrowLeft')
        next = (activeTab - 1 + tabs.length) % tabs.length
      if (e.key === 'Home') next = 0
      if (e.key === 'End') next = tabs.length - 1
      setActiveTab(next)
    }
  }

  return (
    <div>
      {/* Navegación de tabs */}
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
              key={index}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tab-panel-${index}`}
              id={`tab-${index}`}
              onClick={() => setActiveTab(index)}
              className={`group relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium outline-none transition-all border ${
                isActive
                  ? 'bg-green-600 text-white border-green-600 shadow-sm'
                  : 'bg-white/70 text-gray-600 border-gray-200 hover:bg-gray-50'
              } focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1`}
            >
              <span className="whitespace-nowrap select-none leading-none">
                {tab.label}
              </span>
              {typeof tab.badgeCount === 'number' && tab.badgeCount > 0 && (
                <span
                  className={`inline-flex items-center justify-center rounded-full px-2 h-5 min-w-[1.25rem] text-[10px] font-semibold tracking-wide leading-none transition-colors ${
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
      {/* Línea decorativa (opcional) */}
      <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mt-2" />
      {/* Contenido */}
      <div
        id={`tab-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        className="mt-4"
      >
        {tabs[activeTab]?.content}
      </div>
    </div>
  )
}

export default Tabs
