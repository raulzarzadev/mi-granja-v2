// Tipos para el sistema de ventas

export interface SaleAnimalEntry {
  animalId: string
  animalNumber: string
  weight?: number // gramos
}

export const sale_statuses = ['scheduled', 'pending', 'completed', 'cancelled'] as const
export type SaleStatus = (typeof sale_statuses)[number]

export const sale_price_types = ['en_pie', 'en_canal'] as const
export type SalePriceType = (typeof sale_price_types)[number]

export const sale_price_type_labels: Record<SalePriceType, string> = {
  en_pie: 'En pie',
  en_canal: 'En canal',
}

export interface Sale {
  id: string
  farmId: string
  farmerId: string
  animals: SaleAnimalEntry[]
  date?: Date
  pricePerKg?: number // centavos por kg
  priceType: SalePriceType // default 'en_pie'
  buyer?: string
  notes?: string
  status: SaleStatus
  createdBy: string
  updatedBy: string
  createdAt: Date
  updatedAt: Date
}

/** Valida que la venta tenga todos los datos necesarios para completarse */
export const isSaleComplete = (sale: Partial<Sale>): boolean => {
  if (!sale.date) return false
  if (!sale.pricePerKg || sale.pricePerKg <= 0) return false
  if (!sale.animals || sale.animals.length === 0) return false
  return sale.animals.every((a) => a.weight && a.weight > 0)
}

export const sale_status_labels: Record<SaleStatus, string> = {
  scheduled: 'Programada',
  pending: 'Pendiente',
  completed: 'Completada',
  cancelled: 'Cancelada',
}

export const sale_status_icons: Record<SaleStatus, string> = {
  scheduled: '📅',
  pending: '⏳',
  completed: '✅',
  cancelled: '❌',
}

export const sale_status_colors: Record<SaleStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}
