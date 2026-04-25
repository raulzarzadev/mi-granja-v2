'use client'

import React, { useEffect, useMemo, useState } from 'react'
import ModalSaleForm from '@/components/ModalSaleForm'
import SaleCard, { getTotalAmount, getTotalWeight } from '@/components/SaleCard'
import { useSalesCRUD } from '@/hooks/useSalesCRUD'
import {
  Sale,
  SaleStatus,
  sale_price_type_labels,
  sale_status_colors,
  sale_status_icons,
  sale_status_labels,
  sale_statuses,
} from '@/types/sales'

const formatPrice = (centavos?: number) => {
  if (!centavos) return '—'
  return `$${(centavos / 100).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
}

const formatDate = (date?: Date | string) => {
  if (!date) return '—'
  const d = new Date(date)
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

const formatWeight = (grams: number) => {
  if (!grams) return '—'
  return `${(grams / 1000).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`
}

type SortKey = 'status' | 'date' | 'animals' | 'pricePerKg' | 'weight' | 'total' | 'buyer'
type SortDir = 'asc' | 'desc'

const sort_labels: Record<SortKey, string> = {
  status: 'Estado',
  date: 'Fecha',
  animals: 'Animales',
  pricePerKg: '$/kg',
  weight: 'Peso',
  total: 'Total',
  buyer: 'Comprador',
}

const SalesTab: React.FC = () => {
  const { sales, getFarmSales } = useSalesCRUD()
  const [statusFilter, setStatusFilter] = useState<SaleStatus | ''>('')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | undefined>()
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  useEffect(() => {
    const unsub = getFarmSales()
    return () => unsub?.()
  }, [])

  const filteredSales = useMemo(() => {
    const base = statusFilter ? sales.filter((s) => s.status === statusFilter) : sales
    const dir = sortDir === 'asc' ? 1 : -1
    const getVal = (s: Sale): number | string => {
      switch (sortKey) {
        case 'status':
          return s.status
        case 'date':
          return s.date ? new Date(s.date).getTime() : 0
        case 'animals':
          return s.animals.length
        case 'pricePerKg':
          return s.pricePerKg || 0
        case 'weight':
          return getTotalWeight(s)
        case 'total':
          return getTotalAmount(s)
        case 'buyer':
          return (s.buyer || '').toLowerCase()
      }
    }
    return [...base].sort((a, b) => {
      const va = getVal(a)
      const vb = getVal(b)
      if (va < vb) return -1 * dir
      if (va > vb) return 1 * dir
      return 0
    })
  }, [sales, statusFilter, sortKey, sortDir])

  const handleOpenCreate = () => {
    setSelectedSale(undefined)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (sale: Sale) => {
    setSelectedSale(sale)
    setIsModalOpen(true)
  }

  const handleClose = () => {
    setIsModalOpen(false)
    setSelectedSale(undefined)
  }

  const countByStatus = (status: SaleStatus) => sales.filter((s) => s.status === status).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Ventas</h2>
        <div className="flex items-center gap-2">
          {/* Toggle vista */}
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 transition-colors ${
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
              onClick={() => setViewMode('table')}
              className={`p-1.5 transition-colors ${
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
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
          >
            + Nueva Venta
          </button>
        </div>
      </div>

      {/* Filtro por status */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter('')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            statusFilter === ''
              ? 'bg-gray-800 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Todas ({sales.length})
        </button>
        {sale_statuses.map((s) => {
          const count = countByStatus(s)
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                statusFilter === s
                  ? sale_status_colors[s]
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {sale_status_icons[s]} {sale_status_labels[s]} ({count})
            </button>
          )
        })}
      </div>

      {/* Contenido */}
      {filteredSales.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-5xl mb-4 block">💲</span>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {sales.length === 0
              ? 'No hay ventas registradas'
              : 'No se encontraron ventas con este filtro'}
          </h3>
          <p className="text-gray-600 mb-4">
            {sales.length === 0
              ? 'Registra tu primera venta para comenzar'
              : 'Intenta ajustar el filtro'}
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        <>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <label htmlFor="sales-sort-key" className="font-medium">
              Ordenar por:
            </label>
            <select
              id="sales-sort-key"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="px-2 py-1 border border-gray-300 rounded bg-white cursor-pointer"
            >
              {(Object.keys(sort_labels) as SortKey[]).map((k) => (
                <option key={k} value={k}>
                  {sort_labels[k]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              className="px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-pointer"
              title={sortDir === 'asc' ? 'Ascendente' : 'Descendente'}
            >
              {sortDir === 'asc' ? '↑ Asc' : '↓ Desc'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredSales.map((sale) => (
              <SaleCard key={sale.id} sale={sale} onClick={() => handleOpenEdit(sale)} />
            ))}
          </div>
        </>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <SortableTh
                    label="Estado"
                    sortKey="status"
                    currentKey={sortKey}
                    dir={sortDir}
                    onClick={toggleSort}
                    align="left"
                  />
                  <SortableTh
                    label="Fecha"
                    sortKey="date"
                    currentKey={sortKey}
                    dir={sortDir}
                    onClick={toggleSort}
                    align="left"
                  />
                  <SortableTh
                    label="Animales"
                    sortKey="animals"
                    currentKey={sortKey}
                    dir={sortDir}
                    onClick={toggleSort}
                    align="right"
                  />
                  <SortableTh
                    label="$/kg"
                    sortKey="pricePerKg"
                    currentKey={sortKey}
                    dir={sortDir}
                    onClick={toggleSort}
                    align="right"
                  />
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Tipo</th>
                  <SortableTh
                    label="Peso"
                    sortKey="weight"
                    currentKey={sortKey}
                    dir={sortDir}
                    onClick={toggleSort}
                    align="right"
                  />
                  <SortableTh
                    label="Total"
                    sortKey="total"
                    currentKey={sortKey}
                    dir={sortDir}
                    onClick={toggleSort}
                    align="right"
                  />
                  <SortableTh
                    label="Comprador"
                    sortKey="buyer"
                    currentKey={sortKey}
                    dir={sortDir}
                    onClick={toggleSort}
                    align="left"
                  />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSales.map((sale) => {
                  const totalWeight = getTotalWeight(sale)
                  const totalAmount = getTotalAmount(sale)
                  return (
                    <tr
                      key={sale.id}
                      onClick={() => handleOpenEdit(sale)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sale_status_colors[sale.status]}`}
                        >
                          {sale_status_icons[sale.status]} {sale_status_labels[sale.status]}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                        {formatDate(sale.date)}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700">{sale.animals.length}</td>
                      <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap">
                        {formatPrice(sale.pricePerKg)}
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-xs">
                        {sale_price_type_labels[sale.priceType || 'en_pie']}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap">
                        {formatWeight(totalWeight)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900 whitespace-nowrap">
                        {formatPrice(totalAmount)}
                      </td>
                      <td className="px-3 py-2 text-gray-600 truncate max-w-[120px]">
                        {sale.buyer || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <ModalSaleForm isOpen={isModalOpen} onClose={handleClose} sale={selectedSale} />
    </div>
  )
}

interface SortableThProps {
  label: string
  sortKey: SortKey
  currentKey: SortKey
  dir: SortDir
  onClick: (key: SortKey) => void
  align?: 'left' | 'right'
}

const SortableTh: React.FC<SortableThProps> = ({
  label,
  sortKey,
  currentKey,
  dir,
  onClick,
  align = 'left',
}) => {
  const active = currentKey === sortKey
  const arrow = active ? (dir === 'asc' ? '↑' : '↓') : ''
  return (
    <th
      className={`px-3 py-2 ${align === 'right' ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 select-none`}
    >
      <button
        type="button"
        onClick={() => onClick(sortKey)}
        className={`inline-flex items-center gap-1 cursor-pointer hover:text-gray-700 ${active ? 'text-gray-900' : ''}`}
      >
        <span>{label}</span>
        <span className="w-3 text-gray-400">{arrow}</span>
      </button>
    </th>
  )
}

export default SalesTab
