import { BACKUP_SCHEMA_JSON } from '@/lib/backup-format'
import { CURRENT_BACKUP_VERSION, validateBackupFile } from '@/lib/backup-serialization'
import { animals_genders, animals_stages, animals_types } from '@/types/animals'

it('the copyable format is valid JSON with current fields and vocabulary', () => {
  const guide = JSON.parse(BACKUP_SCHEMA_JSON)
  expect(guide._meta.version).toBe(CURRENT_BACKUP_VERSION)
  expect(guide._types.animal.imageUrl).toBeTruthy()
  expect(guide._types._reglas_de_negocio.campos_obligatorios_animal.split(', ')).toContain('id')
  for (const [field, values] of Object.entries({
    type: animals_types,
    stage: animals_stages,
    gender: animals_genders,
  })) {
    expect(guide._types.animal[field].split(' | ')).toEqual([...values])
  }
  // Filling the guide's arrays and placeholders produces a supported import.
  guide._meta.farmId = 'farm-1'
  guide._meta.exportDate = '2026-08-12T12:00:00.000Z'
  guide.animals = [
    {
      id: 'a-1',
      animalNumber: '001',
      type: 'vaca',
      stage: 'reproductor',
      gender: 'hembra',
      createdAt: guide._meta.exportDate,
      updatedAt: guide._meta.exportDate,
    },
  ]
  expect(validateBackupFile(guide, 'farm-1').valid).toBe(true)
})
