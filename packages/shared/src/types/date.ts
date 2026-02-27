import { Timestamp } from 'firebase/firestore'

export type AppDate = Date | string | number | Timestamp

export const isAppDate = (date: string | number | Timestamp | Date): date is AppDate => {
  return (
    date instanceof Date ||
    typeof date === 'string' ||
    typeof date === 'number' ||
    (date && typeof date === 'object' && 'toDate' in date)
  )
}
export const toAppDate = (date: AppDate): Date => {
  if (date instanceof Date) return date
  if (typeof date === 'string' || typeof date === 'number') return new Date(date)
  if ('toDate' in date) return date.toDate()
  throw new Error('Invalid AppDate type')
}
