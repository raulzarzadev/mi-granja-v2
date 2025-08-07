import React, { useState, ReactNode } from 'react'

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

  return (
    <div>
      {/* Tab Navigation */}
      <nav className="flex space-x-8 border-b border-gray-200">
        {tabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => setActiveTab(index)}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors relative ${
              activeTab === index
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
            {!!tab.badgeCount && tab.badgeCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ml-1">
                ( {tab.badgeCount})
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      <div className="mt-4">{tabs[activeTab]?.content}</div>
    </div>
  )
}

export default Tabs
