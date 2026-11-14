import { FARM_AREA_TYPES, type FarmArea } from '@/types/farm'

export const farm_area_types = FARM_AREA_TYPES.map((item) => item.value) as [
  FarmArea['type'],
  ...FarmArea['type'][],
]
export const farm_area_type_labels = Object.fromEntries(
  FARM_AREA_TYPES.map((item) => [item.value, item.label]),
) as Record<FarmArea['type'], string>

export const normalizeAreaName = (name: string) => name.trim().toLocaleLowerCase('es')

/** Área nueva lista para agregarse a `farms/{id}.areas`. Compartida por la UI y el asistente. */
export function buildFarmArea(
  input: Omit<FarmArea, 'id' | 'farmId' | 'createdAt' | 'updatedAt'>,
  farmId: string,
  now: Date,
  id = `area_${now.getTime()}_${Math.random().toString(36).slice(2, 11)}`,
): FarmArea {
  if (!farmId) throw new Error('Selecciona una granja primero')
  const name = input.name?.trim()
  if (!name) throw new Error('Escribe el nombre del área.')
  if (input.areaM2 != null && (!Number.isFinite(input.areaM2) || input.areaM2 <= 0))
    throw new Error('La superficie debe ser mayor que cero.')
  return { id, farmId, ...input, name, createdAt: now, updatedAt: now }
}
