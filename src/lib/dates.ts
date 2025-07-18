import { format, toDate as fnsToDate } from 'date-fns'
import { es } from 'date-fns/locale'
import { Timestamp } from 'firebase/firestore'

export const formatDate = (date: Date, stringFormat = 'dd/MM/yyyy') => {
  const validDate = toDate(date)
  return format(validDate, stringFormat, { locale: es })
}

export const toDate = (date: string | number | string | Timestamp | Date) => {
  if (date instanceof Date) return date
  if (typeof date === 'string' || typeof date === 'number') {
    return new Date(date)
  }
  if (date instanceof Timestamp) {
    return fnsToDate(date.toDate())
  }
  throw new Error('Invalid date type')
}
