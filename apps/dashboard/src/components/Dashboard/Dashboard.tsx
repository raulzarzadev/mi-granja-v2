'use client'

import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import AiAssistant from '@/components/AiAssistant'
import FarmSection from '@/components/FarmSection'
import Navbar from '@/components/Navbar'
import ProfileSection from '@/components/ProfileSection'
import RemindersTab from '@/components/RemindersTab'
import Tabs from '@/components/Tabs'
import { RootState } from '@/features/store'
import { useFarmCRUD } from '@/hooks/useFarmCRUD'
import { useReminders } from '@/hooks/useReminders'
import { AnimalType, animal_icon, animals_types_labels } from '@/types/animals'
import FarmSwitcherBar from '../FarmSwitcherBar'
import ModalOnboarding from '../onboarding/ModalOnboarding'
import OnboardingCard from '../onboarding/OnboardingCard'
import RecordsTab from '../RecordsTab'
import AnimalsSection from './Animals/AnimalsSection'
import { useAnimalFilters } from './Animals/animals-filters'

/**
 * Dashboard principal de la aplicación
 * Muestra resumen del ganado y permite gestionar animales
 */
const Dashboard: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const { farms, currentFarm } = useFarmCRUD()

  const { filters, setFilters, animals, availableTypes } = useAnimalFilters()
  const { getBadgeCount } = useReminders()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const totalFilteredAnimals = animals.filter(
    (a) => (a.status ?? 'activo') === filters.status,
  ).length
  const getTypeCount = (type: AnimalType | string) =>
    animals.filter((a) => a.type === type && (a.status ?? 'activo') === filters.status).length
  const onlyTypeCount = availableTypes.length === 1 ? getTypeCount(availableTypes[0]) : 0
  const showAllTypeFilter = !(availableTypes.length === 1 && onlyTypeCount === totalFilteredAnimals)

  if (!user) {
    return null
  }

  const tabs = [
    {
      label: '🐄 Animales',
      content: <AnimalsSection filters={filters} setFilters={setFilters} />,
    },
    {
      label: '📆 Recordatorios',
      badgeCount: getBadgeCount(),
      content: <RemindersTab speciesFilter={filters.type} />,
    },
    {
      label: '📋 Registros',
      content: <RecordsTab />,
    },
    {
      label: '🚜 Granja',
      content: <FarmSection />,
    },
    {
      label: '👤 Perfil',
      content: <ProfileSection />,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <OnboardingCard />

        {/* Titulo de la granja + filtro global por tipo */}
        {currentFarm && (
          <div className="mb-3">
            <FarmSwitcherBar trailingAction={<AiAssistant />}>
              <div className="flex items-center justify-start gap-2 overflow-x-auto py-1 md:justify-end">
                {showAllTypeFilter && (
                  <button
                    type="button"
                    onClick={() => setFilters((prev) => ({ ...prev, type: '' }))}
                    className={`flex h-12 min-w-[58px] flex-col items-center justify-center rounded-full border-2 px-2 text-xs font-semibold transition-all duration-200 ${
                      filters.type === ''
                        ? 'border-green-500 bg-green-100 text-green-800'
                        : 'border-transparent bg-gray-100 text-gray-500 hover:border-green-200 hover:bg-green-50 hover:text-green-700'
                    }`}
                    title={`Todos (${totalFilteredAnimals})`}
                  >
                    <span>Todos</span>
                    <span className="text-[10px] font-bold leading-none">
                      {totalFilteredAnimals}
                    </span>
                  </button>
                )}
                {availableTypes.map((t) => {
                  const typeKey = t as AnimalType
                  const isSelected = filters.type === t || !showAllTypeFilter
                  const hasFilter = filters.type !== ''
                  const count = getTypeCount(t)
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          type: prev.type === t ? '' : (t as AnimalType),
                        }))
                      }
                      className={`flex h-12 min-w-[52px] flex-col items-center justify-center rounded-full border-2 px-2 text-lg transition-all duration-200 ${
                        isSelected
                          ? 'border-green-500 bg-green-100 shadow-sm'
                          : hasFilter
                            ? 'border-transparent bg-gray-100 opacity-40 grayscale hover:opacity-70 hover:grayscale-0'
                            : 'border-transparent bg-gray-100 hover:border-green-200 hover:bg-green-50'
                      }`}
                      title={`${animals_types_labels[typeKey] || t} (${count})`}
                    >
                      <span className="leading-none">{animal_icon[typeKey] || '🐾'}</span>
                      <span className="mt-0.5 text-[10px] font-bold leading-none text-gray-700">
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </FarmSwitcherBar>
          </div>
        )}

        {/* Si no hay granjas, priorizar creacion/seleccion */}
        {farms.length === 0 ? (
          <FarmSection />
        ) : (
          <Tabs
            tabs={tabs}
            tabsId="dashboard-main"
            trailingAction={
              <button
                type="button"
                onClick={() => setShowOnboarding(true)}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-sm font-bold cursor-pointer transition-colors"
                title="Ver guia de primeros pasos"
                aria-label="Ver guia de primeros pasos"
              >
                ?
              </button>
            }
          />
        )}

        <ModalOnboarding isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
      </div>
    </div>
  )
}

export default Dashboard
