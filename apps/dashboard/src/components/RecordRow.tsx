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
  onEdit: (rec: AnimalRecord) => void
  onDelete: (id: string) => void
  onResolve?: (id: string) => void
  onReopen?: (id: string) => void
}

const RecordRow: React.FC<RecordRowProps> = ({ rec, onEdit, onDelete, onResolve, onReopen }) => {
  const isClinicalHealth =
    rec.type === 'health' &&
    (['illness', 'injury', 'treatment', 'surgery'] as const).includes(rec.category as any)

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                record_category_colors[rec.category]
              }`}
            >
              {record_category_icons[rec.category]} {record_category_labels[rec.category]}
            </span>
            <span className="font-medium">{rec.title}</span>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <div>
              📅 {format(new Date(rec.date), 'dd/MM/yyyy', { locale: es })}
              {rec.nextDueDate && (
                <span className="ml-2 text-xs text-yellow-700">
                  ⏰ Próximo:{' '}
                  {format(new Date(rec.nextDueDate), 'dd/MM/yyyy', {
                    locale: es,
                  })}
                </span>
              )}
            </div>
            {rec.description && <div>📝 {rec.description}</div>}
            {rec.veterinarian && <div>👨‍⚕️ {rec.veterinarian}</div>}
            {rec.cost !== undefined && <div>💰 ${rec.cost}</div>}
            {rec.severity && (
              <div>
                <span className="text-xs text-gray-500 mr-1">Severidad:</span>
                {rec.severity}
              </div>
            )}
            {rec.isResolved && rec.resolvedDate && (
              <div className="text-xs text-green-700">
                Resuelto:{' '}
                {format(new Date(rec.resolvedDate), 'dd/MM/yyyy', {
                  locale: es,
                })}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-1 ml-2">
          {isClinicalHealth && !rec.isResolved && onResolve && (
            <button
              onClick={() => onResolve(rec.id)}
              className="text-green-700 hover:text-green-900 text-sm px-2 py-1"
              title="Marcar resuelto"
            >
              ✅
            </button>
          )}
          {isClinicalHealth && rec.isResolved && onReopen && (
            <button
              onClick={() => onReopen(rec.id)}
              className="text-yellow-700 hover:text-yellow-900 text-sm px-2 py-1"
              title="Reabrir caso"
            >
              ♻️
            </button>
          )}
          <button
            onClick={() => onEdit(rec)}
            className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1"
            title="Editar registro"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(rec.id)}
            className="text-red-600 hover:text-red-800 text-sm px-2 py-1"
            title="Eliminar registro"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  )
}

export default RecordRow
