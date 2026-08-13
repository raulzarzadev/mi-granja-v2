import { animal_stage_config, breeding_animal_status_labels } from '../types/animals'

describe('terminología de gestación', () => {
  it('muestra Gestante en las condiciones reproductivas', () => {
    expect(breeding_animal_status_labels.embarazada).toBe('Gestante')
    expect(animal_stage_config.embarazos.label).toBe('Gestantes')
  })
})
