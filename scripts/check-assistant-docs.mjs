import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const operationPath = 'apps/dashboard/src/lib/ai/operations.ts'
const groups = [
  {
    name: 'conocimiento',
    pattern:
      /^apps\/dashboard\/src\/lib\/ai\/(?:actions|knowledge[^/]*|context-[^/]+|time-zone)\.ts$/,
    doc: 'docs/assistant/knowledge.md',
  },
  {
    name: 'acciones y flujos',
    pattern:
      /^(?:apps\/dashboard\/src\/(?:lib\/domain\/|lib\/record-movements\.ts$|lib\/ai\/(?:operations|proposals|proposal-[^/]+|types|server)\.ts$|hooks\/(?:useRecordMovements|useAnimalCRUD|useBreedingCRUD)\.ts$|components\/assistant\/|components\/(?:SimpleAnimalForm|ModalAnimalForm|ModalNewRecord|BreedingForm|ModalBreedingForm|ModalBirthForm|ModalSaleForm|ModalConfirmPregnancy)\.tsx$)|packages\/shared\/src\/(?:lib\/animal(?:-utils|BreedingConfig)|types\/(?:animals|breedings|farm))\.tsx?$)/,
    doc: 'docs/assistant/flows.md',
  },
  {
    name: 'orquestación y navegación',
    pattern:
      /^apps\/dashboard\/src\/(?:app\/api\/ai\/|lib\/ai\/(?:openrouter|system-prompt|model-response|chat-service)\.ts|hooks\/useAiConversations\.ts|components\/(?:AiAssistant\.tsx|Navbar\.tsx|Dashboard\/Dashboard\.tsx|Dashboard\/QuickCreateButton\.tsx))/,
    doc: 'docs/assistant/README.md',
  },
]

export function validateAssistantDocumentation({
  root,
  changedFiles = [],
  baseOperationSource = null,
}) {
  const errors = []
  const read = (path) => readFileSync(resolve(root, path), 'utf8')
  const manifest = JSON.parse(read('docs/assistant/manifest.json'))
  const operationSource = read(operationPath)
  const knowledgeSource = read('apps/dashboard/src/lib/ai/knowledge.ts')
  const flowVersion = Number(operationSource.match(/OPERATION_VERSION\s*=\s*(\d+)/)?.[1])
  const knowledgeVersion = Number(
    knowledgeSource.match(/AI_KNOWLEDGE_SCHEMA_VERSION\s*=\s*(\d+)/)?.[1],
  )
  if (flowVersion !== manifest.flowVersion)
    errors.push(
      'Actualizar flowVersion en docs/assistant/manifest.json para que coincida con OPERATION_VERSION.',
    )
  if (knowledgeVersion !== manifest.knowledgeVersion)
    errors.push(
      'Actualizar knowledgeVersion en docs/assistant/manifest.json para que coincida con AI_KNOWLEDGE_SCHEMA_VERSION.',
    )
  const catalog = operationSource.split('export const operationCatalog =')[1] || ''
  const operations = [...catalog.matchAll(/type:\s*'([^']+)'/g)].map((match) => match[1]).sort()
  if (JSON.stringify(operations) !== JSON.stringify([...manifest.operations].sort()))
    errors.push('El catálogo de operaciones y docs/assistant/manifest.json no coinciden.')
  const flows = read('docs/assistant/flows.md')
  for (const operation of operations)
    if (!flows.includes(`\`${operation}\``))
      errors.push(`Documentar la operación ${operation} en docs/assistant/flows.md.`)
  for (const source of manifest.sources)
    if (!existsSync(resolve(root, source))) errors.push(`Fuente documentada inexistente: ${source}`)
  const changed = new Set(changedFiles)
  const impacted = groups.filter((group) => changedFiles.some((file) => group.pattern.test(file)))
  for (const group of impacted)
    if (!changed.has(group.doc))
      errors.push(`Hay cambios de ${group.name}: actualizar ${group.doc} en el mismo cambio.`)
  if (impacted.length && !changed.has('docs/assistant/CHANGELOG.md'))
    errors.push(
      'Registrar el impacto o la ausencia de cambios funcionales en docs/assistant/CHANGELOG.md.',
    )
  if (baseOperationSource && changed.has(operationPath)) {
    const schema = (source) =>
      (
        source
          .split('export const operationActionSchema =')[1]
          ?.split('export type OperationAction')[0] || ''
      )
        .replace(/\/\/[^\n]*/g, '')
        .replace(/\s+/g, '')
    const baseVersion = Number(baseOperationSource.match(/OPERATION_VERSION\s*=\s*(\d+)/)?.[1])
    if (schema(baseOperationSource) !== schema(operationSource) && baseVersion === flowVersion)
      errors.push(
        'Cambió el esquema de operaciones sin incrementar OPERATION_VERSION; las propuestas anteriores deben invalidarse.',
      )
  }
  return errors
}

function main() {
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
  const args = process.argv.slice(2)
  const baseIndex = args.indexOf('--base')
  const base = baseIndex >= 0 ? args[baseIndex + 1] : null
  if (baseIndex >= 0 && !base)
    throw new Error('Uso: pnpm check:assistant-docs [--base <referencia-git>]')
  const git = (args) =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean)
  const changedFiles = [
    ...new Set([
      ...(base ? git(['diff', '--name-only', `${base}...HEAD`]) : []),
      ...git(['diff', '--name-only', 'HEAD']),
      ...git(['ls-files', '--others', '--exclude-standard']),
    ]),
  ]
  let baseOperationSource = null
  try {
    baseOperationSource = execFileSync('git', ['show', `${base || 'HEAD'}:${operationPath}`], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
  } catch {
    /* New operation catalog has no previous schema. */
  }
  const errors = validateAssistantDocumentation({ root, changedFiles, baseOperationSource })
  if (errors.length) {
    process.stderr.write(
      `Documentación del asistente pendiente:\n${errors.map((error) => `- ${error}`).join('\n')}\n`,
    )
    process.exitCode = 1
  } else process.stdout.write('Documentación y contratos del asistente coherentes.\n')
}
if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    process.stderr.write(`${error.message}\n`)
    process.exitCode = 1
  }
}
