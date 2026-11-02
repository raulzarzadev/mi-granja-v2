import type { FarmPermission } from '@/types/farm'
import type { AiContextAccess } from './actions'
import { type AiKnowledgeBundle, buildAiKnowledge } from './knowledge'
import { callAiProvider } from './openrouter'
import type { AiProposalView } from './proposal-types'
import {
  AiProposalError,
  availableOperationCatalog,
  createAiProposal,
  getAiProposal,
} from './proposals'
import { dateInTimeZone } from './time-zone'

type History = { role: 'user' | 'assistant'; text: string; proposalId?: string }[]
const topicPath = {
  animals: 'animales/catalogo.json',
  breedings: 'reproduccion/empadres.json',
  weaning: 'pendientes/destetes.json',
  births: 'reproduccion/partos.json',
  movements: 'historial/movimientos.json',
  milk: 'produccion/leche.json',
  reminders: 'pendientes/recordatorios.json',
} as const

function modelContext(bundle: AiKnowledgeBundle, timeZone: string) {
  return { ...bundle, index: { ...bundle.index, localDate: dateInTimeZone(new Date(), timeZone) } }
}

/** One user query may fetch a few scoped pages; none of these paths can execute a write. */
export async function runOperationalChat(params: {
  farmId: string
  farmName: string
  userId: string
  conversationId: string
  permissions: FarmPermission[]
  timeZone: string
  message: string
  history: History
  access: AiContextAccess
}) {
  const proposalIds = [
    ...new Set(
      params.history
        .filter((item) => item.role === 'assistant' && item.proposalId)
        .map((item) => item.proposalId!),
    ),
  ].slice(-10)
  const verified = await Promise.allSettled(
    proposalIds.map((proposalId) =>
      getAiProposal({
        userId: params.userId,
        farmId: params.farmId,
        permissions: params.permissions,
        proposalId,
      }),
    ),
  )
  const conversationActions = verified.flatMap((result) => {
    if (result.status !== 'fulfilled' || result.value.conversationId !== params.conversationId)
      return []
    const proposal = result.value
    return [
      {
        title: proposal.title,
        status: proposal.status,
        summary: proposal.summary,
        ...(proposal.receipt
          ? {
              receipt: {
                message: proposal.receipt.message,
                href: proposal.receipt.href,
                completedAt: proposal.receipt.completedAt,
              },
            }
          : {}),
      },
    ]
  })
  const relevanceMessage = [
    ...params.history
      .filter((item) => item.role === 'user')
      .slice(-6)
      .map((item) => item.text),
    params.message,
  ]
    .join('\n')
    .slice(-12000)
  const options = {
    farmName: params.farmName,
    timeZone: params.timeZone,
    operations: availableOperationCatalog(params.permissions),
  }
  let bundle = await buildAiKnowledge(params.farmId, relevanceMessage, params.access, options)
  const loaded: Record<string, unknown> = {}
  const seen = new Set<string>()
  let usedTokens = 0
  let totalCost = 0
  for (let step = 0; step < 4; step++) {
    const result = await callAiProvider({
      message: params.message,
      farmName: params.farmName,
      history: params.history,
      context: {
        ...modelContext(bundle, params.timeZone),
        paginasConsultadas: Object.values(loaded),
        accionesDeLaConversacion: conversationActions,
      },
    })
    const rawUsage =
      result.usage && typeof result.usage === 'object'
        ? (result.usage as Record<string, unknown>)
        : {}
    usedTokens += Number(rawUsage.total_tokens ?? rawUsage.totalTokens ?? 0) || 0
    totalCost += Number(rawUsage.cost ?? rawUsage.total_cost ?? rawUsage.totalCost ?? 0) || 0
    const usage = { total_tokens: usedTokens, cost: totalCost }
    if (result.parsed.kind === 'read_document') {
      const request = result.parsed.documentRequest
      const path = topicPath[request.topic]
      const document = bundle.documents[path]
      const requestKey = `${request.topic}:${request.offset}:${request.limit}`
      if (!document?.available || seen.has(requestKey) || step === 3) {
        return {
          ...result,
          usage,
          parsed: {
            kind: 'needs_clarification' as const,
            message: !document?.available
              ? 'No tengo acceso a los datos necesarios para esa consulta en esta granja.'
              : 'Necesito precisar la consulta. Indica el número de animal o el empadre que quieres revisar.',
          },
          proposal: undefined,
          knowledge: { generatedAt: bundle.generatedAt, timeZone: params.timeZone },
        }
      }
      seen.add(requestKey)
      bundle = await buildAiKnowledge(params.farmId, relevanceMessage, params.access, {
        ...options,
        page: request,
      })
      loaded[requestKey] = bundle.documents[path]
      continue
    }
    let proposal: AiProposalView | undefined
    let parsed = result.parsed
    if (parsed.kind === 'proposed_action') {
      try {
        proposal = await createAiProposal({
          action: parsed.action,
          userId: params.userId,
          farmId: params.farmId,
          permissions: params.permissions,
          conversationId: params.conversationId,
          timeZone: params.timeZone,
        })
        parsed = {
          ...parsed,
          message: 'Preparé la propuesta. Revisa los datos antes de confirmar.',
        }
      } catch (error) {
        // Invalid business inputs become a clarification, never an unreviewed command.
        if (error instanceof AiProposalError && error.status < 500) {
          parsed = { kind: 'needs_clarification', message: error.message }
        } else {
          throw error
        }
      }
    }
    return {
      ...result,
      parsed,
      proposal,
      usage,
      knowledge: { generatedAt: bundle.generatedAt, timeZone: params.timeZone },
    }
  }
  throw new Error('Se alcanzó el límite de lecturas del asistente')
}
