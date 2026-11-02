import type { AiProposalView } from './proposal-types'

/** Una alta por ID visible: conservar el borrador más reciente sin combinar sus datos. */
export function uniqueProposalGroup(proposals: AiProposalView[]) {
  const byTarget = new Map<string, AiProposalView>()
  for (const proposal of proposals) {
    const action = proposal.action
    const key =
      action.type === 'create_animal'
        ? `create:${action.payload.animalNumber.trim().toLocaleLowerCase('es-MX')}`
        : `proposal:${proposal.id}`
    const previous = byTarget.get(key)
    if (!previous || proposal.expiresAt > previous.expiresAt) byTarget.set(key, proposal)
  }
  return [...byTarget.values()]
}
