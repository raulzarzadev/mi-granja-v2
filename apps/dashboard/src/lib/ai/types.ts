import { z } from 'zod'
import { animal_statuses, animals_genders, animals_stages, animals_types } from '@/types/animals'

export const aiActionTypes = [
  'create_animal',
  'create_breeding',
  'register_birth',
  'register_births',
  'create_reminder',
  'finish_breeding',
] as const

export type AiActionType = (typeof aiActionTypes)[number]

export const createAnimalPayloadSchema = z.object({
  animalNumber: z.string().trim().min(1),
  name: z.string().trim().optional(),
  type: z.enum(animals_types),
  gender: z.enum(animals_genders),
  stage: z.enum(animals_stages).default('cria'),
  breed: z.string().trim().optional(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  weightKg: z.number().nonnegative().optional(),
  motherRef: z.string().trim().optional(),
  fatherRef: z.string().trim().optional(),
  notes: z.string().trim().optional(),
})

export const createBreedingPayloadSchema = z.object({
  maleRef: z.string().trim().min(1),
  femaleRefs: z.array(z.string().trim().min(1)).min(1),
  breedingDate: z.string().trim().min(1),
  notes: z.string().trim().optional(),
})

export const registerBirthPayloadSchema = z.object({
  motherRef: z.string().trim().min(1),
  birthDate: z.string().trim().min(1),
  birthTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .default('12:00'),
  offspring: z
    .array(
      z.object({
        animalNumber: z.string().trim().min(1),
        gender: z.enum(animals_genders),
        weightKg: z.number().nonnegative().optional(),
        status: z.enum(animal_statuses).default('activo'),
        notes: z.string().trim().optional(),
      }),
    )
    .min(1),
  notes: z.string().trim().optional(),
})

export const registerBirthsPayloadSchema = z.object({
  births: z.array(registerBirthPayloadSchema).min(1),
})

export const createReminderPayloadSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  dueDate: z.string().trim().min(1),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  type: z.enum(['medical', 'breeding', 'feeding', 'weight', 'other']).default('other'),
  animalRefs: z.array(z.string().trim().min(1)).default([]),
})

export const finishBreedingPayloadSchema = z.object({
  breedingRef: z.string().trim().min(1),
})

export const aiActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('create_animal'),
    payload: createAnimalPayloadSchema,
    summary: z.string().trim().min(1),
  }),
  z.object({
    type: z.literal('create_breeding'),
    payload: createBreedingPayloadSchema,
    summary: z.string().trim().min(1),
  }),
  z.object({
    type: z.literal('register_birth'),
    payload: registerBirthPayloadSchema,
    summary: z.string().trim().min(1),
  }),
  z.object({
    type: z.literal('register_births'),
    payload: registerBirthsPayloadSchema,
    summary: z.string().trim().min(1),
  }),
  z.object({
    type: z.literal('create_reminder'),
    payload: createReminderPayloadSchema,
    summary: z.string().trim().min(1),
  }),
  z.object({
    type: z.literal('finish_breeding'),
    payload: finishBreedingPayloadSchema,
    summary: z.string().trim().min(1),
  }),
])

export type AiAction = z.infer<typeof aiActionSchema>

export const aiModelResponseSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('message'),
    message: z.string().trim().min(1),
  }),
  z.object({
    kind: z.literal('needs_clarification'),
    message: z.string().trim().min(1),
  }),
  z.object({
    kind: z.literal('proposed_action'),
    message: z.string().trim().min(1),
    action: aiActionSchema,
  }),
])

export type AiModelResponse = z.infer<typeof aiModelResponseSchema>

export interface AiUsageResult {
  limit: number
  used: number
  remaining: number
  allowed?: boolean
  totalTokens?: number
  totalCost?: number
  isUnlimited?: boolean
}
