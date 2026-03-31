'use client'

import { useState } from 'react'
import { DatePickerButtons } from '@/components/buttons/date-picker-buttons'
import { Modal } from '@/components/Modal'
import { useModal } from '@/hooks/useModal'

// --- DatePickerButtons examples ---

export const ExampleDatePickerBasic = () => {
  const [value, setValue] = useState('')

  return (
    <div>
      <DatePickerButtons value={value} onChange={setValue} label="Fecha de ejemplo" />
      {value && <p className="text-xs text-gray-500 mt-2">Valor: {value}</p>}
    </div>
  )
}

export const ExampleDatePickerWithToday = () => {
  const [value, setValue] = useState('')

  return (
    <div>
      <DatePickerButtons
        value={value}
        onChange={setValue}
        label="Con boton Hoy"
        showToday
        helperText="Presiona 'Hoy' para seleccionar la fecha actual"
      />
      {value && <p className="text-xs text-gray-500 mt-2">Valor: {value}</p>}
    </div>
  )
}

export const ExampleDatePickerWithTime = () => {
  const [value, setValue] = useState('')

  return (
    <div>
      <DatePickerButtons
        value={value}
        onChange={setValue}
        label="Con hora"
        showToday
        showTime
        helperText="Incluye selector de hora"
      />
      {value && <p className="text-xs text-gray-500 mt-2">Valor: {value}</p>}
    </div>
  )
}

// --- Modal size examples ---

export const ExampleModalSm = () => {
  const { isOpen, openModal, closeModal } = useModal()

  return (
    <>
      <button
        onClick={openModal}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
      >
        Modal SM
      </button>
      <Modal isOpen={isOpen} onClose={closeModal} title="Modal Pequeno (sm)" size="sm">
        <p className="text-gray-600 mb-4">
          Este modal usa el tamano <strong>sm</strong>. Ideal para confirmaciones o mensajes cortos.
        </p>
        <button
          onClick={closeModal}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 cursor-pointer"
        >
          Cerrar
        </button>
      </Modal>
    </>
  )
}

export const ExampleModalMd = () => {
  const { isOpen, openModal, closeModal } = useModal()

  return (
    <>
      <button
        onClick={openModal}
        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer"
      >
        Modal MD
      </button>
      <Modal isOpen={isOpen} onClose={closeModal} title="Modal Mediano (md)" size="md">
        <p className="text-gray-600 mb-4">
          Este modal usa el tamano <strong>md</strong> (por defecto). Bueno para formularios simples
          y contenido moderado.
        </p>
        <div className="bg-gray-50 p-4 rounded-md mb-4">
          <p className="text-sm text-gray-500">Contenido de ejemplo dentro del modal mediano.</p>
        </div>
        <button
          onClick={closeModal}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 cursor-pointer"
        >
          Cerrar
        </button>
      </Modal>
    </>
  )
}

export const ExampleModalLg = () => {
  const { isOpen, openModal, closeModal } = useModal()

  return (
    <>
      <button
        onClick={openModal}
        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 cursor-pointer"
      >
        Modal LG
      </button>
      <Modal isOpen={isOpen} onClose={closeModal} title="Modal Grande (lg)" size="lg">
        <p className="text-gray-600 mb-4">
          Este modal usa el tamano <strong>lg</strong>. Adecuado para formularios complejos o
          contenido extenso.
        </p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-blue-50 p-4 rounded-md">
            <p className="text-sm text-blue-700">Columna 1</p>
          </div>
          <div className="bg-green-50 p-4 rounded-md">
            <p className="text-sm text-green-700">Columna 2</p>
          </div>
        </div>
        <button
          onClick={closeModal}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 cursor-pointer"
        >
          Cerrar
        </button>
      </Modal>
    </>
  )
}
