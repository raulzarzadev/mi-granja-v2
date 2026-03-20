// Sistema unificado de registros de animales
export interface AnimalRecord {
  id: string
  // Categorización del registro
  type: 'note' | 'health' | 'birth' | 'weight' | 'expense'
  category: RecordCategory

  // Información básica (todos los tipos)
  title: string
  description?: string
  date: Date // Fecha principal del evento

  // Campos específicos para casos clínicos
  severity?: 'low' | 'medium' | 'high' | 'critical'
  isResolved?: boolean
  resolvedDate?: Date
  treatment?: string

  // Campos específicos para eventos de salud (vacunas/medicamentos)
  nextDueDate?: Date // Para vacunas que requieren refuerzo
  batch?: string // Lote de la vacuna/medicamento

  // Campos comunes
  veterinarian?: string
  cost?: number // centavos
  notes?: string

  // Para aplicación masiva (eventos de salud)
  appliedToAnimals?: string[] // IDs de animales
  isBulkApplication?: boolean

  // Metadata
  createdAt: Date
  createdBy: string
  updatedAt?: Date
}

export interface AnimalWeightEntry {
  date: Date
  weight: number // gramos
  age?: number // meses al momento del pesaje
  notes?: string
}

export interface Animal {
  id: string
  farmerId: string
  farmId?: string
  animalNumber: string // ID único del animal (asignado por el granjero)
  name?: string // Nombre opcional del animal
  type: AnimalType
  breed?: string // Raza del animal
  stage: AnimalStage

  weight?: number | string | null // peso en gramos
  age?: number | null
  birthDate?: Date
  gender: AnimalGender
  motherId?: string
  fatherId?: string
  batch?: string // Lote al que pertenece el animal
  notes?: string
  createdAt: Date
  updatedAt: Date
  // Historial de pesajes del animal
  weightRecords?: AnimalWeightEntry[]
  // Sistema unificado de registros
  records?: AnimalRecord[]
  // Estado general del animal
  status?: AnimalStatus // default lógico: 'activo'
  statusAt?: Date
  statusNotes?: string
  soldInfo?: {
    date: Date
    buyer?: string
    weight?: number // gramos
    price?: number // centavos
  }
  lostInfo?: {
    lostAt: Date
    foundAt?: Date
  }
  // Estado de destete
  isWeaned?: boolean
  weanedAt?: Date
  weaningDestination?: WeanNextStage
  // Override opcional para días de destete recomendados
  customWeaningDays?: number
  // Metadata de admin para rastrear acciones administrativas
  adminAction?: {
    performedByAdmin: boolean
    adminEmail?: string
    adminId?: string
    originalTimestamp: Date
    impersonationReason?: string
  }
}

export const animals_genders = ['macho', 'hembra'] as const
export type AnimalGender = (typeof animals_genders)[number]
export const gender_icon: Record<AnimalGender, string> = {
  macho: '♂',
  hembra: '♀',
}

export const gender_colors: Record<AnimalGender, string> = {
  macho: 'text-blue-600',
  hembra: 'text-pink-500',
}

export const animals_types = [
  'oveja',
  'vaca',
  // 'vaca_leche',
  // 'vaca_engorda',
  'cabra',
  'cerdo',
  'gallina',
  'perro',
  'gato',
  'equino',
  'otro',
] as const

export const animals_types_labels: Record<AnimalType, string> = {
  oveja: 'Oveja',
  vaca: 'Vaca',
  // vaca_leche: 'Vaca Lechera',
  // vaca_engorda: 'Vaca de Engorda',
  cabra: 'Cabra',
  cerdo: 'Cerdo',
  gallina: 'Gallina',
  perro: 'Perro',
  gato: 'Gato',
  equino: 'Equino',
  otro: 'Otro',
}

export const animals_stages = [
  'cria',
  'juvenil',
  'engorda',
  'lechera',
  'reproductor',
  'descarte',
] as const
export const animals_stages_labels: Record<AnimalStage, string> = {
  cria: 'Cría',
  juvenil: 'Juvenil',
  engorda: 'Engorda',
  lechera: 'Lechera',
  reproductor: 'Reproductor',
  descarte: 'Descarte',
}

export const animals_genders_labels: Record<AnimalGender, string> = {
  macho: 'Macho',
  hembra: 'Hembra',
}

export type AnimalType = (typeof animals_types)[number]
export type AnimalStage = (typeof animals_stages)[number]
export type WeanNextStage = 'engorda' | 'reproductor'

export const breeding_animal_status = ['monta', 'embarazada', 'parida'] as const
export type AnimalBreedingStatus = (typeof breeding_animal_status)[number]
export const breeding_animal_status_labels: Record<AnimalBreedingStatus, string> = {
  monta: 'En monta',
  embarazada: 'Embarazada',
  parida: 'Parida',
}

export const animal_statuses = [
  // Estado general del animal
  'activo',
  'muerto',
  'vendido',
  'perdido',
] as const

export type AnimalStatus = (typeof animal_statuses)[number]

export const animal_icon: Record<AnimalType, string> = {
  oveja: '🐑',
  vaca: '🐄',
  // vaca_leche: '🐄',
  // vaca_engorda: '🐄',
  cabra: '🐐',
  cerdo: '🐷',
  gallina: '🐔',
  perro: '🐶',
  gato: '🐱',
  equino: '🐴',
  otro: '🐾',
}

// ===== SISTEMA UNIFICADO DE REGISTROS =====

export const record_types = ['note', 'health', 'weight', 'birth', 'expense'] as const
export type RecordType = (typeof record_types)[number]

export const record_categories = [
  'general',
  'illness',
  'injury',
  'vaccine',
  'treatment',
  'deworming',
  'supplement',
  'surgery',
  'observation',
  'other',
] as const
export type RecordCategory = (typeof record_categories)[number]

export const record_type_labels: Record<RecordType, string> = {
  note: 'Nota',
  health: 'Salud',
  weight: 'Peso',
  birth: 'Parto',
  expense: 'Gasto',
}

export const record_type_icons: Record<RecordType, string> = {
  note: '📝',
  health: '🏥',
  weight: '⚖️',
  birth: '🐣',
  expense: '💰',
}

// ===== CATEGORÍAS DE GASTO =====

export const expense_categories = [
  'feed',
  'medicine',
  'maintenance',
  'transport',
  'equipment',
  'labor',
  'other_expense',
] as const
export type ExpenseCategory = (typeof expense_categories)[number]

export const expense_category_labels: Record<ExpenseCategory, string> = {
  feed: 'Alimento',
  medicine: 'Medicina',
  maintenance: 'Mantenimiento',
  transport: 'Transporte',
  equipment: 'Equipo',
  labor: 'Mano de obra',
  other_expense: 'Otro',
}

export const expense_category_icons: Record<ExpenseCategory, string> = {
  feed: '🌾',
  medicine: '💊',
  maintenance: '🔧',
  transport: '🚛',
  equipment: '🛠️',
  labor: '👷',
  other_expense: '📋',
}

export const expense_category_colors: Record<ExpenseCategory, string> = {
  feed: 'bg-amber-100 text-amber-800',
  medicine: 'bg-blue-100 text-blue-800',
  maintenance: 'bg-gray-100 text-gray-800',
  transport: 'bg-cyan-100 text-cyan-800',
  equipment: 'bg-indigo-100 text-indigo-800',
  labor: 'bg-orange-100 text-orange-800',
  other_expense: 'bg-gray-100 text-gray-800',
}

export const record_category_labels: Record<RecordCategory, string> = {
  general: 'General',
  illness: 'Enfermedad',
  injury: 'Lesión',
  vaccine: 'Vacuna',
  treatment: 'Tratamiento',
  deworming: 'Desparasitación',
  supplement: 'Suplemento',
  surgery: 'Cirugía',
  observation: 'Observación',
  other: 'Otro',
}

export const record_category_icons: Record<RecordCategory, string> = {
  general: '📝',
  illness: '🦠',
  injury: '🩹',
  vaccine: '💉',
  treatment: '💊',
  deworming: '🐛',
  supplement: '🧪',
  surgery: '🏥',
  observation: '👁️',
  other: '📋',
}

export const record_category_colors: Record<RecordCategory, string> = {
  general: 'bg-gray-100 text-gray-800',
  illness: 'bg-red-100 text-red-800',
  injury: 'bg-orange-100 text-orange-800',
  vaccine: 'bg-green-100 text-green-800',
  treatment: 'bg-blue-100 text-blue-800',
  deworming: 'bg-purple-100 text-purple-800',
  supplement: 'bg-indigo-100 text-indigo-800',
  surgery: 'bg-red-100 text-red-800',
  observation: 'bg-yellow-100 text-yellow-800',
  other: 'bg-gray-100 text-gray-800',
}

export const record_severities = ['low', 'medium', 'high', 'critical'] as const
export type RecordSeverity = (typeof record_severities)[number]

export const record_severity_labels: Record<RecordSeverity, string> = {
  low: 'Leve',
  medium: 'Moderada',
  high: 'Alta',
  critical: 'Crítica',
}

export const record_severity_colors: Record<RecordSeverity, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
}

export const animal_stage_colors: Record<AnimalStage, string> = {
  cria: 'bg-blue-100 text-blue-800',
  juvenil: 'bg-cyan-100 text-cyan-800',
  engorda: 'bg-orange-100 text-orange-800',
  lechera: 'bg-purple-100 text-purple-800',
  reproductor: 'bg-green-100 text-green-800',
  descarte: 'bg-red-100 text-red-800',
}

export const animal_stage_labels: Record<AnimalStage, string> = {
  cria: 'Cría',
  juvenil: 'Juvenil',
  engorda: 'Engorda',
  lechera: 'Lechera',
  reproductor: 'Reproductor',
  descarte: 'Descarte',
}
export const animal_stage_icons: Record<AnimalStage, string> = {
  cria: '👶',
  juvenil: '🌱',
  engorda: '🍖',
  lechera: '🥛',
  reproductor: '❤️',
  descarte: '🚫',
}

export interface StageDescription {
  description: string
  speciesInfo?: Partial<Record<AnimalType, string>>
}

export const animal_stage_descriptions: Record<AnimalStage, StageDescription> = {
  cria: {
    description: 'Recién nacido, depende de la madre. Lactancia y cuidado inicial.',
    speciesInfo: {
      oveja: '0–2 meses, destete ~60 días',
      cabra: '0–2 meses, destete ~60 días',
      vaca: '0–4 meses, destete ~120 días',
      cerdo: '0–1 mes, destete ~28 días',
      gallina: '0–8 semanas',
      equino: '0–6 meses, destete ~180 días',
      perro: '0–2 meses, destete ~56 días',
      gato: '0–2 meses, destete ~56 días',
    },
  },
  juvenil: {
    description: 'Ya destetado, en crecimiento. Aún no apto para reproducción ni engorda final.',
    speciesInfo: {
      oveja: '2–8 meses, <30 kg',
      cabra: '2–7 meses, <25 kg',
      vaca: '4–15 meses, <300 kg',
      cerdo: '1–6 meses, <80 kg',
      gallina: '8 semanas–5 meses',
      equino: '6 meses–3 años',
      perro: '2–12 meses',
      gato: '2–6 meses',
    },
  },
  engorda: {
    description: 'Alimentación intensiva para ganancia de peso. Destino: venta o consumo.',
    speciesInfo: {
      oveja: '>6 meses, 30–50 kg objetivo',
      cabra: '>6 meses, 25–40 kg objetivo',
      vaca: '>12 meses, 400–600 kg objetivo',
      cerdo: '>6 meses, 90–120 kg objetivo',
      gallina: '>5 meses (pollo de engorda)',
    },
  },
  lechera: {
    description: 'Producción de leche activa. Requiere manejo nutricional especial.',
    speciesInfo: {
      vaca: 'Hembra adulta >24 meses, en lactancia',
      cabra: 'Hembra adulta >12 meses, en lactancia',
      oveja: 'Hembra adulta >12 meses, en lactancia',
    },
  },
  reproductor: {
    description: 'Apto para reproducción. Semental o pie de cría.',
    speciesInfo: {
      oveja: '>8 meses, pie de cría >30 kg / semental >40 kg',
      cabra: '>7 meses',
      vaca: 'Pie de cría >15 meses, semental >18 meses',
      cerdo: '>6 meses, pie de cría >100 kg / semental >110 kg',
      gallina: '>5 meses',
      equino: '>3 años',
      perro: '>12 meses',
      gato: '>6 meses',
    },
  },
  descarte: {
    description: 'Fuera del ciclo productivo. Por edad, enfermedad o bajo rendimiento.',
  },
}

export const animal_status_labels: Record<AnimalStatus, string> = {
  activo: 'Activo',
  muerto: 'Muerto',
  vendido: 'Vendido',
  perdido: 'Perdido',
}

export const animal_status_icons: Record<AnimalStatus, string> = {
  activo: '✅',
  muerto: '💀',
  vendido: '💲',
  perdido: '❓',
}

export const animal_status_colors: Record<AnimalStatus, string> = {
  activo: 'bg-green-100 text-green-800',
  muerto: 'bg-gray-200 text-gray-700',
  vendido: 'bg-yellow-100 text-yellow-800',
  perdido: 'bg-red-100 text-red-800',
}
