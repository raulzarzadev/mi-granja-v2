'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import React, { useEffect, useMemo, useState } from 'react'
import ModalRecordDetail from '@/components/ModalRecordDetail'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import {
  AnimalRecord,
  record_categories,
  record_category_colors,
  record_category_icons,
  record_category_labels,
  record_type_icons,
  record_type_labels,
  record_types,
} from '@/types/animals'

type URecord = AnimalRecord & { animalId: string; animalNumber: string }

type TableRow =
  | (URecord & { __isGrouped?: false })
  | (URecord & {
      __isGrouped: true
      __animals: Array<{ id: string; number: string }>
    })

const PAGE_SIZE = 20

type SortKey = 'date' | 'animal' | 'type' | 'application' | 'category' | 'title' | 'status'
type SortDir = 'asc' | 'desc'

// ─── Sort Arrow ───
const SortIcon: React.FC<{ active: boolean; dir: SortDir }> = ({ active, dir }) => (
  <svg
    className={`inline w-3 h-3 ml-0.5 ${active ? 'text-green-600' : 'text-gray-300'}`}
    viewBox="0 0 10 14"
    fill="currentColor"
  >
    <path
      d="M5 0L9.5 5H0.5L5 0Z"
      className={active && dir === 'asc' ? 'opacity-100' : 'opacity-30'}
    />
    <path
      d="M5 14L0.5 9H9.5L5 14Z"
      className={active && dir === 'desc' ? 'opacity-100' : 'opacity-30'}
    />
  </svg>
)

const RecordsTab: React.FC = () => {
  const { animals } = useAnimalCRUD()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [filters, setFilters] = useState({
    animalId: '',
    type: '' as AnimalRecord['type'] | '',
    category: '' as AnimalRecord['category'] | '',
    dateFrom: '',
    dateTo: '',
    search: '',
    application: '' as '' | 'bulk' | 'single',
  })
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [detailRecord, setDetailRecord] = useState<TableRow | null>(null)

  // ─── URL sync ───
  const filterKeys = ['animalId', 'type', 'category', 'from', 'to', 'q', 'app'] as const

  const readFiltersFromURL = (): typeof filters => {
    const p = searchParams
    return {
      animalId: p.get('animalId') || '',
      type: (p.get('type') as AnimalRecord['type'] | '') || '',
      category: (p.get('category') as AnimalRecord['category'] | '') || '',
      dateFrom: p.get('from') || '',
      dateTo: p.get('to') || '',
      search: p.get('q') || '',
      application: (p.get('app') as '' | 'bulk' | 'single') || '',
    }
  }

  const buildQueryFromFilters = (f: typeof filters) => {
    const q = new URLSearchParams(window.location.search)
    for (const k of filterKeys) q.delete(k)
    if (f.animalId) q.set('animalId', f.animalId)
    if (f.type) q.set('type', f.type)
    if (f.category) q.set('category', f.category)
    if (f.dateFrom) q.set('from', f.dateFrom)
    if (f.dateTo) q.set('to', f.dateTo)
    if (f.search) q.set('q', f.search)
    if (f.application) q.set('app', f.application)
    return q
  }

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
    const anyApplied = Object.values(urlFilters).some((v) => v)
    setFiltersOpen((open) => (anyApplied ? true : open))
  }, [searchParams])

  useEffect(() => {
    const q = buildQueryFromFilters(filters)
    const next = q.toString()
    const t = setTimeout(() => {
      const url = next ? `${pathname}?${next}` : pathname
      if (url !== `${window.location.pathname}${window.location.search}`) {
        window.history.replaceState({}, '', url)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [filters, pathname])

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [filters])

  // ─── Data pipeline ───
  const allRecords = useMemo(() => {
    const records: URecord[] = []
    animals.forEach((animal) => {
      if (animal.records) {
        animal.records.forEach((record) => {
          records.push({
            ...record,
            animalId: animal.id,
            animalNumber: animal.animalNumber || 'Sin número',
          })
        })
      }
      // Los registros de peso se incluyen desde animal.records[] (tipo 'weight')
      // creados por addWeightEntry en useAnimalCRUD
    })
    return records
  }, [animals])

  const filteredRecords = useMemo(() => {
    return allRecords.filter((record) => {
      if (filters.animalId && record.animalId !== filters.animalId) return false
      if (filters.type && record.type !== filters.type) return false
      if (filters.category && record.category !== filters.category) return false

      if (filters.application) {
        const looksBulk =
          !!record.isBulkApplication ||
          (Array.isArray(record.appliedToAnimals) && record.appliedToAnimals.length > 0)
        if (filters.application === 'bulk' && !looksBulk) return false
        if (filters.application === 'single' && looksBulk) return false
      }

      if (filters.dateFrom) {
        if (new Date(record.date) < new Date(filters.dateFrom)) return false
      }
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo)
        toDate.setHours(23, 59, 59, 999)
        if (new Date(record.date) > toDate) return false
      }

      if (filters.search) {
        const q = filters.search.trim().toLowerCase()
        const parts = [
          record.title,
          record.description || '',
          record.veterinarian || '',
          record.batch || '',
          record.treatment || '',
          record.animalNumber || '',
          record_category_labels[record.category],
          record_type_labels[record.type],
        ]
        if (!parts.join(' ').toLowerCase().includes(q)) return false
      }

      return true
    })
  }, [allRecords, filters])

  // Group bulk records
  const groupedRows: TableRow[] = useMemo(() => {
    const nonBulk: URecord[] = []
    const map = new Map<string, { rep: URecord; animals: Array<{ id: string; number: string }> }>()
    const dateKey = (d: Date | string) => new Date(d).toISOString().slice(0, 10)

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
          r.veterinarian || '',
        ].join('|')
        const entry = map.get(key)
        if (!entry) {
          map.set(key, { rep: r, animals: [{ id: r.animalId, number: r.animalNumber }] })
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
      __animals: g.animals,
    }))

    return [...nonBulk, ...bulkRows]
  }, [filteredRecords])

  // ─── Sorting ───
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'date' ? 'desc' : 'asc')
    }
  }

  const sortedRows = useMemo(() => {
    const rows = [...groupedRows]
    const dir = sortDir === 'asc' ? 1 : -1

    rows.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'date':
          cmp = new Date(a.date).getTime() - new Date(b.date).getTime()
          break
        case 'animal':
          cmp = (a.__isGrouped ? '' : a.animalNumber).localeCompare(
            b.__isGrouped ? '' : b.animalNumber,
          )
          break
        case 'type':
          cmp = (record_type_labels[a.type] || a.type || '').localeCompare(
            record_type_labels[b.type] || b.type || '',
          )
          break
        case 'application': {
          const aB = a.__isGrouped ? 1 : 0
          const bB = b.__isGrouped ? 1 : 0
          cmp = aB - bB
          break
        }
        case 'category':
          cmp = (record_category_labels[a.category] || a.category || '').localeCompare(
            record_category_labels[b.category] || b.category || '',
          )
          break
        case 'title':
          cmp = a.title.localeCompare(b.title)
          break
        case 'status': {
          const aS = a.isResolved ? 1 : 0
          const bS = b.isResolved ? 1 : 0
          cmp = aS - bS
          break
        }
      }
      return cmp * dir || new Date(b.date).getTime() - new Date(a.date).getTime()
    })

    return rows
  }, [groupedRows, sortKey, sortDir])

  // Paginated
  const visibleRows = sortedRows.slice(0, visibleCount)
  const hasMore = visibleCount < sortedRows.length

  const hasActiveFilters =
    filters.animalId !== '' ||
    filters.type !== '' ||
    filters.category !== '' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    filters.application !== ''

  const activeFilterCount = [
    filters.animalId,
    filters.type,
    filters.category,
    filters.dateFrom,
    filters.dateTo,
    filters.application,
  ].filter(Boolean).length

  const resetFilters = () => {
    setFilters({
      animalId: '',
      type: '',
      category: '',
      dateFrom: '',
      dateTo: '',
      search: '',
      application: '',
    })
  }

  const getAvailableCategories = () => {
    if (filters.type === 'note') return ['general', 'observation', 'other']
    if (filters.type === 'health')
      return record_categories.filter((c) => c !== 'general' && c !== 'observation')
    return record_categories
  }

  // Labels for active filter chips
  const getAnimalLabel = () => {
    const a = animals.find((x) => x.id === filters.animalId)
    return a ? `#${a.animalNumber}` : ''
  }

  const ThBtn: React.FC<{ k: SortKey; children: React.ReactNode; className?: string }> = ({
    k,
    children,
    className = '',
  }) => (
    <th
      className={`px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`}
    >
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className="inline-flex items-center gap-0.5 hover:text-gray-900 transition-colors"
      >
        {children}
        <SortIcon active={sortKey === k} dir={sortDir} />
      </button>
    </th>
  )

  return (
    <div className="space-y-4">
      {/* Filter bar — same style as Animals */}
      <div className="bg-white rounded-lg shadow">
        {/* Search + filter toggle + create */}
        <div className="px-4 py-3 flex items-center gap-2">
          <input
            type="text"
            placeholder="Buscar por titulo, animal, descripcion..."
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />

          {/* Clear button */}
          {(activeFilterCount > 0 || filters.search) && (
            <button
              onClick={resetFilters}
              className="p-2 rounded-lg border border-red-300 bg-red-50 hover:bg-red-100 transition-colors"
              title="Borrar filtros"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-5 h-5 text-red-500"
              >
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          )}

          {/* Filter toggle */}
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`relative p-2 rounded-lg border transition-colors ${
              filtersOpen || activeFilterCount > 0
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
            title="Filtros"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`w-5 h-5 ${filtersOpen || activeFilterCount > 0 ? 'text-green-600' : 'text-gray-500'}`}
            >
              <path
                fillRule="evenodd"
                d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 0 1 .628.74v2.288a2.25 2.25 0 0 1-.659 1.59l-4.682 4.683a2.25 2.25 0 0 0-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 0 1 8 18.25v-5.757a2.25 2.25 0 0 0-.659-1.591L2.659 6.22A2.25 2.25 0 0 1 2 4.629V2.34a.75.75 0 0 1 .628-.74Z"
                clipRule="evenodd"
              />
            </svg>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-green-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Create button */}
          <button
            onClick={() => router.push('/registro/nuevo')}
            className="p-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
            title="Nuevo Registro"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
          </button>
        </div>

        {/* Collapsible filters */}
        {filtersOpen && (
          <div className="px-4 pb-3 pt-1 border-t border-gray-100">
            {hasActiveFilters && (
              <div className="flex justify-end my-2">
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-3.5 h-3.5"
                  >
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                  Limpiar filtros
                </button>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <select
                value={filters.type}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    type: e.target.value as AnimalRecord['type'] | '',
                    category: '',
                  }))
                }
                className={`px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  filters.type ? 'border-green-500 bg-green-50 text-green-800' : 'border-gray-300'
                }`}
              >
                <option value="">Tipo: Todos</option>
                {record_types.map((type) => (
                  <option key={type} value={type}>
                    {record_type_icons[type]} {record_type_labels[type]}
                  </option>
                ))}
              </select>

              <select
                value={filters.category}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    category: e.target.value as AnimalRecord['category'] | '',
                  }))
                }
                className={`px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  filters.category
                    ? 'border-green-500 bg-green-50 text-green-800'
                    : 'border-gray-300'
                }`}
              >
                <option value="">Categoria: Todas</option>
                {getAvailableCategories().map((c) => (
                  <option key={c} value={c}>
                    {record_category_icons[c as keyof typeof record_category_icons]}{' '}
                    {record_category_labels[c as keyof typeof record_category_labels]}
                  </option>
                ))}
              </select>

              <select
                value={filters.animalId}
                onChange={(e) => setFilters((prev) => ({ ...prev, animalId: e.target.value }))}
                className={`px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  filters.animalId
                    ? 'border-green-500 bg-green-50 text-green-800'
                    : 'border-gray-300'
                }`}
              >
                <option value="">Animal: Todos</option>
                {animals.map((a) => (
                  <option key={a.id} value={a.id}>
                    #{a.animalNumber || 'Sin número'}
                  </option>
                ))}
              </select>

              <select
                value={filters.application}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    application: e.target.value as '' | 'bulk' | 'single',
                  }))
                }
                className={`px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  filters.application
                    ? 'border-green-500 bg-green-50 text-green-800'
                    : 'border-gray-300'
                }`}
              >
                <option value="">Aplicacion: Todas</option>
                <option value="bulk">Masivo</option>
                <option value="single">Individual</option>
              </select>

              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                placeholder="Desde"
                className={`px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  filters.dateFrom
                    ? 'border-green-500 bg-green-50 text-green-800'
                    : 'border-gray-300'
                }`}
              />

              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                placeholder="Hasta"
                className={`px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  filters.dateTo ? 'border-green-500 bg-green-50 text-green-800' : 'border-gray-300'
                }`}
              />
            </div>
          </div>
        )}

        {/* Active chips + count */}
        <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {filters.type && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {record_type_icons[filters.type]} {record_type_labels[filters.type] || filters.type}
              </span>
            )}
            {filters.category && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                {record_category_icons[filters.category]} {record_category_labels[filters.category]}
              </span>
            )}
            {filters.animalId && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {getAnimalLabel()}
              </span>
            )}
            {filters.application && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                {filters.application === 'bulk' ? 'Masivo' : 'Individual'}
              </span>
            )}
            {filters.dateFrom && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                Desde: {filters.dateFrom}
              </span>
            )}
            {filters.dateTo && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                Hasta: {filters.dateTo}
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500 whitespace-nowrap">
            <span className="font-semibold text-gray-700">{sortedRows.length}</span> registros
          </span>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {sortedRows.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-2">📋</div>
            <p>No se encontraron registros con los filtros aplicados</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <ThBtn k="date">Fecha</ThBtn>
                    <ThBtn k="animal">Animal</ThBtn>
                    <ThBtn k="type">Tipo</ThBtn>
                    <ThBtn k="application">Aplicacion</ThBtn>
                    <ThBtn k="category">Categoria</ThBtn>
                    <ThBtn k="title">Titulo</ThBtn>
                    <ThBtn k="status">Estado</ThBtn>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {visibleRows.map((record) => {
                    const isBulk = record.__isGrouped
                    const clinicalCats = ['illness', 'injury', 'treatment', 'surgery']
                    const showStatus =
                      record.type === 'health' && clinicalCats.includes(record.category)

                    return (
                      <tr
                        key={`${record.id}-${isBulk ? 'g' : record.animalId}`}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => setDetailRecord(record)}
                      >
                        {/* Fecha */}
                        <td className="px-3 py-2.5 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(record.date), 'dd/MM/yyyy', { locale: es })}
                        </td>

                        {/* Animal */}
                        <td className="px-3 py-2.5 text-sm">
                          {isBulk ? (
                            <div>
                              <div className="flex flex-wrap gap-1">
                                {record.__animals.slice(0, 4).map((a) => (
                                  <span
                                    key={a.id}
                                    className="inline-flex px-1.5 py-0.5 rounded text-[11px] bg-blue-50 text-blue-700"
                                  >
                                    #{a.number}
                                  </span>
                                ))}
                                {record.__animals.length > 4 && (
                                  <span className="text-[11px] text-gray-400 self-center">
                                    +{record.__animals.length - 4}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="font-medium text-gray-900">
                              #{record.animalNumber}
                            </span>
                          )}
                        </td>

                        {/* Tipo */}
                        <td className="px-3 py-2.5 whitespace-nowrap text-sm">
                          <span className="inline-flex items-center gap-1">
                            <span>{record_type_icons[record.type] || '📄'}</span>
                            <span className="text-gray-700">
                              {record_type_labels[record.type] || record.type || '—'}
                            </span>
                          </span>
                        </td>

                        {/* Aplicacion */}
                        <td className="px-3 py-2.5 whitespace-nowrap text-xs">
                          {isBulk ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              Masivo ({record.__animals.length})
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 border border-gray-200">
                              Individual
                            </span>
                          )}
                        </td>

                        {/* Categoria */}
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                              record_category_colors[record.category]
                            }`}
                          >
                            {record_category_icons[record.category]}{' '}
                            {record_category_labels[record.category]}
                          </span>
                        </td>

                        {/* Titulo */}
                        <td className="px-3 py-2.5 text-sm text-gray-900">
                          <div className="max-w-xs truncate" title={record.title}>
                            {record.title}
                          </div>
                          {record.description && (
                            <div
                              className="max-w-xs truncate text-xs text-gray-400"
                              title={record.description}
                            >
                              {record.description}
                            </div>
                          )}
                        </td>

                        {/* Estado */}
                        <td className="px-3 py-2.5 whitespace-nowrap text-sm">
                          {showStatus ? (
                            <span
                              className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                record.isResolved
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {record.isResolved ? '✅ Resuelto' : '⏳ Activo'}
                            </span>
                          ) : record.nextDueDate ? (
                            <span className="text-xs text-orange-600">
                              Prox:{' '}
                              {format(new Date(record.nextDueDate), 'dd/MM/yy', { locale: es })}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="px-4 py-3 border-t bg-gray-50 text-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Cargar {Math.min(PAGE_SIZE, sortedRows.length - visibleCount)} más de{' '}
                  {sortedRows.length - visibleCount} restantes
                </button>
              </div>
            )}

            {/* Row count */}
            <div className="px-4 py-2 border-t text-xs text-gray-400 text-right">
              Mostrando {visibleRows.length} de {sortedRows.length}
            </div>
          </>
        )}
      </div>

      <ModalRecordDetail
        isOpen={!!detailRecord}
        onClose={() => setDetailRecord(null)}
        record={detailRecord}
        animals={animals}
      />
    </div>
  )
}

export default RecordsTab
