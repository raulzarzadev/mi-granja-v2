import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { operationActionSchema } from './operations'

// The model may only propose commands. Server code separately resolves permissions,
// current entities and persistence; this schema is never an execution authorization.
export const knowledgeRequestSchema = z.object({
  topic: z.enum(['animals', 'breedings', 'weaning', 'births', 'movements', 'milk', 'reminders']),
  offset: z.number().int().nonnegative(),
  limit: z.number().int().min(1).max(150),
})

const wireSchema = z.object({
  kind: z.enum([
    'message',
    'needs_clarification',
    'proposed_action',
    'proposed_actions',
    'read_document',
  ]),
  message: z.string().min(1),
  action: operationActionSchema.nullable(),
  actions: z.array(operationActionSchema).min(2).max(10).nullable(),
  documentRequest: knowledgeRequestSchema.nullable(),
})

export const operationalResponseJsonSchema = zodToJsonSchema(wireSchema, {
  target: 'openAi',
  $refStrategy: 'none',
  // The openAi target emits OpenAPI boolean exclusivity; Structured Outputs
  // requires numeric exclusive bounds from JSON Schema instead.
  postProcess: (schema) => {
    if (!schema || typeof schema !== 'object') return schema
    const node = schema as Record<string, unknown>
    for (const [exclusive, inclusive] of [
      ['exclusiveMinimum', 'minimum'],
      ['exclusiveMaximum', 'maximum'],
    ] as const) {
      if (node[exclusive] === true && typeof node[inclusive] === 'number') {
        node[exclusive] = node[inclusive]
        delete node[inclusive]
      } else if (node[exclusive] === false) {
        delete node[exclusive]
      }
    }
    return schema
  },
})

const responseSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('proposed_actions'),
    message: z.string().trim().min(1),
    actions: z.array(operationActionSchema).min(2).max(10),
  }),
  z.object({
    kind: z.literal('read_document'),
    message: z.string().trim().min(1),
    documentRequest: knowledgeRequestSchema,
  }),
  z.object({ kind: z.literal('message'), message: z.string().trim().min(1) }),
  z.object({ kind: z.literal('needs_clarification'), message: z.string().trim().min(1) }),
  z.object({
    kind: z.literal('proposed_action'),
    message: z.string().trim().min(1),
    action: operationActionSchema,
  }),
])
export type OperationalModelResponse = z.infer<typeof responseSchema>

// Strict provider schemas represent optional object fields as required nullable
// fields. Drop those null placeholders before applying the domain Zod schema.
function withoutNullPlaceholders(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutNullPlaceholders)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, field]) => field !== null)
      .map(([key, field]) => [key, withoutNullPlaceholders(field)]),
  )
}

export function parseOperationalModelResponse(value: unknown): OperationalModelResponse {
  return responseSchema.parse(withoutNullPlaceholders(value))
}
