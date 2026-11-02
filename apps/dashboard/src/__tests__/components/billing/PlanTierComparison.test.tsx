import { fireEvent, render, screen } from '@testing-library/react'
import { PlanTierComparison } from '@/components/billing/PlanTierComparison'
import { PLAN_TIERS } from '@/types/billing'

jest.mock('@/lib/firebase', () => ({ auth: { currentUser: { getIdToken: async () => 'token' } } }))
it('compara planes visibles y límites IA configurados sin mostrar costos internos', async () => {
  jest.mocked(fetch).mockResolvedValue({
    ok: true,
    json: async () => ({ freeDailyQueries: 3, paidTierId: 'pro', monthlyCreditUsd: 5 }),
  } as Response)
  const tiers = PLAN_TIERS.map((tier) => ({
    ...tier,
    isVisible: ['free', 'pro', 'rancho'].includes(tier.id),
  }))
  const onSelect = jest.fn()
  render(
    <PlanTierComparison
      tiers={tiers}
      currentTierId="free"
      requiredTierId="pro"
      onSelect={onSelect}
    />,
  )
  expect(await screen.findByText('USD 5 en créditos / mes')).toBeInTheDocument()
  expect(screen.getAllByText('3 consultas al día')).toHaveLength(1)
  expect(screen.getByText('USD 20 en créditos / mes')).toBeInTheDocument()
  expect(screen.queryByRole('columnheader', { name: 'Inicial' })).not.toBeInTheDocument()
  expect(screen.getByText('Después de cada pago mensual confirmado')).toBeInTheDocument()
  fireEvent.click(screen.getAllByRole('button', { name: 'Subir de plan' })[0])
  expect(onSelect).toHaveBeenCalledWith('pro')
})
