import type { OperationAction } from './operations'

export type AiProposalStatus = 'ready' | 'succeeded' | 'cancelled' | 'expired' | 'conflict'
export interface AiActionReceipt {
  commandId: string
  recordId: string
  message: string
  href: string
  completedAt: string
}
export interface AiProposalView {
  id: string
  farmId: string
  conversationId: string
  revision: number
  status: AiProposalStatus
  action: OperationAction
  title: string
  summary: string
  effects: string[]
  expiresAt: string
  receipt?: AiActionReceipt
}
