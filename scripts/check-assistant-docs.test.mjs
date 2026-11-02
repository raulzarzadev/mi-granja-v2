import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { validateAssistantDocumentation } from './check-assistant-docs.mjs'

const operationPath = 'apps/dashboard/src/lib/ai/operations.ts'
const catalog = `export const operationActionSchema = z.object({ title: z.string() });\nexport type OperationAction = unknown;\nexport const OPERATION_VERSION = 1;\nexport const operationCatalog = [{type: 'create_animal', version: 1}];`
function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'assistant-docs-'))
  const put = (path, text) => {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), text)
  }
  put(operationPath, catalog)
  put('apps/dashboard/src/lib/ai/knowledge.ts', 'export const AI_KNOWLEDGE_SCHEMA_VERSION = 1')
  put(
    'docs/assistant/manifest.json',
    JSON.stringify({
      flowVersion: 1,
      knowledgeVersion: 1,
      operations: ['create_animal'],
      sources: [operationPath],
    }),
  )
  put('docs/assistant/flows.md', 'Flujo `create_animal`')
  try {
    run({ root, put })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

test('un cambio de dominio exige documentación de flujos y decisión en el mismo cambio', () =>
  fixture(({ root }) => {
    const errors = validateAssistantDocumentation({
      root,
      changedFiles: ['apps/dashboard/src/lib/domain/animal-registration-service.ts'],
    })
    assert.equal(errors.length, 2)
    assert.ok(errors.some((error) => error.includes('flows.md')))
    assert.ok(errors.some((error) => error.includes('CHANGELOG.md')))
  }))
test('acepta cambios de conocimiento con su mapa y changelog actualizados', () =>
  fixture(({ root }) => {
    assert.deepEqual(
      validateAssistantDocumentation({
        root,
        changedFiles: [
          'apps/dashboard/src/lib/ai/knowledge.ts',
          'docs/assistant/knowledge.md',
          'docs/assistant/CHANGELOG.md',
        ],
      }),
      [],
    )
  }))
test('detecta una versión o catálogo que difiere de la documentación', () =>
  fixture(({ root, put }) => {
    put(
      'docs/assistant/manifest.json',
      JSON.stringify({ flowVersion: 2, knowledgeVersion: 9, operations: [], sources: [] }),
    )
    const errors = validateAssistantDocumentation({ root })
    assert.equal(errors.length, 3)
  }))
test('un cambio de esquema exige invalidar propuestas mediante nueva versión de flujo', () =>
  fixture(({ root }) => {
    const errors = validateAssistantDocumentation({
      root,
      changedFiles: [operationPath, 'docs/assistant/flows.md', 'docs/assistant/CHANGELOG.md'],
      baseOperationSource: catalog.replace('title: z.string()', 'amount: z.number()'),
    })
    assert.ok(errors.some((error) => error.includes('OPERATION_VERSION')))
  }))
test('un cambio de estilo ajeno al flujo no exige documentación del asistente', () =>
  fixture(({ root }) => {
    assert.deepEqual(
      validateAssistantDocumentation({
        root,
        changedFiles: ['apps/dashboard/src/components/PersonalDetails.tsx'],
      }),
      [],
    )
  }))

test('cambiar el prompt separado exige actualizar la estrategia y el changelog', () =>
  fixture(({ root }) => {
    const errors = validateAssistantDocumentation({
      root,
      changedFiles: ['apps/dashboard/src/lib/ai/system-prompt.ts'],
    })
    assert.ok(errors.some((error) => error.includes('docs/assistant/README.md')))
    assert.ok(errors.some((error) => error.includes('CHANGELOG.md')))
  }))

test('vigila la política de zona horaria y los flujos manuales de gestación', () =>
  fixture(({ root }) => {
    const files = [
      'apps/dashboard/src/lib/ai/time-zone.ts',
      'apps/dashboard/src/hooks/useBreedingCRUD.ts',
      'apps/dashboard/src/components/ModalConfirmPregnancy.tsx',
    ]
    const errors = validateAssistantDocumentation({ root, changedFiles: files })
    assert.ok(errors.some((error) => error.includes('knowledge.md')))
    assert.ok(errors.some((error) => error.includes('flows.md')))
  }))

test('vigila cambios en conversaciones, orquestación y navegación de usuario', () =>
  fixture(({ root }) => {
    for (const file of [
      'apps/dashboard/src/lib/ai/model-response.ts',
      'apps/dashboard/src/lib/ai/chat-service.ts',
      'apps/dashboard/src/hooks/useAiConversations.ts',
      'apps/dashboard/src/components/Navbar.tsx',
    ]) {
      const errors = validateAssistantDocumentation({ root, changedFiles: [file] })
      assert.ok(
        errors.some((error) => error.includes('README.md')),
        file,
      )
    }
  }))
