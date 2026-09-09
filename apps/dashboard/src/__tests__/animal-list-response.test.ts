import { parseAnimalListResponse } from '@/lib/ai/animal-list-response'

const item = { t: '147-A', c: 'high', i: 0, b: [200, 100, 230, 180] }
describe('animal list response recovery', () => {
  it('keeps a full list of 150 tags and coordinates', () => {
    const result = parseAnimalListResponse(
      JSON.stringify({ items: Array.from({ length: 150 }, () => item), notes: '' }),
      'stop',
      1,
    )
    expect(result.items).toHaveLength(150)
    expect(result.items[0].box).toEqual({ x: 100, y: 200, width: 80, height: 30 })
    expect(result.notes).toBe('')
  })
  it('recovers complete entries without inventing the truncated one', () => {
    const result = parseAnimalListResponse(
      '{"items":[' + JSON.stringify(item) + ',{"t":"14',
      'length',
      1,
    )
    expect(result.items.map((x) => x.raw)).toEqual(['147-A'])
    expect(result.notes).toContain('Lectura parcial')
  })
  it('does not discard a readable tag because its crop is invalid', () => {
    const result = parseAnimalListResponse(
      JSON.stringify({ items: [{ ...item, b: [0, 0, 0, 0] }] }),
      'stop',
      1,
    )
    expect(result.items[0].raw).toBe('147-A')
    expect(result.items[0].box).toBeUndefined()
  })
  it('handles quoted braces while recovering', () => {
    const result = parseAnimalListResponse(
      '{"items":[' + JSON.stringify({ ...item, t: '14"}7' }) + ',',
      'length',
      1,
    )
    expect(result.items[0].raw).toBe('14"}7')
  })
  it('rejects responses with no recoverable items', () => {
    expect(() => parseAnimalListResponse('{"items":[{"t":', 'length', 1)).toThrow()
  })
})
