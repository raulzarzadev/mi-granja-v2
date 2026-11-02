import { z } from 'zod'
import { animal_statuses, animals_genders, animals_stages, animals_types } from '@/types/animals'

export const createAnimalPayloadSchema = z.object({
  animalNumber: z.string().trim().min(1),
  name: z.string().trim().optional(),
  type: z.enum(animals_types),
  gender: z.enum(animals_genders),
  stage: z.enum(animals_stages).default('cria'),
  isBreedingMale: z.boolean().optional(),
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

export const animalListAiResponseSchema = z.object({
  items: z
    .array(
      z.object({
        raw: z.string().trim().min(1),
        candidate: z.string().trim().min(1),
        confidence: z.enum(['high', 'medium', 'low']),
        imageIndex: z.number().int().min(0).max(5),
        box: z
          .object({
            x: z.number().min(0).max(1000),
            y: z.number().min(0).max(1000),
            width: z.number().positive().max(1000),
            height: z.number().positive().max(1000),
          })
          .optional(),
      }),
    )
    .max(150),
  notes: z.string().trim().default(''),
})

export type AnimalListAiResponse = z.infer<typeof animalListAiResponseSchema>

export interface AiUsageResult {
  limit: number
  used: number
  remaining: number
  allowed?: boolean
  totalTokens?: number
  totalCost?: number
  isUnlimited?: boolean
}
