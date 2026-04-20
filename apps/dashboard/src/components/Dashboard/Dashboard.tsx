'use client'

import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import FarmAvatar from '@/components/FarmAvatar'
import FarmSection from '@/components/FarmSection'
import MyRole from '@/components/MyRole'
import Navbar from '@/components/Navbar'
import ProfileSection from '@/components/ProfileSection'
import RemindersTab from '@/components/RemindersTab'
import Tabs from '@/components/Tabs'
import { RootState } from '@/features/store'
import { useFarmCRUD } from '@/hooks/useFarmCRUD'
import { useReminders } from '@/hooks/useReminders'
import { AnimalType, animal_icon, animals_types_labels } from '@/types/animals'
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
  const { getOverdueReminders } = useReminders()
  const [showOnboarding, setShowOnboarding] = useState(false)

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
      badgeCount: getOverdueReminders().length,
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
          <div className="flex items-center gap-3 mb-3">
            <FarmAvatar name={currentFarm.name} photoURL={currentFarm.photoURL} size="md" />
            <div className="flex flex-col justify-center items-start">
              <h1 className="text-lg font-semibold text-gray-900">{currentFarm.name}</h1>
              <MyRole farm={currentFarm} />
            </div>

            {availableTypes.length > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, type: '' }))}
                  className={`px-3 h-11 rounded-full text-xs font-medium transition-all duration-200 ${
                    filters.type === ''
                      ? 'bg-green-100 ring-2 ring-green-500 text-green-800'
                      : 'bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-700'
                  }`}
                >
                  Todos
                </button>
                {availableTypes.map((t) => {
                  const typeKey = t as AnimalType
                  const isSelected = filters.type === t
                  const hasFilter = filters.type !== ''
                  const count = animals.filter(
                    (a) => a.type === t && (a.status ?? 'activo') === filters.status,
                  ).length
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
                      className={`relative flex items-center justify-center w-11 h-11 rounded-full text-xl transition-all duration-200 ${
                        isSelected
                          ? 'bg-green-100 ring-2 ring-green-500 shadow-sm scale-110'
                          : hasFilter
                            ? 'bg-gray-100 opacity-40 grayscale hover:opacity-70 hover:grayscale-0'
                            : 'bg-gray-100 hover:bg-green-50 hover:ring-1 hover:ring-green-300'
                      }`}
                      title={`${animals_types_labels[typeKey] || t} (${count})`}
                    >
                      {animal_icon[typeKey] || '🐾'}
                      {isSelected && (
                        <span className="absolute -bottom-1 -right-1 bg-green-600 text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
                          {count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
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
