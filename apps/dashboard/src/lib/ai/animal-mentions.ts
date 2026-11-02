import type { Animal } from '@/types/animals'

type MentionAnimal = Pick<Animal, 'id' | 'animalNumber' | 'name' | 'farmId'>
export type AnimalMentionIndex = Map<string, { id: string; number: string }>
const key = (value: string) => value.trim().toLocaleLowerCase('es-MX')

/** Only exact, unambiguous references belonging to the current farm become links. */
export function buildAnimalMentionIndex(
  animals: MentionAnimal[],
  farmId?: string,
): AnimalMentionIndex {
  const candidates = new Map<string, Map<string, { id: string; number: string }>>()
  if (!farmId) return new Map()
  for (const animal of animals) {
    if (animal.farmId !== farmId) continue
    for (const alias of [animal.animalNumber, animal.name]) {
      if (!alias?.trim()) continue
      const normalized = key(alias)
      const matches = candidates.get(normalized) ?? new Map()
      matches.set(animal.id, { id: animal.id, number: animal.animalNumber })
      candidates.set(normalized, matches)
    }
  }
  return new Map(
    [...candidates].flatMap(([alias, matches]) =>
      matches.size === 1 ? [[alias, [...matches.values()][0]] as const] : [],
    ),
  )
}

export function exactAnimalMention(text: string, index: AnimalMentionIndex) {
  return index.get(key(text.replace(/^#/, '')))
}

export function animalMentionParts(
  text: string,
  index: AnimalMentionIndex,
): { text: string; animal?: { id: string; number: string } }[] {
  if (!index.size) return [{ text }]
  const aliases = [...index.keys()]
    .sort((a, b) => b.length - a.length)
    .map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp(
    `(^|[^\\p{L}\\p{N}_])(${aliases.join('|')})(?=$|[^\\p{L}\\p{N}_])`,
    'giu',
  )
  const dates = [...text.matchAll(/\b\d{1,4}[-/]\d{1,2}[-/]\d{1,4}\b/g)].map((match) => [
    match.index!,
    match.index! + match[0].length,
  ])
  const parts: { text: string; animal?: { id: string; number: string } }[] = []
  let cursor = 0
  for (const match of text.matchAll(pattern)) {
    const start = match.index! + match[1].length
    const end = start + match[2].length
    if (
      /^\d+$/.test(match[2]) &&
      (dates.some(([a, b]) => start >= a && end <= b) ||
        /^\s*(?:kg|ml|litros?|años?|meses?|días?|%|usd)\b/i.test(text.slice(end)) ||
        /\d[.,:]$/.test(text.slice(0, start)) ||
        /^[.,:]\d/.test(text.slice(end)))
    )
      continue
    if (start > cursor) parts.push({ text: text.slice(cursor, start) })
    parts.push({ text: match[2], animal: index.get(key(match[2])) })
    cursor = end
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) })
  return parts.length ? parts : [{ text }]
}
