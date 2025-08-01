import { format, toDate as fnsToDate } from 'date-fns'
import { es } from 'date-fns/locale'
import { Timestamp } from 'firebase/firestore'

export const formatDate = (date: Date, stringFormat = 'dd/MM/yyyy') => {
  const validDate = toDate(date)
  return format(validDate, stringFormat, { locale: es })
}

export const toDate = (date: string | number | string | Timestamp | Date) => {
  if (!date) {
    throw new Error('Date cannot be null or undefined')
  }
  if (date instanceof Date) return date
  if (typeof date === 'string' || typeof date === 'number') {
    return new Date(date)
  }
  if (date instanceof Timestamp) {
    return fnsToDate(date.toDate())
  }
  if (typeof date === 'string' || typeof date === 'number') {
    const parsedDate = new Date(date)
    if (isNaN(parsedDate.getTime())) {
      throw new Error('Invalid date string or number')
    }
    return parsedDate
  }
  throw new Error('Invalid date type')
}

export const animalAge = (birthDate: Date | string | number | Timestamp) => {
  const date = toDate(birthDate)
  const now = new Date()

  let years = now.getFullYear() - date.getFullYear()
  let months = now.getMonth() - date.getMonth()
  let days = now.getDate() - date.getDate()

  if (days < 0) {
    months--
    const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    days += lastMonth.getDate()
  }

  if (months < 0) {
    years--
    months += 12
  }

  if (years > 0) {
    if (months > 0) {
      return `${years}a${months}m`
    } else {
      return `${years}a`
    }
  } else if (months > 0) {
    if (days > 0) {
      return `${months}m${days}d`
    } else {
      return `${months}m`
    }
  } else {
    return `${days}d`
  }
}
