import { auth } from '@/lib/firebase'
import type { OperationAction } from './operations'
import type { AiProposalView } from './proposal-types'
import { parseProposalView } from './proposal-view'

export class ProposalRequestError extends Error {
  constructor(
    message: string,
    public proposal?: AiProposalView,
    public status?: number,
  ) {
    super(message)
  }
}

export function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export async function requestProposal(
  input: {
    farmId: string
    proposalId: string
    operation: 'get' | 'revise' | 'confirm' | 'cancel'
    revision?: number
    action?: OperationAction
  },
  signal?: AbortSignal,
): Promise<AiProposalView> {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error('Inicia sesión para revisar esta acción.')
  const { action, ...request } = input
  const response = await fetch('/api/ai/confirm-action', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      ...request,
      ...(input.operation === 'revise' && action ? { action } : {}),
      timeZone: browserTimeZone(),
    }),
  })
  const data = await response.json().catch(() => ({}))
  const proposal = parseProposalView(data.proposal)
  if (!response.ok)
    throw new ProposalRequestError(
      typeof data.error === 'string' ? data.error : 'No se pudo comprobar esta acción.',
      proposal?.farmId === input.farmId && proposal?.id === input.proposalId ? proposal : undefined,
      response.status,
    )
  if (!proposal || proposal.farmId !== input.farmId || proposal.id !== input.proposalId) {
    throw new Error('No se pudo comprobar esta acción. Vuelve a actualizar su estado.')
  }
  return proposal
}

export async function recoverConversationProposals(
  farmId: string,
  conversationId: string,
): Promise<AiProposalView[]> {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error('Inicia sesión para recuperar las propuestas.')
  const response = await fetch('/api/ai/confirm-action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ farmId, conversationId, operation: 'list' }),
  })
  const data = await response.json()
  if (!response.ok || !Array.isArray(data.proposals))
    throw new Error('No se pudieron recuperar las propuestas. Intenta nuevamente.')
  return data.proposals
    .map(parseProposalView)
    .filter(
      (proposal: AiProposalView | undefined): proposal is AiProposalView =>
        !!proposal && proposal.farmId === farmId && proposal.conversationId === conversationId,
    )
}
