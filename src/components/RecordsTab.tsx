'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import {
  AnimalRecord,
  record_category_labels,
  record_category_icons,
  record_category_colors,
  record_type_labels,
  record_categories,
  record_types,
  record_severity_labels
} from '@/types/animals'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

const RecordsTab: React.FC = () => {
  const { animals } = useAnimalCRUD()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Estados para filtros
  const [filters, setFilters] = useState({
    animalId: '',
    type: '' as AnimalRecord['type'] | '',
    category: '' as AnimalRecord['category'] | '',
    dateFrom: '',
    dateTo: '',
    search: ''
  })
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Helpers: leer/escribir filtros en la URL
  const readFiltersFromURL = (): typeof filters => {
    const p = searchParams
    return {
      animalId: p.get('animalId') || '',
      type: (p.get('type') as AnimalRecord['type'] | '') || '',
      category: (p.get('category') as AnimalRecord['category'] | '') || '',
      dateFrom: p.get('from') || '',
      dateTo: p.get('to') || '',
      search: p.get('q') || ''
    }
  }

  const buildQueryFromFilters = (f: typeof filters) => {
    const q = new URLSearchParams()
    if (f.animalId) q.set('animalId', f.animalId)
    if (f.type) q.set('type', f.type)
    if (f.category) q.set('category', f.category)
    if (f.dateFrom) q.set('from', f.dateFrom)
    if (f.dateTo) q.set('to', f.dateTo)
    if (f.search) q.set('q', f.search)
    return q
  }

  // Inicializar filtros desde la URL en el primer render y cuando cambien los query params externamente
  useEffect(() => {
    const urlFilters = readFiltersFromURL()
    setFilters((prev) => {
      const same =
        prev.animalId === urlFilters.animalId &&
        prev.type === urlFilters.type &&
        prev.category === urlFilters.category &&
        prev.dateFrom === urlFilters.dateFrom &&
        prev.dateTo === urlFilters.dateTo &&
        prev.search === urlFilters.search
      return same ? prev : urlFilters
    })
    // Abrir los filtros si hay alguno aplicado
    const anyApplied = Object.values(urlFilters).some((v) => v)
    setFiltersOpen((open) => (anyApplied ? true : open))
  }, [searchParams])

  // Actualizar la URL cuando cambien los filtros (debounce ligero)
  useEffect(() => {
    const q = buildQueryFromFilters(filters)
    const next = q.toString()
    const curr = searchParams.toString()
    if (next === curr) return
    const t = setTimeout(() => {
      router.replace(next ? `${pathname}?${next}` : pathname)
    }, 250)
    return () => clearTimeout(t)
  }, [filters, pathname, router, searchParams])

  // Consolidar todos los registros de todos los animales
  type URecord = AnimalRecord & { animalId: string; animalNumber: string }

  const allRecords = useMemo(() => {
    const records: Array<URecord> = []

    animals.forEach((animal) => {
      if (animal.records) {
        animal.records.forEach((record) => {
          records.push({
            ...record,
            animalId: animal.id,
            animalNumber: animal.animalNumber || 'Sin número'
          })
        })
      }
    })

    // Ordenar por fecha descendente
    return records.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [animals])

  // Aplicar filtros
  const filteredRecords = useMemo(() => {
    return allRecords.filter((record) => {
      // Filtro por animal
      if (filters.animalId && record.animalId !== filters.animalId) return false

      // Filtro por tipo
      if (filters.type && record.type !== filters.type) return false

      // Filtro por categoría
      if (filters.category && record.category !== filters.category) return false

      // Filtro por rango de fechas
      if (filters.dateFrom) {
        const recordDate = new Date(record.date)
        const fromDate = new Date(filters.dateFrom)
        if (recordDate < fromDate) return false
      }

      if (filters.dateTo) {
        const recordDate = new Date(record.date)
        const toDate = new Date(filters.dateTo)
        toDate.setHours(23, 59, 59, 999) // Include the entire day
        if (recordDate > toDate) return false
      }

      // Filtro por búsqueda en título y descripción
      if (filters.search) {
        const searchLower = filters.search.trim().toLowerCase()
        const clinicalCats = [
          'illness',
          'injury',
          'treatment',
          'surgery'
        ] as const
        const statusLabel =
          record.type === 'health' &&
          clinicalCats.includes(record.category as any)
            ? record.isResolved
              ? 'resuelto'
              : 'activo'
            : ''
        const looksBulk =
          !!record.isBulkApplication ||
          (Array.isArray(record.appliedToAnimals) &&
            record.appliedToAnimals.length > 0)
        const severity = (record as any).severity as
          | undefined
          | keyof typeof record_severity_labels
        const severityLabel = severity ? record_severity_labels[severity] : ''
        const dateStr = (() => {
          try {
            return format(new Date(record.date), 'dd/MM/yyyy', { locale: es })
          } catch {
            return ''
          }
        })()
        const nextDueStr = (() => {
          try {
            return record.nextDueDate
              ? format(new Date(record.nextDueDate), 'dd/MM/yyyy', {
                  locale: es
                })
              : ''
          } catch {
            return ''
          }
        })()

        const parts = [
          record.title,
          record.description || '',
          record.veterinarian || '',
          record.batch || '',
          record.treatment || '',
          record.notes || '',
          record.animalNumber || '',
          record_category_labels[record.category],
          record_type_labels[record.type],
          statusLabel,
          severityLabel,
          dateStr,
          nextDueStr
        ]
        // Indicador textual de masivo/individual para búsqueda
        parts.push(looksBulk ? 'masivo' : 'individual')
        const haystack = parts.join(' | ').toLowerCase()
        if (!haystack.includes(searchLower)) return false
      }

      return true
    })
  }, [allRecords, filters])

  // Agrupar eventos masivos: una fila por evento con lista de animales
  type TableRow =
    | (URecord & { __isGrouped?: false })
    | (URecord & {
        __isGrouped: true
        __animals: Array<{ id: string; number: string }>
      })

  const groupedRows: TableRow[] = useMemo(() => {
    const nonBulk: URecord[] = []
    const map = new Map<
      string,
      { rep: URecord; animals: Array<{ id: string; number: string }> }
    >()

    const dateKey = (d: Date | string) => new Date(d).toISOString().slice(0, 10) // yyyy-MM-dd

    for (const r of filteredRecords) {
      const looksBulk =
        !!r.isBulkApplication ||
        (Array.isArray(r.appliedToAnimals) && r.appliedToAnimals.length > 0)
      if (looksBulk) {
        const key = [
          r.type,
          r.category,
          dateKey(r.date),
          r.title,
          r.batch || '',
          r.veterinarian || ''
        ].join('|')
        const entry = map.get(key)
        if (!entry) {
          map.set(key, {
            rep: r,
            animals: [{ id: r.animalId, number: r.animalNumber }]
          })
        } else {
          if (!entry.animals.some((a) => a.id === r.animalId)) {
            entry.animals.push({ id: r.animalId, number: r.animalNumber })
          }
        }
      } else {
        nonBulk.push(r)
      }
    }

    const bulkRows: TableRow[] = Array.from(map.values()).map((g) => ({
      ...g.rep,
      __isGrouped: true as const,
      __animals: g.animals
    }))

    const rows: TableRow[] = [...nonBulk, ...bulkRows]
    return rows.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [filteredRecords])

  const resetFilters = () => {
    setFilters({
      animalId: '',
      type: '',
      category: '',
      dateFrom: '',
      dateTo: '',
      search: ''
    })
  }

  const getAvailableCategories = () => {
    if (filters.type === 'note') {
      return ['general', 'observation', 'other']
    }
    if (filters.type === 'health') {
      return record_categories.filter(
        (c) => c !== 'general' && c !== 'observation'
      )
    }
    return record_categories
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          📋 Registros ({groupedRows.length})
        </h2>
        <button
          onClick={resetFilters}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Limpiar filtros
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow">
        <div className="flex items-center justify-between p-4">
          <h3 className="text-lg font-medium">Filtros</h3>
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="text-sm text-blue-600 hover:text-blue-800"
            aria-expanded={filtersOpen}
            aria-controls="filters-panel"
          >
            {filtersOpen ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
        <div
          id="filters-panel"
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            filtersOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
          }`}
          aria-hidden={!filtersOpen}
        >
          <div className="p-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {/* Animal */}
              <div>
                <label className="block text-sm font-medium mb-1">Animal</label>
                <select
                  value={filters.animalId}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      animalId: e.target.value
                    }))
                  }
                  className="w-full border rounded-lg px-2 py-1.5 text-sm"
                >
                  <option value="">Todos</option>
                  {animals.map((animal) => (
                    <option key={animal.id} value={animal.id}>
                      {animal.animalNumber || 'Sin número'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <select
                  value={filters.type}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      type: e.target.value as AnimalRecord['type'] | '',
                      category: '' // Reset category when type changes
                    }))
                  }
                  className="w-full border rounded-lg px-2 py-1.5 text-sm"
                >
                  <option value="">Todos</option>
                  {record_types.map((type) => (
                    <option key={type} value={type}>
                      {record_type_labels[type]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Categoría
                </label>
                <select
                  value={filters.category}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      category: e.target.value as AnimalRecord['category'] | ''
                    }))
                  }
                  className="w-full border rounded-lg px-2 py-1.5 text-sm"
                >
                  <option value="">Todas</option>
                  {getAvailableCategories().map((category) => (
                    <option key={category} value={category}>
                      {
                        record_category_icons[
                          category as keyof typeof record_category_icons
                        ]
                      }{' '}
                      {
                        record_category_labels[
                          category as keyof typeof record_category_labels
                        ]
                      }
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha desde */}
              <div>
                <label className="block text-sm font-medium mb-1">Desde</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      dateFrom: e.target.value
                    }))
                  }
                  className="w-full border rounded-lg px-2 py-1.5 text-sm"
                />
              </div>

              {/* Fecha hasta */}
              <div>
                <label className="block text-sm font-medium mb-1">Hasta</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, dateTo: e.target.value }))
                  }
                  className="w-full border rounded-lg px-2 py-1.5 text-sm"
                />
              </div>

              {/* Búsqueda */}
              <div>
                <label className="block text-sm font-medium mb-1">Buscar</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                  placeholder="Título o descripción..."
                  className="w-full border rounded-lg px-2 py-1.5 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de registros */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {groupedRows.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-2">📋</div>
            <p>No se encontraron registros con los filtros aplicados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Animal
                  </th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aplicación
                  </th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Título
                  </th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Próximo
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {groupedRows.map((record) => (
                  <tr
                    key={`${record.id}-${
                      record.__isGrouped ? 'g' : record.animalId
                    }`}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(record.date), 'dd/MM/yyyy', {
                        locale: es
                      })}
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {record.__isGrouped ? (
                        <div className="max-w-sm">
                          <div className="mb-1">
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              💠 Masivo
                            </span>
                          </div>
                          <div className="text-gray-700 ">
                            Aplicado a{' '}
                            <span className="text-xs text-gray-500">
                              ({record.__animals.length || 0})
                            </span>
                            :
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {(record.__animals || []).slice(0, 5).map((a) => (
                              <span
                                key={a.id}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700"
                              >
                                #{a.number}
                              </span>
                            ))}
                            {record.__animals &&
                              record.__animals.length > 5 && (
                                <span className="text-xs text-gray-500">
                                  y {record.__animals.length - 5} más
                                </span>
                              )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-700 border border-gray-200">
                            ● Individual
                          </span>
                          <span>{(record as URecord).animalNumber}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-xs">
                      {record.__isGrouped ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          💠 Masivo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 text-gray-700 border border-gray-200">
                          ● Individual
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          record_category_colors[record.category]
                        }`}
                      >
                        {record_category_icons[record.category]}{' '}
                        {record_category_labels[record.category]}
                      </span>
                    </td>
                    <td className="px-2 py-1 text-sm text-gray-900">
                      <div className="max-w-xs truncate" title={record.title}>
                        {record.title}
                      </div>
                    </td>
                    <td className="px-2 py-1 text-sm text-gray-500">
                      <div
                        className="max-w-xs truncate"
                        title={record.description || ''}
                      >
                        {record.description || '-'}
                      </div>
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-sm">
                      {record.type === 'health' &&
                      ['illness', 'injury', 'treatment', 'surgery'].includes(
                        record.category
                      ) ? (
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            record.isResolved
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {record.isResolved ? '✅ Resuelto' : '⏳ Activo'}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-500">
                      {record.nextDueDate ? (
                        <span className="text-orange-600">
                          {format(new Date(record.nextDueDate), 'dd/MM/yyyy', {
                            locale: es
                          })}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default RecordsTab
