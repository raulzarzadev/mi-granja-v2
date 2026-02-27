'use client'

import React, { useState } from 'react'
import DateTimeInput from './inputs/DateTimeInput'

const DateTimeTestSuite: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([])
  const [dateValue, setDateValue] = useState<Date | null>(new Date(2024, 8, 15, 14, 30)) // 15 sep 2024, 14:30
  const [dateOnlyValue, setDateOnlyValue] = useState<Date | null>(new Date(2024, 11, 25)) // 25 dic 2024

  const addResult = (test: string, passed: boolean, details?: string) => {
    const result = `${passed ? '✅' : '❌'} ${test}${details ? ` - ${details}` : ''}`
    setTestResults((prev) => [...prev, result])
  }

  const clearResults = () => setTestResults([])

  const runTests = () => {
    clearResults()

    // Test 1: Verificar valores iniciales
    addResult(
      'Valores iniciales datetime',
      dateValue?.getDate() === 15 &&
        dateValue?.getMonth() === 8 &&
        dateValue?.getFullYear() === 2024 &&
        dateValue?.getHours() === 14 &&
        dateValue?.getMinutes() === 30,
      `Esperado: 15/Sep/2024 14:30, Actual: ${dateValue?.toLocaleString()}`,
    )

    addResult(
      'Valores iniciales date',
      dateOnlyValue?.getDate() === 25 &&
        dateOnlyValue?.getMonth() === 11 &&
        dateOnlyValue?.getFullYear() === 2024,
      `Esperado: 25/Dic/2024, Actual: ${dateOnlyValue?.toLocaleDateString()}`,
    )
  }

  const testScenarios = [
    {
      name: 'Fecha específica con hora',
      date: new Date(2023, 5, 10, 9, 15), // 10 jun 2023, 09:15
      type: 'datetime' as const,
    },
    {
      name: 'Fecha de año pasado',
      date: new Date(2022, 0, 1), // 1 ene 2022
      type: 'date' as const,
    },
    {
      name: 'Fecha de año futuro',
      date: new Date(2026, 11, 31, 23, 59), // 31 dic 2026, 23:59
      type: 'datetime' as const,
    },
    {
      name: 'Fecha actual',
      date: new Date(),
      type: 'datetime' as const,
    },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-center">Batería de Pruebas - DateTimeInput</h1>

      {/* Controles de prueba */}
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-3">Controles de Prueba</h2>
        <div className="flex gap-2">
          <button
            onClick={runTests}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Ejecutar Pruebas Automáticas
          </button>
          <button
            onClick={clearResults}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Limpiar Resultados
          </button>
        </div>
      </div>

      {/* Resultados de pruebas */}
      {testResults.length > 0 && (
        <div className="bg-white border p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Resultados de Pruebas:</h3>
          <div className="space-y-1 font-mono text-sm">
            {testResults.map((result, idx) => (
              <div key={idx}>{result}</div>
            ))}
          </div>
        </div>
      )}

      {/* Prueba principal - Componente interactivo */}
      <div className="bg-white border p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Prueba Principal - Modo DateTime</h2>
        <DateTimeInput
          type="datetime"
          value={dateValue}
          onChange={setDateValue}
          label="Fecha y Hora de Prueba"
        />{' '}
        <div className="mt-4 p-3 bg-gray-50 rounded">
          <strong>Valor actual:</strong> {dateValue ? dateValue.toString() : 'null'}
          <br />
          <strong>Fecha legible:</strong> {dateValue ? dateValue.toLocaleString('es-ES') : 'null'}
          <br />
          <strong>ISO String:</strong> {dateValue ? dateValue.toISOString() : 'null'}
        </div>
        <div className="mt-4 space-x-2">
          <button
            onClick={() => setDateValue(new Date())}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm"
          >
            Ahora
          </button>
          <button
            onClick={() => setDateValue(new Date(2024, 11, 25, 0, 0))}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
          >
            Navidad 2024
          </button>
          <button
            onClick={() => setDateValue(null)}
            className="px-3 py-1 bg-red-500 text-white rounded text-sm"
          >
            Null
          </button>
        </div>
      </div>

      {/* Prueba modo Date */}
      <div className="bg-white border p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Prueba Secundaria - Modo Date</h2>
        <DateTimeInput
          type="date"
          value={dateOnlyValue}
          onChange={setDateOnlyValue}
          label="Solo Fecha"
        />{' '}
        <div className="mt-4 p-3 bg-gray-50 rounded">
          <strong>Valor actual:</strong> {dateOnlyValue ? dateOnlyValue.toString() : 'null'}
          <br />
          <strong>Fecha legible:</strong>{' '}
          {dateOnlyValue ? dateOnlyValue.toLocaleDateString('es-ES') : 'null'}
        </div>
      </div>

      {/* Escenarios de prueba predefinidos */}
      <div className="bg-white border p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Escenarios de Prueba</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {testScenarios.map((scenario, idx) => (
            <TestScenario
              key={idx}
              name={scenario.name}
              initialDate={scenario.date}
              type={scenario.type}
            />
          ))}
        </div>
      </div>

      {/* Tests de validación manual */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <h3 className="font-semibold">Tests Manuales Recomendados:</h3>
        <ul className="mt-2 space-y-1 text-sm">
          <li>1. Cambiar el día y verificar que se mantienen mes, año, hora y minuto</li>
          <li>2. Cambiar el año y verificar que no se reduce el día</li>
          <li>3. Cambiar la hora y verificar que los minutos se mantienen</li>
          <li>4. Cambiar los minutos y verificar que la hora se mantiene</li>
          <li>5. Probar con fechas de febrero (28/29 días)</li>
          <li>6. Probar con meses de 30 y 31 días</li>
          <li>7. Verificar que el modo &lsquo;date&rsquo; no muestra hora/minuto</li>
          <li>8. Verificar que el modo &lsquo;datetime&rsquo; muestra todos los campos</li>
        </ul>
      </div>
    </div>
  )
}

// Componente para escenarios individuales
const TestScenario: React.FC<{
  name: string
  initialDate: Date
  type: 'date' | 'datetime'
}> = ({ name, initialDate, type }) => {
  const [value, setValue] = useState<Date | null>(initialDate)

  return (
    <div className="border p-3 rounded">
      <h4 className="font-medium mb-2">{name}</h4>
      <DateTimeInput type={type} value={value} onChange={setValue} />
      <div className="mt-2 text-xs text-gray-600">
        {value ? value.toLocaleString('es-ES') : 'null'}
      </div>
    </div>
  )
}

export default DateTimeTestSuite
