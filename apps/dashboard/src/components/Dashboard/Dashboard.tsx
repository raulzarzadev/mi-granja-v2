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
import { trackOnboardingCompleted, trackOnboardingStepCompleted } from '@/lib/analytics/track'
import FarmSwitcherBar from '../FarmSwitcherBar'
import ModalOnboarding from '../onboarding/ModalOnboarding'
import ModalWelcomeFarm from '../onboarding/ModalWelcomeFarm'
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

  const { filters, setFilters } = useAnimalFilters()
  const { getBadgeCount } = useReminders()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [welcomeFarmName, setWelcomeFarmName] = useState<string | null>(null)

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
    <div className="min-h-screen w-full min-w-0 max-w-full bg-gray-50">
      <Navbar />

      <main className="mx-auto w-full min-w-0 max-w-7xl px-2 py-2 min-[360px]:px-4 sm:px-6 lg:px-8">
        {/* Titulo de la granja + filtro global por tipo */}
        {currentFarm && (
          <div className="mb-3">
            <FarmSwitcherBar trailingAction={<AiAssistant />} />
          </div>
        )}

        {/* Si no hay granjas, priorizar creacion/seleccion */}
        {farms.length === 0 ? (
          <FarmSection
            onFarmCreated={(farm) => {
              trackOnboardingStepCompleted({ step_name: 'first_farm_created', step_number: 1 })
              setWelcomeFarmName(farm.name)
            }}
          />
        ) : (
          <Tabs
            tabs={tabs}
            tabsId="dashboard-main"
            sidebarOnDesktop
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

        <ModalOnboarding
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          source="dashboard"
        />
        <ModalWelcomeFarm
          farmName={welcomeFarmName}
          onClose={() => {
            trackOnboardingCompleted({ action: 'start' })
            setWelcomeFarmName(null)
          }}
          onShowGuide={() => {
            trackOnboardingCompleted({ action: 'show_guide' })
            setWelcomeFarmName(null)
            setShowOnboarding(true)
          }}
        />
      </main>
    </div>
  )
}

export default Dashboard
