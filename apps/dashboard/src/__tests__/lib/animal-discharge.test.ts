import { animalDeathReasonLabels, buildDeathStatusNotes } from '@/lib/animal-discharge'

describe('animal discharge helpers', () => {
  it('provides all supported death reasons', () => {
    expect(animalDeathReasonLabels).toEqual({
      birth_defect: 'Defecto de nacimiento',
      disease: 'Enfermedad',
      injury: 'Lesión',
      attack: 'Ataque',
    })
  })

  it('keeps a compatible readable status note', () => {
    expect(buildDeathStatusNotes('disease', '  Fiebre alta durante dos días.  ')).toBe(
      'Enfermedad: Fiebre alta durante dos días.',
    )
  })
})
