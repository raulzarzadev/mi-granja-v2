'use client'

import React, { useMemo, useState } from 'react'

// ── Types ──

export interface ColumnDef<T> {
  key: string
  label: string
  render: (row: T) => React.ReactNode
  sortable?: boolean
  sortFn?: (a: T, b: T) => number
  headerClassName?: string
  className?: string
  /** Ancho fijo CSS para la columna (ej: '80px', '10%'). Si se define, la tabla usa table-fixed. */
  width?: string
}

export interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  rowKey: (row: T) => string
  renderActions?: (row: T) => React.ReactNode
  sessionStorageKey?: string
  onRowClick?: (row: T) => void
  selectable?: boolean
  renderBulkActions?: (selectedIds: Set<string>, clearSelection: () => void) => React.ReactNode
  defaultSortKey?: string
  defaultSortDir?: 'asc' | 'desc'
  emptyMessage?: string
  title?: React.ReactNode
  /** Extra buttons rendered in the header bar (e.g. "Nuevo Empadre") */
  toolbar?: React.ReactNode
  /** If provided, enables card/table view toggle. Renders each item as a card. */
  renderCard?: (row: T) => React.ReactNode
  /** Persist view mode preference key for localStorage */
  viewModeKey?: string
  /** Page size (default 10). Set to 0 to disable pagination. */
  pageSize?: number
  /** If provided, adds a default "Ver" button in actions that calls this with the row */
  onView?: (row: T) => React.ReactNode
}

// ── Sort Icon ──

const SortIcon = ({ direction }: { direction: 'asc' | 'desc' | null }) => {
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

// ── Component ──

function DataTable<T>({
  data,
  columns,
  rowKey,
  renderActions,
  sessionStorageKey,
  onRowClick,
  selectable = true,
  renderBulkActions,
  defaultSortKey,
  defaultSortDir = 'asc',
  emptyMessage = 'No hay datos.',
  title,
  toolbar,
  renderCard,
  viewModeKey,
  pageSize: initialPageSize = 10,
  onView,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey ?? null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSortDir)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(() => {
    if (!renderCard || !viewModeKey || typeof window === 'undefined') return 'table'
    try {
      return (localStorage.getItem(`mg_pref_${viewModeKey}`) as 'table' | 'cards') || 'table'
    } catch {
      return 'table'
    }
  })

  const handleViewMode = (mode: 'table' | 'cards') => {
    setViewMode(mode)
    if (viewModeKey) {
      try {
        localStorage.setItem(`mg_pref_${viewModeKey}`, mode)
      } catch {}
    }
  }
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastClickedId, setLastClickedId] = useState<string | null>(() => {
    if (!sessionStorageKey || typeof window === 'undefined') return null
    try {
      return sessionStorage.getItem(sessionStorageKey)
    } catch {
      return null
    }
  })

  const handleSort = (col: ColumnDef<T>) => {
    if (!col.sortable || !col.sortFn) return
    if (sortKey === col.key) {
      if (sortDir === 'asc') {
        setSortDir('desc')
      } else {
        setSortKey(null)
        setSortDir('asc')
      }
    } else {
      setSortKey(col.key)
      setSortDir('asc')
    }
  }

  const sortedData = useMemo(() => {
    const activeCol = columns.find((c) => c.key === sortKey)
    if (!activeCol?.sortFn) return data
    const sorted = [...data].sort(activeCol.sortFn)
    return sortDir === 'desc' ? sorted.reverse() : sorted
  }, [data, sortKey, sortDir, columns])

  // Pagination
  const totalPages = pageSize > 0 ? Math.ceil(sortedData.length / pageSize) : 1
  const safePage = Math.min(page, Math.max(totalPages - 1, 0))
  if (safePage !== page) setPage(safePage)
  const paginatedData =
    pageSize > 0
      ? sortedData.slice(safePage * pageSize, safePage * pageSize + pageSize)
      : sortedData
  const start = safePage * pageSize + 1
  const end = Math.min(safePage * pageSize + pageSize, sortedData.length)

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
    setIsSelectionMode(false)
  }

  const handleRowClick = (row: T) => {
    const id = rowKey(row)
    if (isSelectionMode) {
      toggleSelection(id)
      return
    }
    if (sessionStorageKey) {
      setLastClickedId(id)
      try {
        sessionStorage.setItem(sessionStorageKey, id)
      } catch {}
    }
    onRowClick?.(row)
  }

  const thClass = (col: ColumnDef<T>) =>
    [
      'px-2 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap',
      col.sortable ? 'cursor-pointer select-none hover:bg-gray-100 transition-colors' : '',
      col.headerClassName ?? '',
    ]
      .filter(Boolean)
      .join(' ')

  return (
    <div>
      {/* Header bar: title + pagination + view toggle + toolbar */}
      {(title || toolbar || renderCard) && (
        <div className="px-2 py-2 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {title &&
              (typeof title === 'string' ? (
                <h3 className="text-lg font-semibold">{title}</h3>
              ) : (
                title
              ))}
          </div>
          <div className="flex items-center gap-2">
            {toolbar}
            {/* Pagination */}
            {renderCard && (
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => handleViewMode('cards')}
                  className={`p-1.5 transition-colors cursor-pointer ${
                    viewMode === 'cards'
                      ? 'bg-green-100 text-green-700'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                  title="Vista de tarjetas"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.25 2A2.25 2.25 0 0 0 2 4.25v2.5A2.25 2.25 0 0 0 4.25 9h2.5A2.25 2.25 0 0 0 9 6.75v-2.5A2.25 2.25 0 0 0 6.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 2 13.25v2.5A2.25 2.25 0 0 0 4.25 18h2.5A2.25 2.25 0 0 0 9 15.75v-2.5A2.25 2.25 0 0 0 6.75 11h-2.5Zm9-9A2.25 2.25 0 0 0 11 4.25v2.5A2.25 2.25 0 0 0 13.25 9h2.5A2.25 2.25 0 0 0 18 6.75v-2.5A2.25 2.25 0 0 0 15.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 11 13.25v2.5A2.25 2.25 0 0 0 13.25 18h2.5A2.25 2.25 0 0 0 18 15.75v-2.5A2.25 2.25 0 0 0 15.75 11h-2.5Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => handleViewMode('table')}
                  className={`p-1.5 transition-colors cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-green-100 text-green-700'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                  title="Vista de tabla"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      fillRule="evenodd"
                      d="M2 3.75A.75.75 0 0 1 2.75 3h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 3.75Zm0 4.167a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Zm0 4.166a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Zm0 4.167a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            )}
            {pageSize > 0 && sortedData.length > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setPage(0)
                  }}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm cursor-pointer"
                >
                  {[10, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <span className="text-xs">
                  {start}–{end} de <strong className="text-gray-700">{sortedData.length}</strong>
                </span>
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={safePage === 0}
                    className="p-1.5 px-3 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={safePage >= totalPages - 1}
                    className="p-1.5 px-3 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Selection toolbar */}
      {selectable && (
        <div className="px-2 py-2 flex items-center gap-2 text-xs flex-wrap">
          {!isSelectionMode ? (
            <button
              onClick={() => setIsSelectionMode(true)}
              className="text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
            >
              Seleccionar
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setSelectedIds(new Set(sortedData.map((r) => rowKey(r))))
                }}
                className="text-green-600 hover:text-green-800 transition-colors cursor-pointer"
              >
                Todos ({sortedData.length})
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={clearSelection}
                className="text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              {selectedIds.size > 0 && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="text-gray-500">{selectedIds.size} seleccionados</span>
                  {renderBulkActions?.(selectedIds, clearSelection)}
                </>
              )}
            </>
          )}
        </div>
      )}

      {sortedData.length === 0 ? (
        <p className="text-sm text-gray-500 p-4">{emptyMessage}</p>
      ) : renderCard && viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
          {paginatedData.map((row) => (
            <div key={rowKey(row)}>{renderCard(row)}</div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {isSelectionMode && <th className="w-8 px-2 py-2" />}
                {columns.map((col) => (
                  <th key={col.key} onClick={() => handleSort(col)} className={thClass(col)}>
                    <span className="inline-flex items-center gap-0.5">
                      {col.label}
                      {col.sortable && (
                        <SortIcon direction={sortKey === col.key ? sortDir : null} />
                      )}
                    </span>
                  </th>
                ))}
                {(renderActions || onView) && !isSelectionMode && (
                  <th className="px-2 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row) => {
                const id = rowKey(row)
                const isSelected = selectedIds.has(id)
                return (
                  <tr
                    key={id}
                    onClick={() => handleRowClick(row)}
                    className={[
                      'border-t border-gray-100 transition-colors',
                      onRowClick || isSelectionMode ? 'cursor-pointer' : '',
                      isSelected
                        ? 'bg-blue-50'
                        : lastClickedId === id
                          ? 'bg-blue-100 hover:bg-blue-200'
                          : 'hover:bg-gray-50',
                    ].join(' ')}
                  >
                    {isSelectionMode && (
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelection(id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className={`px-2 py-1.5 text-sm whitespace-nowrap ${col.className ?? ''}`}>
                        {col.render(row)}
                      </td>
                    ))}
                    {(renderActions || onView) && !isSelectionMode && (
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">
                        <div
                          className="inline-flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {onView?.(row)}
                          {renderActions?.(row)}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

DataTable.displayName = 'DataTable'
export default DataTable
