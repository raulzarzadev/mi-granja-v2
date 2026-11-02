import {
  operationalResponseJsonSchema,
  parseOperationalModelResponse,
} from '@/lib/ai/model-response'
import { operationCatalog } from '@/lib/ai/operations'
import { buildOperationalSystemPrompt } from '@/lib/ai/system-prompt'

describe('operational provider contract', () => {
  it('derives a strict root object schema with nullable optional fields', () => {
    const schema = operationalResponseJsonSchema as Record<string, any>
    expect(schema.type).toBe('object')
    expect(schema.anyOf).toBeUndefined()
    const check = (node: any) => {
      if (!node || typeof node !== 'object') return
      for (const bound of ['exclusiveMinimum', 'exclusiveMaximum']) {
        if (bound in node) expect(typeof node[bound]).toBe('number')
      }
      if (node.type === 'object') {
        expect(node.additionalProperties).toBe(false)
        expect(new Set(node.required)).toEqual(new Set(Object.keys(node.properties || {})))
      }
      for (const value of Object.values(node)) {
        if (Array.isArray(value)) value.forEach(check)
        else if (value && typeof value === 'object') check(value)
      }
    }
    check(schema)
  })

  it('parses null placeholders without bypassing required domain fields', () => {
    expect(
      parseOperationalModelResponse({
        kind: 'proposed_action',
        message: 'Revisa este destete',
        action: {
          type: 'register_weaning',
          summary: 'Destetar A7',
          payload: { animalRefs: ['A7'], date: '2026-01-01', destination: 'engorda', notes: null },
        },
        documentRequest: null,
      }),
    ).toMatchObject({ action: { payload: { animalRefs: ['A7'] } } })
    expect(() =>
      parseOperationalModelResponse({
        kind: 'proposed_action',
        message: 'Crear',
        action: {
          type: 'create_animal',
          summary: 'Crear',
          payload: { animalNumber: 'A7', birthDate: null },
        },
      }),
    ).toThrow()
  })

  it('allows bounded document reads and rejects unknown or legacy operations', () => {
    expect(
      parseOperationalModelResponse({
        kind: 'read_document',
        message: 'Revisar más destetes',
        action: null,
        documentRequest: { topic: 'weaning', offset: 150, limit: 100 },
      }).kind,
    ).toBe('read_document')
    expect(() =>
      parseOperationalModelResponse({
        kind: 'read_document',
        message: 'Todos',
        documentRequest: { topic: 'animals', offset: 0, limit: 10000 },
      }),
    ).toThrow()
    expect(() =>
      parseOperationalModelResponse({
        kind: 'proposed_action',
        message: 'Eliminar',
        action: { type: 'delete_animal', payload: {}, summary: 'Eliminar' },
      }),
    ).toThrow()
  })

  it('uses the live catalog and no obsolete reminder navigation or informative-only instructions', () => {
    const prompt = buildOperationalSystemPrompt()
    operationCatalog.forEach((operation) => {
      expect(prompt).toContain(operation.type)
    })
    expect(prompt).toContain('comprobante')
    expect(prompt).not.toContain('/?dashboard-main=recordatorios')
    expect(prompt).not.toContain('asistente informativo')
  })
})

it('retains positive numeric constraints in the provider schema and domain validator', () => {
  const schema = JSON.stringify(operationalResponseJsonSchema)
  expect(schema).toContain('"exclusiveMinimum":0')
  expect(schema).not.toContain('"exclusiveMinimum":true')
  expect(() =>
    parseOperationalModelResponse({
      kind: 'proposed_action',
      message: 'Peso',
      action: {
        type: 'register_weight',
        summary: 'Pesaje',
        payload: { animalRef: 'A7', date: '2026-01-01', weightKg: 0 },
      },
    }),
  ).toThrow()
})
