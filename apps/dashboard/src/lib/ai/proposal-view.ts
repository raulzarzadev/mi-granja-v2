import { operationActionSchema } from './operations'
import type { AiProposalView } from './proposal-types'

/** Local chat snapshots are display-only; the server remains authoritative. */
export function parseProposalView(value: unknown): AiProposalView | undefined {
  if (!value || typeof value !== 'object') return undefined
  const view = value as Record<string, unknown>
  const action = operationActionSchema.safeParse(view.action)
  if (
    typeof view.id !== 'string' ||
    !view.id ||
    typeof view.farmId !== 'string' ||
    typeof view.conversationId !== 'string' ||
    !Number.isInteger(view.revision) ||
    Number(view.revision) < 1 ||
    !['ready', 'succeeded', 'cancelled', 'expired', 'conflict'].includes(String(view.status)) ||
    typeof view.title !== 'string' ||
    typeof view.summary !== 'string' ||
    typeof view.expiresAt !== 'string' ||
    !Array.isArray(view.effects) ||
    !view.effects.every((effect) => typeof effect === 'string') ||
    !action.success
  )
    return undefined
  let receipt: AiProposalView['receipt']
  if (view.receipt && typeof view.receipt === 'object') {
    const candidate = view.receipt as Record<string, unknown>
    if (
      ['commandId', 'recordId', 'message', 'href', 'completedAt'].every(
        (key) => typeof candidate[key] === 'string',
      )
    ) {
      receipt = candidate as unknown as AiProposalView['receipt']
    }
  }
  if (view.status === 'succeeded' && !receipt) return undefined
  return {
    id: view.id,
    farmId: view.farmId,
    conversationId: view.conversationId,
    revision: Number(view.revision),
    status: view.status as AiProposalView['status'],
    action: action.data,
    title: view.title,
    summary: view.summary,
    effects: view.effects as string[],
    expiresAt: view.expiresAt,
    ...(receipt ? { receipt } : {}),
  }
}
