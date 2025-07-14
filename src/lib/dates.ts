import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export const formatDate = (date: Date, stringFormat = 'dd/MM/yyyy') => {
  return format(new Date(date), stringFormat, { locale: es })
}
