'use client'

import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import FarmSection from '@/components/FarmSection'
import Navbar from '@/components/Navbar'
import ProfileSection from '@/components/ProfileSection'
import Tabs from '@/components/Tabs'
import { RootState } from '@/features/store'
import { useFarmCRUD } from '@/hooks/useFarmCRUD'
import { useFixedViewport } from '@/hooks/useFixedViewport'
import { trackOnboardingCompleted, trackOnboardingStepCompleted } from '@/lib/analytics/track'
import FarmSwitcherBar from '../FarmSwitcherBar'
import ModalOnboarding from '../onboarding/ModalOnboarding'
import ModalWelcomeFarm from '../onboarding/ModalWelcomeFarm'
import RecordsTab from '../RecordsTab'
import { AnimalSelectionProvider } from './AnimalSelectionContext'
import AnimalsSection from './Animals/AnimalsSection'
import { initialAnimalFilters, useAnimalFilters } from './Animals/animals-filters'
import QuickCreateButton from './QuickCreateButton'

/**
 * Dashboard principal de la aplicación
 * Muestra resumen del ganado y permite gestionar animales
 */
const Dashboard: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const { farms, currentFarm } = useFarmCRUD()
  const fixedViewportStyle = useFixedViewport()

  const { filters, setFilters } = useAnimalFilters()
  const [breedingFilters, setBreedingFilters] = useState(initialAnimalFilters)
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
      label: '🐐 Empadres',
      content: (
        <AnimalsSection
          section="breedings"
          filters={breedingFilters}
          setFilters={setBreedingFilters}
        />
      ),
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
      hideOnMobile: true,
      content: <ProfileSection />,
    },
  ]

  return (
    <AnimalSelectionProvider key={currentFarm?.id ?? 'no-farm'}>
      <div style={fixedViewportStyle} className="min-h-screen w-full min-w-0 max-w-full bg-gray-50">
        <Navbar />

        <main className="mx-auto w-full min-w-0 max-w-7xl px-2 py-2 min-[360px]:px-4 sm:px-6 lg:px-8">
          {/* Titulo de la granja + filtro global por tipo */}
          {currentFarm && (
            <div className="mb-3">
              <FarmSwitcherBar />
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
              bottomOnMobile
              sidebarHeader={currentFarm ? <QuickCreateButton placement="sidebar" /> : undefined}
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
        {currentFarm && <QuickCreateButton />}
      </div>
    </AnimalSelectionProvider>
  )
}

export default Dashboard
