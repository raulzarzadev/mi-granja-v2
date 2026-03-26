'use client'

import React from 'react'
import {
  Sale,
  sale_price_type_labels,
  sale_status_colors,
  sale_status_icons,
  sale_status_labels,
} from '@/types/sales'

interface SaleCardProps {
  sale: Sale
  onClick?: () => void
}

const formatPrice = (centavos?: number) => {
  if (!centavos) return '—'
  return `$${(centavos / 100).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
}

const formatDate = (date?: Date | string) => {
  if (!date) return 'Sin fecha'
  const d = new Date(date)
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const getTotalWeight = (sale: Sale): number =>
  sale.animals.reduce((sum, a) => sum + (a.weight || 0), 0)

export const getTotalAmount = (sale: Sale): number => {
  const totalWeightKg = getTotalWeight(sale) / 1000
  return Math.round((sale.pricePerKg || 0) * totalWeightKg)
}

const formatWeight = (grams: number) => {
  if (!grams) return '—'
  return `${(grams / 1000).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`
}

const SaleCard: React.FC<SaleCardProps> = ({ sale, onClick }) => {
  const totalWeight = getTotalWeight(sale)
  const totalAmount = getTotalAmount(sale)

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sale_status_colors[sale.status]}`}
        >
          {sale_status_icons[sale.status]} {sale_status_labels[sale.status]}
        </span>
        <span className="text-sm text-gray-500">{formatDate(sale.date)}</span>
      </div>

      <div className="flex items-center justify-between mb-1">
        <div className="text-sm text-gray-700">
          {sale.animals.length} {sale.animals.length === 1 ? 'animal' : 'animales'}
        </div>
        <div className="text-xs text-gray-500">
          {formatPrice(sale.pricePerKg)}/kg ({sale_price_type_labels[sale.priceType || 'en_pie']})
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">{formatWeight(totalWeight)}</span>
        <span className="font-semibold text-gray-900">{formatPrice(totalAmount)}</span>
      </div>

      {sale.buyer && (
        <div className="mt-1 text-xs text-gray-500 truncate">Comprador: {sale.buyer}</div>
      )}
    </div>
  )
}

export default SaleCard
