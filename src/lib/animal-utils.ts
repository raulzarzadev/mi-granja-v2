import { Animal } from '@/types/animals'
import { toDate } from 'date-fns'

/**
 * Calcula la edad de un animal en diferentes formatos
 * @param animal - El animal del que se quiere calcular la edad
 * @param options - Opciones de formato
 * @returns La edad en el formato especificado
 *
 * Formatos disponibles:
 * - 'months': Devuelve solo el número de meses (ej: 25)
 * - 'short': Formato corto (ej: "2a3m5d", "15m10d", "5d")
 * - 'long': Formato largo (ej: "2 años y 3 meses", "15 meses", "5 días")
 */

// Sobrecarga: cuando format es 'months', retorna number
export function animalAge(animal: Animal, options: { format: 'months' }): number

// Sobrecarga: cuando format es 'short' o 'long' (o no se especifica), retorna string
export function animalAge(
  animal: Animal,
  options?: { format?: 'short' | 'long' }
): string

// Implementación real
export function animalAge(
  animal: Animal,
  options?: { format?: 'months' | 'short' | 'long' }
): string | number {
  const format = options?.format || 'long'

  // Si no hay fecha de nacimiento, usar la edad aproximada si existe
  if (!animal.birthDate) {
    if (animal.age) {
      if (format === 'months') return animal.age
      return `${animal.age} meses (aprox.)`
    }
    return format === 'months' ? 0 : 'No registrado'
  }

  const birthDate = toDate(animal.birthDate)
  const now = new Date()

  // Calcular años, meses y días exactos
  let years = now.getFullYear() - birthDate.getFullYear()
  let months = now.getMonth() - birthDate.getMonth()
  let days = now.getDate() - birthDate.getDate()

  // Ajustar si los días son negativos
  if (days < 0) {
    months--
    const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    days += lastMonth.getDate()
  }

  // Ajustar si los meses son negativos
  if (months < 0) {
    years--
    months += 12
  }

  // Calcular total de meses
  const totalMonths = years * 12 + months

  // Retornar según el formato solicitado
  switch (format) {
    case 'months':
      return totalMonths

    case 'short':
      if (years > 0) {
        if (months > 0) {
          return days > 0
            ? `${years}a${months}m${days}d`
            : `${years}a${months}m`
        } else {
          return days > 0 ? `${years}a${days}d` : `${years}a`
        }
      } else if (months > 0) {
        return days > 0 ? `${months}m${days}d` : `${months}m`
      } else {
        return `${days}d`
      }

    case 'long':
    default:
      if (years > 0) {
        const yearText = `${years} año${years !== 1 ? 's' : ''}`
        if (months > 0) {
          const monthText = `${months} mes${months !== 1 ? 'es' : ''}`
          return `${yearText} y ${monthText}`
        }
        return yearText
      } else if (months > 0) {
        return `${months} mes${months !== 1 ? 'es' : ''}`
      } else {
        return `${days} día${days !== 1 ? 's' : ''}`
      }
  }
}
