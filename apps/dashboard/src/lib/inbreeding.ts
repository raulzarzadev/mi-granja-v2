import type { Animal } from '@/types/animals'

export interface InbreedingEstimate {
  coefficient: number
  percentage: number
  index: number
}

const MAX_PEDIGREE_GENERATIONS = 5

function riskIndex(coefficient: number): number {
  if (coefficient <= 0) return 0
  if (coefficient <= 0.015625) return 3
  if (coefficient <= 0.0625) return 5
  if (coefficient <= 0.125) return 7
  if (coefficient <= 0.25) return 9
  return 10
}

/**
 * Estima la consanguinidad de una posible cría a partir de los caminos hacia
 * ancestros comunes dentro de las generaciones disponibles del pedigrí.
 */
export function estimateOffspringInbreeding(
  female: Animal,
  male: Animal,
  animals: Animal[],
  maxGenerations = MAX_PEDIGREE_GENERATIONS,
): InbreedingEstimate {
  const byId = new Map(animals.map((animal) => [animal.id, animal]))
  const byNumber = new Map(animals.map((animal) => [animal.animalNumber, animal]))
  const resolve = (id: string) => byId.get(id) ?? byNumber.get(id)

  const pathsToAncestors = (animal: Animal) => {
    const paths = new Map<string, string[][]>()

    const visit = (current: Animal, path: string[], depth: number) => {
      const currentPaths = paths.get(current.id) ?? []
      currentPaths.push(path)
      paths.set(current.id, currentPaths)

      if (depth >= maxGenerations) return

      for (const parentRef of [current.motherId, current.fatherId]) {
        if (!parentRef) continue
        const parent = resolve(parentRef)
        const parentId = parent?.id ?? parentRef
        if (path.includes(parentId)) continue

        if (parent) {
          visit(parent, [...path, parentId], depth + 1)
        } else {
          const missingPaths = paths.get(parentId) ?? []
          missingPaths.push([...path, parentId])
          paths.set(parentId, missingPaths)
        }
      }
    }

    visit(animal, [animal.id], 0)
    return paths
  }

  const femalePaths = pathsToAncestors(female)
  const malePaths = pathsToAncestors(male)
  let coefficient = 0

  for (const [ancestorId, leftPaths] of femalePaths) {
    const rightPaths = malePaths.get(ancestorId)
    if (!rightPaths) continue

    for (const leftPath of leftPaths) {
      for (const rightPath of rightPaths) {
        // Un camino válido no puede cruzarse antes de llegar al ancestro común.
        const leftIntermediate = new Set(leftPath.slice(0, -1))
        if (rightPath.slice(0, -1).some((id) => leftIntermediate.has(id))) continue

        const femaleDistance = leftPath.length - 1
        const maleDistance = rightPath.length - 1
        coefficient += 0.5 ** (femaleDistance + maleDistance + 1)
      }
    }
  }

  const normalizedCoefficient = Math.min(coefficient, 1)
  return {
    coefficient: normalizedCoefficient,
    percentage: normalizedCoefficient * 100,
    index: riskIndex(normalizedCoefficient),
  }
}

export function highestOffspringInbreeding(
  male: Animal | undefined,
  femaleIds: string[],
  animals: Animal[],
): InbreedingEstimate {
  const empty: InbreedingEstimate = { coefficient: 0, percentage: 0, index: 0 }
  if (!male) return empty

  return femaleIds.reduce<InbreedingEstimate>((highest, femaleId) => {
    const female = animals.find((animal) => animal.id === femaleId)
    if (!female) return highest
    const estimate = estimateOffspringInbreeding(female, male, animals)
    return estimate.coefficient > highest.coefficient ? estimate : highest
  }, empty)
}
