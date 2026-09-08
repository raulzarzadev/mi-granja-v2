import { ANIMAL_BREEDING_CONFIGS } from '@/lib/animalBreedingConfig'
import type { Animal } from '@/types/animals'

// Informational only: pedigree paths describe documented relationships, not a DNA estimate.
export function breedingWarnings(
  female: Animal,
  male: Animal,
  animals: Animal[],
  date = new Date(),
): string[] {
  const warnings: string[] = []
  const config = ANIMAL_BREEDING_CONFIGS[female.type]
  const birth = female.birthDate ? new Date(female.birthDate) : null
  const age =
    birth && Number.isFinite(birth.getTime())
      ? (date.getTime() - birth.getTime()) / (86400000 * 30.4375)
      : female.age
  if (age == null || !Number.isFinite(age))
    warnings.push('Edad desconocida: verifica antes del empadre.')
  else if (age < config.minBreedingAge) {
    const days = Math.ceil((config.minBreedingAge - age) * 30.4375)
    warnings.push(
      `Fuera de edad reproductiva: faltan aproximadamente ${days} días para los ${config.minBreedingAge} meses.`,
    )
  } else if (config.maxBreedingAge && age > config.maxBreedingAge) {
    warnings.push(`Supera la edad reproductiva recomendada de ${config.maxBreedingAge} meses.`)
  }
  const byId = new Map(animals.map((animal) => [animal.id, animal]))
  const resolve = (id: string) =>
    byId.get(id) ?? animals.find((animal) => animal.animalNumber === id)
  const ancestors = (animal: Animal) => {
    const distances = new Map<string, number>([[animal.id, 0]])
    const queue: Array<[Animal, number]> = [[animal, 0]]
    while (queue.length) {
      const [current, depth] = queue.shift()!
      if (depth >= 5) continue
      for (const parentId of [current.motherId, current.fatherId]) {
        if (!parentId) continue
        const parent = resolve(parentId)
        const key = parent?.id ?? parentId
        if (distances.has(key)) continue
        distances.set(key, depth + 1)
        if (parent) queue.push([parent, depth + 1])
      }
    }
    return distances
  }
  const maternal = ancestors(female)
  const paternal = ancestors(male)
  const common = [...maternal]
    .filter(([id]) => paternal.has(id))
    .sort(([a, da], [b, db]) => da + paternal.get(a)! - db - paternal.get(b)!)
  if (common.length) {
    const [id, left] = common[0]
    const right = paternal.get(id)!
    const relationship =
      left === 0 || right === 0
        ? 'ascendiente y descendiente'
        : left === 1 && right === 1
          ? 'hermanos o medios hermanos'
          : left === 2 && right === 2
            ? 'primos'
            : 'parentesco por ancestro compartido'
    warnings.push(
      `Parentesco con #${male.animalNumber}: ${relationship}. Ancestro #${resolve(id)?.animalNumber ?? id} (${left} y ${right} generaciones).`,
    )
  } else {
    warnings.push(
      'Sin parentesco detectado en el pedigree disponible (hasta 5 generaciones); no descarta consanguinidad.',
    )
  }
  return warnings
}
