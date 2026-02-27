'use client'

import React, { useState } from 'react'
import { InputDate } from './input-date'

/**
 * Ejemplo de uso del componente InputDate
 */
const InputDateExample: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [birthDate, setBirthDate] = useState<Date | null>(null)
  const [errorDate, setErrorDate] = useState<Date | null>(null)

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">
        Ejemplos de InputDate
      </h1>

      {/* Ejemplo básico */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Ejemplo Básico</h2>
        <InputDate
          label="Fecha de Monta"
          value={selectedDate}
          onChange={setSelectedDate}
          required
        />
        <div className="text-sm text-gray-600">
          <strong>Valor seleccionado:</strong>{' '}
          {selectedDate ? selectedDate.toLocaleString('es-ES') : 'Ninguno'}
        </div>
      </div>

      {/* Ejemplo con validación */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Con Validación</h2>
        <InputDate
          label="Fecha de Nacimiento"
          value={birthDate}
          onChange={setBirthDate}
          error={
            birthDate && birthDate > new Date()
              ? 'La fecha no puede ser futura'
              : undefined
          }
          required
        />
        <div className="text-sm text-gray-600">
          <strong>Valor seleccionado:</strong>{' '}
          {birthDate ? birthDate.toLocaleString('es-ES') : 'Ninguno'}
        </div>
      </div>

      {/* Ejemplo con error */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Con Error</h2>
        <InputDate
          label="Fecha con Error"
          value={errorDate}
          onChange={setErrorDate}
          error="Este campo tiene un error de ejemplo"
          required
        />
      </div>

      {/* Ejemplo deshabilitado */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Deshabilitado</h2>
        <InputDate
          label="Fecha Deshabilitada"
          value={new Date()}
          onChange={() => {}}
          disabled
        />
      </div>

      {/* Instrucciones de uso */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">
          💡 Instrucciones de Uso
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Escribe directamente los números en cada campo</li>
          <li>
            • Usa <kbd className="bg-blue-200 px-1 rounded">/</kbd> o{' '}
            <kbd className="bg-blue-200 px-1 rounded">:</kbd> para saltar al
            siguiente campo
          </li>
          <li>
            • Usa las flechas <kbd className="bg-blue-200 px-1 rounded">←</kbd>{' '}
            <kbd className="bg-blue-200 px-1 rounded">→</kbd> para navegar
          </li>
          <li>• El componente valida automáticamente las fechas</li>
          <li>• Formato: DD/MM/AAAA HH:MM</li>
        </ul>
      </div>

      {/* Código de ejemplo */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">
          📝 Código de Ejemplo
        </h3>
        <pre className="text-sm text-gray-700 overflow-x-auto">
          {`import { InputDate } from './components/inputs/input-date'

const [fecha, setFecha] = useState<Date | null>(null)

<InputDate
  label="Fecha de Monta"
  value={fecha}
  onChange={setFecha}
  required
  error={fecha ? undefined : "Este campo es requerido"}
/>`}
        </pre>
      </div>
    </div>
  )
}

export default InputDateExample
