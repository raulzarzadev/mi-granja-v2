import { AnimalRecord, RecordType } from './animals'

export type RecordFormState = {
  type: RecordType
  category: AnimalRecord['category']
  title: string
  description: string
  date: string // yyyy-MM-dd
  severity: '' | NonNullable<AnimalRecord['severity']>
  isResolved: boolean
  resolvedDate: string // yyyy-MM-dd | ''
  treatment: string
  nextDueDate: string // yyyy-MM-dd | ''
  batch: string
  veterinarian: string
  cost: string
  createReminder: boolean
  reminderDate: string // yyyy-MM-dd | ''
  reminderTitle: string
  // Campos de peso
  weight: string // gramos como string para el input
  weightUnit: 'kg' | 'lb'
}
