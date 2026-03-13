'use client'

import React, { useMemo, useState } from 'react'
import { formatDate } from '@/lib/dates'
import { Animal, animals_types_labels } from '@/types/animals'
import { BreedingRecord } from '@/types/breedings'

type SortField = 'breedingId' | 'date' | 'male' | 'females' | 'status'
type SortDirection = 'asc' | 'desc'

interface BreedingTableProps {
  records: BreedingRecord[]
  animals: Animal[]
  onSelect: (record: BreedingRecord) => void
  onDelete: (recordIds: string[]) => void
}

function getBreedingStatus(record: BreedingRecord) {
  let pending = 0
  let pregnant = 0
  let births = 0
  let totalOffspring = 0

  for (const f of record.femaleBreedingInfo) {
    if (f.actualBirthDate) {
      births++
      totalOffspring += f.offspring?.length || 0
    } else if (f.pregnancyConfirmedDate) {
      pregnant++
    } else {
      pending++
    }
  }

  return { pending, pregnant, births, totalOffspring }
}

function statusLabel(s: ReturnType<typeof getBreedingStatus>) {
  const parts: string[] = []
  if (s.pending > 0) parts.push(`${s.pending} pend`)
  if (s.pregnant > 0) parts.push(`${s.pregnant} emb`)
  if (s.births > 0) parts.push(`${s.births} partos`)
  return parts.join(' / ') || '-'
}

function statusColor(s: ReturnType<typeof getBreedingStatus>) {
  if (s.pending > 0) return 'bg-yellow-100 text-yellow-800'
  if (s.pregnant > 0) return 'bg-blue-100 text-blue-800'
  if (s.births > 0) return 'bg-green-100 text-green-800'
  return 'bg-gray-100 text-gray-600'
}

const SortIcon = ({ direction }: { direction: SortDirection | null }) => {
  if (!direction) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-3 h-3 text-gray-400"
      >
        <path
          fillRule="evenodd"
          d="M10 3a.75.75 0 0 1 .55.24l3.25 3.5a.75.75 0 1 1-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 0 1-1.1-1.02l3.25-3.5A.75.75 0 0 1 10 3Zm-3.76 9.2a.75.75 0 0 1 1.06.04l2.7 2.908 2.7-2.908a.75.75 0 1 1 1.1 1.02l-3.25 3.5a.75.75 0 0 1-1.1 0l-3.25-3.5a.75.75 0 0 1 .04-1.06Z"
          clipRule="evenodd"
        />
      </svg>
    )
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="w-3 h-3 text-green-600"
    >
      {direction === 'asc' ? (
        <path
          fillRule="evenodd"
          d="M9.47 6.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 1 1-1.06 1.06L10 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25Z"
          clipRule="evenodd"
        />
      ) : (
        <path
          fillRule="evenodd"
          d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
          clipRule="evenodd"
        />
      )}
    </svg>
  )
}

const BreedingTable: React.FC<BreedingTableProps> = ({ records, animals, onSelect, onDelete }) => {
  const [sortField, setSortField] = useState<SortField | null>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else {
        setSortField(null)
        setSortDirection('asc')
      }
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(records.map((r) => r.id)))
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
    setIsSelectionMode(false)
  }

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return
    const count = selectedIds.size
    if (
      window.confirm(
        `¿Eliminar ${count} monta${count !== 1 ? 's' : ''}? Esta accion no se puede deshacer.`,
      )
    ) {
      onDelete(Array.from(selectedIds))
      clearSelection()
    }
  }

  const enriched = useMemo(
    () =>
      records.map((r) => {
        const male = animals.find((a) => a.id === r.maleId)
        const status = getBreedingStatus(r)
        return { record: r, male, status }
      }),
    [records, animals],
  )

  const sorted = useMemo(() => {
    if (!sortField) return enriched

    return [...enriched].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'breedingId':
          cmp = (a.record.breedingId || '').localeCompare(b.record.breedingId || '', 'es', {
            numeric: true,
          })
          break
        case 'date':
          cmp = (a.record.breedingDate?.getTime() || 0) - (b.record.breedingDate?.getTime() || 0)
          break
        case 'male':
          cmp = (a.male?.animalNumber || '').localeCompare(b.male?.animalNumber || '', 'es', {
            numeric: true,
          })
          break
        case 'females':
          cmp = a.record.femaleBreedingInfo.length - b.record.femaleBreedingInfo.length
          break
        case 'status': {
          const scoreA = a.status.pending * 100 + a.status.pregnant * 10
          const scoreB = b.status.pending * 100 + b.status.pregnant * 10
          cmp = scoreB - scoreA
          break
        }
      }
      return sortDirection === 'asc' ? cmp : -cmp
    })
  }, [enriched, sortField, sortDirection])

  const thClass =
    'px-2 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors'

  return (
    <div>
      {/* Barra de seleccion */}
      <div className="px-2 py-2 flex items-center gap-2 text-xs">
        {!isSelectionMode ? (
          <button
            onClick={() => setIsSelectionMode(true)}
            className="text-blue-600 hover:text-blue-800 transition-colors"
          >
            Seleccionar
          </button>
        ) : (
          <>
            <button
              onClick={selectAll}
              className="text-green-600 hover:text-green-800 transition-colors"
            >
              Todos ({records.length})
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={clearSelection}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancelar
            </button>
            {selectedIds.size > 0 && (
              <>
                <span className="text-gray-300">|</span>
                <span className="text-gray-500">{selectedIds.size} seleccionados</span>
                <button
                  onClick={handleBulkDelete}
                  className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Eliminar
                </button>
              </>
            )}
          </>
        )}
      </div>

      <div className="overflow-x-auto -mx-2 md:mx-0">
        <table className="w-full text-left min-w-[600px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {isSelectionMode && <th className="w-8 px-2 py-2" />}
              <th onClick={() => handleSort('breedingId')} className={`w-28 ${thClass}`}>
                <span className="inline-flex items-center gap-0.5">
                  ID
                  <SortIcon direction={sortField === 'breedingId' ? sortDirection : null} />
                </span>
              </th>
              <th onClick={() => handleSort('date')} className={thClass}>
                <span className="inline-flex items-center gap-0.5">
                  Fecha
                  <SortIcon direction={sortField === 'date' ? sortDirection : null} />
                </span>
              </th>
              <th onClick={() => handleSort('male')} className={thClass}>
                <span className="inline-flex items-center gap-0.5">
                  Macho
                  <SortIcon direction={sortField === 'male' ? sortDirection : null} />
                </span>
              </th>
              <th onClick={() => handleSort('females')} className={`text-center ${thClass}`}>
                <span className="inline-flex items-center gap-0.5">
                  Hembras
                  <SortIcon direction={sortField === 'females' ? sortDirection : null} />
                </span>
              </th>
              <th onClick={() => handleSort('status')} className={thClass}>
                <span className="inline-flex items-center gap-0.5">
                  Estado
                  <SortIcon direction={sortField === 'status' ? sortDirection : null} />
                </span>
              </th>
              <th className="hidden sm:table-cell px-2 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Crias
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ record, male, status }) => {
              const isSelected = selectedIds.has(record.id)
              return (
                <tr
                  key={record.id}
                  onClick={() => {
                    if (isSelectionMode) {
                      toggleSelection(record.id)
                    } else {
                      onSelect(record)
                    }
                  }}
                  className={`border-t border-gray-100 cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  {isSelectionMode && (
                    <td className="px-2 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelection(record.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                  )}
                  <td className="px-2 py-1.5 text-sm font-mono text-gray-700 whitespace-nowrap">
                    {record.breedingId || 'Sin ID'}
                  </td>
                  <td className="px-2 py-1.5 text-sm text-gray-700 whitespace-nowrap">
                    {record.breedingDate ? formatDate(record.breedingDate, 'dd MMM yy') : '-'}
                  </td>
                  <td className="px-2 py-1.5 text-sm whitespace-nowrap">
                    <span className="font-medium text-gray-900">{male?.animalNumber || '?'}</span>
                    {male && (
                      <span className="ml-1 text-xs text-gray-500">
                        {animals_types_labels[male.type]}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-sm text-center text-gray-700">
                    {record.femaleBreedingInfo.length}
                  </td>
                  <td className="px-2 py-1.5 text-sm whitespace-nowrap">
                    <span
                      className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium ${statusColor(status)}`}
                    >
                      {statusLabel(status)}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell px-2 py-1.5 text-sm text-gray-700 whitespace-nowrap">
                    {status.totalOffspring > 0 ? status.totalOffspring : '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default BreedingTable
