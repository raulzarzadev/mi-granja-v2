import { z } from 'zod'
import type { AnimalListAiResponse } from './types'

const itemSchema = z.object({
  t: z.string().trim().min(1),
  c: z.enum(['high', 'medium', 'low']),
  i: z.number().int().nonnegative(),
  b: z.unknown().optional(),
})

// Recover only fully closed objects inside items; never complete a cut-off tag.
function recoverItems(text: string): unknown[] {
  const start = /"items"\s*:\s*\[/.exec(text)
  if (!start) return []
  const items: unknown[] = []
  let depth = 0
  let quoted = false
  let escaped = false
  let objectStart = -1
  for (let i = start.index + start[0].length; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') quoted = false
      continue
    }
    if (char === '"') quoted = true
    else if (char === '{') {
      if (depth++ === 0) objectStart = i
    } else if (char === '}' && depth > 0 && --depth === 0) {
      try {
        items.push(JSON.parse(text.slice(objectStart, i + 1)))
      } catch {
        /* Skip malformed entries. */
      }
    } else if (char === ']' && depth === 0) break
  }
  return items
}

export function parseAnimalListResponse(
  content: string,
  finishReason: string | undefined,
  imageCount: number,
): AnimalListAiResponse {
  let partial = finishReason === 'length'
  let decoded: { items?: unknown; notes?: unknown }
  try {
    decoded = JSON.parse(content)
  } catch {
    partial = true
    decoded = { items: recoverItems(content) }
  }
  if (!decoded || !Array.isArray(decoded.items))
    throw new Error('El lector no devolvió una lista válida.')
  const items: AnimalListAiResponse['items'] = []
  for (const value of decoded.items.slice(0, 150)) {
    const parsed = itemSchema.safeParse(value)
    if (!parsed.success || parsed.data.i >= imageCount) {
      partial = true
      continue
    }
    const { t, c, i, b } = parsed.data
    const box = z
      .tuple([
        z.number().min(0).max(999),
        z.number().min(0).max(999),
        z.number().min(1).max(1000),
        z.number().min(1).max(1000),
      ])
      .safeParse(b)
    const validBox = box.success && box.data[2] > box.data[0] && box.data[3] > box.data[1]
    items.push({
      raw: t,
      candidate: t,
      confidence: c,
      imageIndex: i,
      ...(validBox
        ? {
            box: {
              x: box.data[1],
              y: box.data[0],
              width: box.data[3] - box.data[1],
              height: box.data[2] - box.data[0],
            },
          }
        : {}),
    })
  }
  if (decoded.items.length > 150) partial = true
  if (partial && items.length === 0)
    throw new Error('La respuesta se cortó sin aretes completos recuperables.')
  return {
    items,
    notes: [
      partial
        ? `Lectura parcial: se recuperaron ${items.length} aretes. Compara con la foto; faltan entradas por revisar.`
        : '',
      typeof decoded.notes === 'string' ? decoded.notes : '',
    ]
      .filter(Boolean)
      .join('\n'),
  }
}
