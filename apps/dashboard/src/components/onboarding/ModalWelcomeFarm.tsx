'use client'

import React from 'react'
import Button from '../buttons/Button'
import { Modal } from '../Modal'

type ModalWelcomeFarmProps = {
  farmName: string | null
  onClose: () => void
  onShowGuide: () => void
}

/**
 * Bienvenida tras crear la primera granja
 */
const ModalWelcomeFarm: React.FC<ModalWelcomeFarmProps> = ({ farmName, onClose, onShowGuide }) => (
  <Modal isOpen={Boolean(farmName)} onClose={onClose} size="md">
    <div className="py-4 text-center">
      <span className="text-5xl" aria-hidden="true">
        🎉
      </span>
      <h2 className="mt-3 text-2xl font-bold text-slate-900">¡Bienvenido!</h2>
      <p className="mt-2 text-slate-600">
        <span className="font-semibold text-slate-800">{farmName}</span> está lista. Ya puedes
        registrar tus animales, recordatorios y registros.
      </p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
        <Button
          variant="ghost"
          color="neutral"
          size="md"
          onClick={onShowGuide}
          className="min-h-11"
        >
          Ver primeros pasos
        </Button>
        <Button variant="filled" color="success" size="md" onClick={onClose} className="min-h-11">
          Comenzar
        </Button>
      </div>
    </div>
  </Modal>
)

export default ModalWelcomeFarm
