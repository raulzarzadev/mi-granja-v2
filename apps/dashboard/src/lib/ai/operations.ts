import { z } from 'zod'
import {
  createAnimalPayloadSchema,
  createBreedingPayloadSchema,
  registerBirthPayloadSchema,
} from './types'

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa una fecha YYYY-MM-DD')
const refs = z.array(z.string().trim().min(1)).min(1).max(50)
const notes = z.string().trim().max(3000).optional()
const operation = <T extends string, S extends z.ZodTypeAny>(type: T, payload: S) =>
  z.object({ type: z.literal(type), payload, summary: z.string().trim().min(1).max(500) })
export const operationActionSchema = z.discriminatedUnion('type', [
  operation(
    'confirm_pregnancy',
    z.object({ breedingRef: z.string().trim().min(1), femaleRefs: refs, referenceDate: date }),
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
      animalRefs: refs,
      date,
      category: z.enum([
        'illness',
        'injury',
        'vaccine',
        'treatment',
        'deworming',
        'supplement',
        'surgery',
        'observation',
        'other',
      ]),
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
])
export type OperationAction = z.infer<typeof operationActionSchema>
export const OPERATION_VERSION = 1
export const operationCatalog = [
  {
    type: 'confirm_pregnancy',
    title: 'Confirmar gestación',
    module: 'breeding',
    permission: 'update',
    version: 1,
    assistantReview: 'OperationFields',
    manualFlow: 'ModalConfirmPregnancy',
  },
  {
    type: 'finish_breeding',
    title: 'Terminar empadre',
    module: 'breeding',
    permission: 'update',
    version: 1,
    assistantReview: 'OperationFields',
    manualFlow: 'BreedingDetail',
  },
  {
    type: 'create_animal',
    title: 'Alta de animal',
    module: 'animals',
    permission: 'create',
    version: 1,
    assistantReview: 'OperationFields',
    manualFlow: 'SimpleAnimalForm',
  },
  {
    type: 'create_breeding',
    title: 'Crear empadre',
    module: 'breeding',
    permission: 'create',
    version: 1,
    assistantReview: 'OperationFields',
    manualFlow: 'BreedingForm',
  },
  {
    type: 'register_birth',
    title: 'Registrar parto',
    module: 'animals',
    permission: 'update',
    version: 1,
    assistantReview: 'OperationFields',
    manualFlow: 'ModalBirthForm',
  },
  {
    type: 'register_weaning',
    title: 'Registrar destete',
    module: 'animals',
    permission: 'update',
    version: 1,
    assistantReview: 'OperationFields',
    manualFlow: 'ModalNewRecord',
  },
  {
    type: 'register_weight',
    title: 'Registrar peso',
    module: 'animals',
    permission: 'update',
    version: 1,
    assistantReview: 'OperationFields',
    manualFlow: 'ModalNewRecord',
  },
  {
    type: 'register_milk',
    title: 'Registrar leche',
    module: 'animals',
    permission: 'update',
    version: 1,
    assistantReview: 'OperationFields',
    manualFlow: 'ModalNewRecord',
  },
  {
    type: 'register_health',
    title: 'Registrar salud',
    module: 'animals',
    permission: 'update',
    version: 1,
    assistantReview: 'OperationFields',
    manualFlow: 'ModalNewRecord',
  },
  {
    type: 'create_sale',
    title: 'Registrar venta',
    module: 'animals',
    permission: 'update',
    version: 1,
    assistantReview: 'OperationFields',
    manualFlow: 'ModalSaleForm',
  },
] as const
