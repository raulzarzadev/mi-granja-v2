import { render, screen } from '@testing-library/react'
import StageGuidePage from '@/components/onboarding/StageGuidePage'

describe('StageGuidePage', () => {
  it('muestra edad máxima productiva y edad máxima por especie', () => {
    render(<StageGuidePage />)
    expect(screen.getByText(/Reproducción desde 8 meses hasta 8 años/)).toBeInTheDocument()
    expect(screen.getAllByText(/Edad máxima productiva:/).length).toBeGreaterThan(0)
    expect(screen.getByText(/alrededor de 12 años de vida/)).toBeInTheDocument()
    expect(screen.getByText(/alrededor de 30 años de vida/)).toBeInTheDocument()
  })
})
