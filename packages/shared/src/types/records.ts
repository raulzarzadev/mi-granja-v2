import { AnimalRecord } from './animals'

export type RecordFormState = {
  type: AnimalRecord['type']
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
}
