import { z } from 'zod'
import { farm_area_types } from '@/lib/domain/farm-area-service'
import { reminder_priorities, reminder_types } from '@/lib/domain/reminder-service'
import { animals_genders, animals_types } from '@/types/animals'
import {
  createAnimalPayloadSchema,
  createBreedingPayloadSchema,
  registerBirthPayloadSchema,
} from './types'

const healthCategory = z.enum([
  'illness',
  'injury',
  'vaccine',
  'treatment',
  'deworming',
  'supplement',
  'surgery',
  'observation',
  'other',
])
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa una fecha YYYY-MM-DD')
const refs = z.array(z.string().trim().min(1)).min(1).max(50)
const notes = z.string().trim().max(3000).optional()
/**
 * Grupo de animales activos que el servidor resuelve contra la granja. Evita que
 * el modelo enumere cientos de referencias; sin filtros significa todos los activos.
 */
export const animalGroupSchema = z.object({
  type: z.enum(animals_types).optional(),
  gender: z.enum(animals_genders).optional(),
})
export type AnimalGroup = z.infer<typeof animalGroupSchema>
/** Tope de un evento central: una sola escritura con la lista de IDs afectados. */
export const MAX_GROUP_ANIMALS = 5000
const operation = <T extends string, S extends z.ZodTypeAny>(type: T, payload: S) =>
  z.object({ type: z.literal(type), payload, summary: z.string().trim().min(1).max(500) })
export const operationActionSchema = z.discriminatedUnion('type', [
  operation(
    'confirm_pregnancy',
    z.object({ breedingRef: z.string().trim().min(1), femaleRefs: refs, referenceDate: date }),
  ),
  operation(
    'register_death',
    z.object({
      animalRefs: refs,
      date,
      reason: z.enum(['birth_defect', 'disease', 'injury', 'attack']),
      notes,
    }),
  ),
  operation('finish_breeding', z.object({ breedingRef: z.string().trim().min(1) })),
  operation('create_animal', createAnimalPayloadSchema.extend({ birthDate: date })),
  operation(
    'create_breeding',
    createBreedingPayloadSchema.extend({ breedingDate: date, femaleRefs: refs }),
  ),
  operation(
    'register_birth',
    registerBirthPayloadSchema.extend({
      birthDate: date,
      offspring: registerBirthPayloadSchema.shape.offspring.max(50),
    }),
  ),
  operation(
    'register_weaning',
    z.object({ animalRefs: refs, date, destination: z.enum(['engorda', 'reproductor']), notes }),
  ),
  operation(
    'register_weight',
    z.object({ animalRef: z.string().trim().min(1), date, weightKg: z.number().positive(), notes }),
  ),
  operation(
    'register_milk',
    z.object({
      animalRef: z.string().trim().min(1),
      date,
      liters: z.number().positive(),
      session: z.enum(['morning', 'afternoon', 'evening', 'total']),
      notes,
    }),
  ),
  operation(
    'register_health',
    z.object({
      // Exactamente uno: referencias explícitas (grupos chicos) o animalGroup.
      animalRefs: refs.optional(),
      animalGroup: animalGroupSchema.optional(),
      date,
      // Categoría principal; debe ser la primera de `categories` cuando se envían varias.
      category: healthCategory,
      // Todas las categorías de una misma atención (p. ej. vacuna + desparasitación).
      categories: z.array(healthCategory).min(1).max(9).optional(),
      title: z.string().trim().min(1),
      description: z.string().optional(),
      treatment: z.string().optional(),
      cost: z.number().nonnegative().optional(),
      notes,
    }),
  ),
  operation(
    'create_sale',
    z.object({
      animalRefs: refs,
      date,
      pricePerKg: z.number().positive(),
      weights: z
        .array(z.object({ animalRef: z.string().trim().min(1), weightKg: z.number().positive() }))
        .min(1)
        .max(50),
      buyer: z.string().optional(),
      notes,
    }),
  ),
  operation(
    'create_reminder',
    z.object({
      title: z.string().trim().min(1).max(200),
      // Fecha en que debe atenderse: hoy o futura, a diferencia de los movimientos.
      dueDate: date,
      description: z.string().trim().max(3000).optional(),
      priority: z.enum(reminder_priorities).optional(),
      reminderType: z.enum(reminder_types).optional(),
      animalRefs: refs.optional(),
    }),
  ),
  operation(
    'create_area',
    z.object({
      name: z.string().trim().min(1).max(80),
      areaType: z.enum(farm_area_types),
      areaM2: z.number().positive().optional(),
      description: z.string().trim().max(3000).optional(),
    }),
  ),
])
export type OperationAction = z.infer<typeof operationActionSchema>
export const OPERATION_VERSION = 4
export const operationCatalog = [
  {
    type: 'register_death',
    title: 'Registrar muerte',
    module: 'animals',
    permission: 'update',
    version: 3,
    assistantReview: 'OperationFields',
    manualFlow: 'ModalAnimalDischarge',
  },
  {
    type: 'confirm_pregnancy',
    title: 'Confirmar gestación',
    module: 'breeding',
    permission: 'update',
    version: 3,
    assistantReview: 'OperationFields',
    manualFlow: 'ModalConfirmPregnancy',
  },
  {
    type: 'finish_breeding',
    title: 'Terminar empadre',
    module: 'breeding',
    permission: 'update',
    version: 3,
    assistantReview: 'OperationFields',
    manualFlow: 'BreedingDetail',
  },
  {
    type: 'create_animal',
    title: 'Alta de animal',
    module: 'animals',
    permission: 'create',
    version: 3,
    assistantReview: 'OperationFields',
    manualFlow: 'SimpleAnimalForm',
  },
  {
    type: 'create_breeding',
    title: 'Crear empadre',
    module: 'breeding',
    permission: 'create',
    version: 3,
    assistantReview: 'OperationFields',
    manualFlow: 'BreedingForm',
  },
  {
    type: 'register_birth',
    title: 'Registrar parto',
    module: 'animals',
    permission: 'update',
    version: 3,
    assistantReview: 'OperationFields',
    manualFlow: 'ModalBirthForm',
  },
  {
    type: 'register_weaning',
    title: 'Registrar destete',
    module: 'animals',
    permission: 'update',
    version: 3,
    assistantReview: 'OperationFields',
    manualFlow: 'ModalNewRecord',
  },
  {
    type: 'register_weight',
    title: 'Registrar peso',
    module: 'animals',
    permission: 'update',
    version: 3,
    assistantReview: 'OperationFields',
    manualFlow: 'ModalNewRecord',
  },
  {
    type: 'register_milk',
    title: 'Registrar leche',
    module: 'animals',
    permission: 'update',
    version: 3,
    assistantReview: 'OperationFields',
    manualFlow: 'ModalNewRecord',
  },
  {
    type: 'register_health',
    title: 'Registrar sanidad',
    module: 'animals',
    permission: 'update',
    version: 4,
    assistantReview: 'OperationFields',
    manualFlow: 'ModalNewRecord',
  },
  {
    type: 'create_sale',
    title: 'Registrar venta',
    module: 'animals',
    permission: 'update',
    version: 3,
    assistantReview: 'OperationFields',
    manualFlow: 'ModalSaleForm',
  },
  {
    type: 'create_reminder',
    title: 'Crear recordatorio',
    module: 'reminders',
    permission: 'create',
    version: 3,
    assistantReview: 'OperationFields',
    manualFlow: 'ModalReminderForm',
  },
  {
    type: 'create_area',
    title: 'Crear área',
    module: 'areas',
    permission: 'create',
    version: 3,
    assistantReview: 'OperationFields',
    manualFlow: 'ModalCreateArea',
  },
] as const
