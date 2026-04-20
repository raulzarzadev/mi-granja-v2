'use client'

import React from 'react'
import { Modal } from '../Modal'
import OnboardingSteps from './OnboardingSteps'

interface ModalOnboardingProps {
  isOpen: boolean
  onClose: () => void
}

const ModalOnboarding: React.FC<ModalOnboardingProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Primeros pasos en Mi Granja" size="lg">
      <p className="text-sm text-gray-600 mb-4">
        Sigue este flujo para registrar y dar seguimiento a tu ganado.
      </p>
      <OnboardingSteps />
    </Modal>
  )
}

export default ModalOnboarding
