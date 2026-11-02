'use client'

import { uniqueProposalGroup } from '@/lib/ai/proposal-group'
import type { AiProposalView } from '@/lib/ai/proposal-types'
import ProposalCard from './ProposalCard'

export default function BatchProposalCard({
  proposals: incoming,
  farmId,
  conversationId,
  onChange,
  onNavigate,
}: {
  proposals: AiProposalView[]
  farmId: string
  conversationId: string
  onChange: (proposal: AiProposalView) => void
  onNavigate: (href: string) => void
}) {
  const proposals = uniqueProposalGroup(incoming)
  return (
    <section className="mt-3 space-y-2 rounded-xl border border-amber-200 bg-white p-3">
      <h3 className="text-sm font-semibold">Lote de {proposals.length} movimientos</h3>
      <p className="text-xs leading-5 text-amber-900">
        Los movimientos en masa pueden ser peligrosos si los datos son incorrectos. Revisa con
        cuidado los animales, fechas y cantidades. Confirma cada acción por separado.
      </p>
      {proposals.map((proposal) => (
        <ProposalCard
          key={proposal.id}
          compact
          initialProposal={proposal}
          farmId={farmId}
          conversationId={conversationId}
          onChange={onChange}
          onNavigate={onNavigate}
        />
      ))}
    </section>
  )
}
