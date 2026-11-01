import { registrationStages } from '@/lib/animal-registration-stages'

const today = new Date(2026, 10, 1)

describe('etapas al registrar un animal', () => {
  it('espera una fecha válida y no futura', () => {
    expect(registrationStages('vaca', 'hembra', '', today)).toEqual([])
    expect(registrationStages('vaca', 'hembra', '2027-01-01', today)).toEqual([])
  })

  it('no permite etapas reproductivas para una cría recién nacida', () => {
    expect(registrationStages('vaca', 'hembra', '2026-10-25', today)).toEqual(['cria', 'descarte'])
  })

  it('permite destino de engorda o reproducción después de la edad de destete', () => {
    expect(registrationStages('vaca', 'macho', '2026-01-01', today)).toEqual([
      'engorda',
      'reproductor',
      'descarte',
    ])
  })

  it('limita gestación y lactancia a hembras con edad suficiente', () => {
    expect(registrationStages('vaca', 'macho', '2022-01-01', today)).not.toContain('embarazada')
    expect(registrationStages('vaca', 'macho', '2022-01-01', today)).not.toContain('lechera')
    expect(registrationStages('vaca', 'hembra', '2025-01-01', today)).toContain('embarazada')
    expect(registrationStages('vaca', 'hembra', '2025-01-01', today)).not.toContain('lechera')
    expect(registrationStages('vaca', 'hembra', '2022-01-01', today)).toEqual([
      'engorda',
      'reproductor',
      'embarazada',
      'lechera',
      'descarte',
    ])
  })

  it('excluye Cría para machos y hembras de dos años', () => {
    for (const gender of ['macho', 'hembra'] as const) {
      expect(registrationStages('vaca', gender, '2024-11-01', today)).not.toContain('cria')
    }
  })

  it('aplica la edad de destete de cada especie', () => {
    expect(registrationStages('oveja', 'hembra', '2026-08-15', today)).toContain('engorda')
    expect(registrationStages('vaca', 'hembra', '2026-08-15', today)).not.toContain('engorda')
  })
})
