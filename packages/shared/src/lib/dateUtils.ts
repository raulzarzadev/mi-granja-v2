import { format, parse, isValid, startOfDay, endOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { Timestamp } from 'firebase/firestore'

/**
 * Utilidades centralizadas para manejo de fechas
 * Optimizado para evitar problemas de zona horaria
 */

// ===== CONVERSIONES SEGURAS =====

/**
 * Convierte cualquier input de fecha a Date, manejando zona horaria local
 */
export function toSafeDate(
  input: string | number | Date | Timestamp | null | undefined
): Date {
  if (!input) return new Date()

  if (input instanceof Date) return input
  if (input instanceof Timestamp) return input.toDate()

  if (typeof input === 'string') {
    // Si es formato yyyy-MM-dd (input date), parsear como fecha local
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      return parseLocalDateString(input)
    }
    // Si es formato dd/MM/yyyy, parsear
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(input)) {
      const parsed = parse(input, 'dd/MM/yyyy', new Date())
      return isValid(parsed) ? parsed : new Date()
    }
    // Otros formatos
    const parsed = new Date(input)
    return isValid(parsed) ? parsed : new Date()
  }

  if (typeof input === 'number') {
    const parsed = new Date(input)
    return isValid(parsed) ? parsed : new Date()
  }

  return new Date()
}

/**
 * Parsea string yyyy-MM-dd como fecha local (sin problemas UTC)
 */
export function parseLocalDateString(dateStr: string): Date {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date()
  }
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day) // month es 0-indexed
}

/**
 * Convierte Date a string yyyy-MM-dd en zona horaria local
 */
export function toLocalDateString(
  date: Date | string | number | Timestamp | null | undefined
): string {
  const safeDate = toSafeDate(date)
  const year = safeDate.getFullYear()
  const month = String(safeDate.getMonth() + 1).padStart(2, '0')
  const day = String(safeDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Convierte Date a string yyyy-MM-ddTHH:mm en zona horaria local
 */
export function toLocalDateTimeString(
  date: Date | string | number | Timestamp | null | undefined
): string {
  const safeDate = toSafeDate(date)
  const year = safeDate.getFullYear()
  const month = String(safeDate.getMonth() + 1).padStart(2, '0')
  const day = String(safeDate.getDate()).padStart(2, '0')
  const hours = String(safeDate.getHours()).padStart(2, '0')
  const minutes = String(safeDate.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

// ===== FORMATEO PARA DISPLAY =====

/**
 * Formatea fecha para mostrar al usuario (dd/MM/yyyy)
 */
export function formatDateDisplay(
  date: Date | string | number | Timestamp | null | undefined
): string {
  const safeDate = toSafeDate(date)
  return format(safeDate, 'dd/MM/yyyy', { locale: es })
}

/**
 * Formatea fecha y hora para mostrar al usuario (dd/MM/yyyy HH:mm)
 */
export function formatDateTimeDisplay(
  date: Date | string | number | Timestamp | null | undefined
): string {
  const safeDate = toSafeDate(date)
  return format(safeDate, 'dd/MM/yyyy HH:mm', { locale: es })
}

/**
 * Formatea fecha relativa (Hoy, Ayer, etc.)
 */
export function formatRelativeDate(
  date: Date | string | number | Timestamp | null | undefined
): string {
  const safeDate = toSafeDate(date)
  const today = new Date()
  const diffDays = Math.floor(
    (today.getTime() - safeDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  if (diffDays === -1) return 'Mañana'
  if (diffDays > 0 && diffDays <= 7) return `Hace ${diffDays} días`
  if (diffDays < 0 && diffDays >= -7) return `En ${Math.abs(diffDays)} días`

  return formatDateDisplay(safeDate)
}

// ===== UTILIDADES COMUNES =====

/**
 * Obtiene la fecha actual en formato yyyy-MM-dd
 */
export function getTodayString(): string {
  return toLocalDateString(new Date())
}

/**
 * Obtiene la fecha y hora actual en formato yyyy-MM-ddTHH:mm
 */
export function getNowString(): string {
  return toLocalDateTimeString(new Date())
}

/**
 * Normaliza fecha al inicio del día (00:00:00.000)
 */
export function toStartOfDay(
  date: Date | string | number | Timestamp | null | undefined
): Date {
  return startOfDay(toSafeDate(date))
}

/**
 * Normaliza fecha al final del día (23:59:59.999)
 */
export function toEndOfDay(
  date: Date | string | number | Timestamp | null | undefined
): Date {
  return endOfDay(toSafeDate(date))
}

/**
 * Calcula edad en años desde una fecha de nacimiento
 */
export function calculateAge(
  birthDate: Date | string | number | Timestamp | null | undefined
): number {
  const birth = toSafeDate(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  return Math.max(0, age)
}

/**
 * Calcula edad en meses desde una fecha de nacimiento
 */
export function calculateAgeInMonths(
  birthDate: Date | string | number | Timestamp | null | undefined
): number {
  const birth = toSafeDate(birthDate)
  const today = new Date()

  let months = (today.getFullYear() - birth.getFullYear()) * 12
  months += today.getMonth() - birth.getMonth()

  if (today.getDate() < birth.getDate()) {
    months--
  }

  return Math.max(0, months)
}

/**
 * Calcula diferencia en días entre dos fechas
 */
export function daysDifference(
  date1: Date | string | number | Timestamp | null | undefined,
  date2: Date | string | number | Timestamp | null | undefined
): number {
  const d1 = toStartOfDay(date1)
  const d2 = toStartOfDay(date2)
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Suma días a una fecha
 */
export function addDays(
  date: Date | string | number | Timestamp | null | undefined,
  days: number
): Date {
  const safeDate = toSafeDate(date)
  const result = new Date(safeDate)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Resta días a una fecha
 */
export function subtractDays(
  date: Date | string | number | Timestamp | null | undefined,
  days: number
): Date {
  return addDays(date, -days)
}

/**
 * Verifica si una fecha está en el pasado
 */
export function isPast(
  date: Date | string | number | Timestamp | null | undefined
): boolean {
  return toStartOfDay(date).getTime() < toStartOfDay(new Date()).getTime()
}

/**
 * Verifica si una fecha es hoy
 */
export function isToday(
  date: Date | string | number | Timestamp | null | undefined
): boolean {
  return toStartOfDay(date).getTime() === toStartOfDay(new Date()).getTime()
}

/**
 * Verifica si una fecha es mañana
 */
export function isTomorrow(
  date: Date | string | number | Timestamp | null | undefined
): boolean {
  const tomorrow = addDays(new Date(), 1)
  return toStartOfDay(date).getTime() === toStartOfDay(tomorrow).getTime()
}
