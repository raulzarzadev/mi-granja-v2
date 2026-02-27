'use client'

import React, { useState } from 'react'
import DateTimeInput from './inputs/DateTimeInput'

const DateTimeInputTest: React.FC = () => {
  const [dateValue, setDateValue] = useState<Date | null>(new Date())

  console.log('Current date value:', dateValue)

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Prueba DateTimeInput</h2>

      <div>
        <h3 className="font-semibold">Modo datetime:</h3>
        <DateTimeInput
          type="datetime"
          value={dateValue}
          onChange={setDateValue}
          label="Fecha y hora"
        />
        <p className="text-sm text-gray-600 mt-2">
          Valor actual: {dateValue ? dateValue.toString() : 'null'}
        </p>
      </div>

      <div>
        <h3 className="font-semibold">Modo date:</h3>
        <DateTimeInput
          type="date"
          value={dateValue}
          onChange={setDateValue}
          label="Solo fecha"
        />
      </div>

      <button
        onClick={() => setDateValue(new Date())}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Reset a ahora
      </button>

      <button
        onClick={() => setDateValue(null)}
        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
      >
        Clear
      </button>
    </div>
  )
}

export default DateTimeInputTest
