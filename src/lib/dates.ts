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

// Normaliza una fecha al inicio del día en horario local (00:00)
export const startOfLocalDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate())

// Convierte cualquier input válido a Date y normaliza al inicio del día local
export const toLocalDateStart = (date: string | number | Timestamp | Date) =>
  startOfLocalDay(toDate(date as any))

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

export function fromNow(
  date: string | number | string | Timestamp | Date | null
) {
  if (!date) {
    console.error('fromNow: date is null or undefined')
    return ''
  }

  const now = new Date()
  const pastDate = toDate(date)
  const diff = now.getTime() - pastDate.getTime()

  if (diff < 0) {
    const futureDiff = Math.abs(diff)
    const days = Math.floor(futureDiff / (1000 * 60 * 60 * 24))
    const weeks = Math.floor(days / 7)
    const months = Math.floor(days / 30)
    const years = Math.floor(months / 12)

    if (years > 0) {
      return `en ${years} año${years > 1 ? 's' : ''}`
    }
    if (months > 0) {
      return `en ${months} mes${months > 1 ? 'es' : ''}`
    }
    if (weeks > 0) {
      return `en ${weeks} semana${weeks > 1 ? 's' : ''}`
    }
    return `en ${days} día${days > 1 ? 's' : ''}`
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const months = Math.floor(days / 30)
  const years = Math.floor(months / 12)

  if (years > 0) {
    return `${years} año${years > 1 ? 's' : ''} atrás`
  }
  if (months > 0) {
    return `${months} mes${months > 1 ? 'es' : ''} atrás`
  }
  return `${days} día${days > 1 ? 's' : ''} atrás`
}
