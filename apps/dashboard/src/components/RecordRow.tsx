'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import React from 'react'
import {
  AnimalRecord,
  record_category_colors,
  record_category_icons,
  record_category_labels,
} from '@/types/animals'

export interface RecordRowProps {
  rec: AnimalRecord
  onClick?: () => void
}

const clinicalCats = ['illness', 'injury', 'treatment', 'surgery'] as const

const RecordRow: React.FC<RecordRowProps> = ({ rec, onClick }) => {
  const isClinicalHealth =
    rec.type === 'health' && (clinicalCats as readonly string[]).includes(rec.category)

  return (
    <div
      className={`border border-gray-200 rounded-lg p-3 bg-white ${onClick ? 'cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                record_category_colors[rec.category]
              }`}
            >
              {record_category_icons[rec.category]} {record_category_labels[rec.category]}
            </span>
            <span className="font-medium truncate">{rec.title}</span>
          </div>
          <div className="text-sm text-gray-500 flex items-center gap-3 flex-wrap">
            <span>{format(new Date(rec.date), 'dd/MM/yyyy', { locale: es })}</span>
            {rec.nextDueDate && (
              <span className="text-xs text-orange-600">
                Prox: {format(new Date(rec.nextDueDate), 'dd/MM/yyyy', { locale: es })}
              </span>
            )}
            {rec.veterinarian && <span className="text-xs">Dr. {rec.veterinarian}</span>}
          </div>
        </div>

        {/* Status badge */}
        {isClinicalHealth && (
          <span
            className={`ml-2 shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${
              rec.isResolved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {rec.isResolved ? 'Resuelto' : 'Activo'}
          </span>
        )}
      </div>
    </div>
  )
}

export default RecordRow
