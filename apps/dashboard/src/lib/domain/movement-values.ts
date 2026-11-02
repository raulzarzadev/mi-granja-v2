export const movementEqual = (a: unknown, b: unknown): boolean => {
  const normalize = (value: unknown): unknown => {
    if (value instanceof Date) return value.getTime()
    if (Array.isArray(value)) return value.map(normalize)
    if (value && typeof value === 'object') {
      const o = value as Record<string, unknown>
      if (typeof o.seconds === 'number') {
        const nanoseconds = typeof o.nanoseconds === 'number' ? o.nanoseconds : 0
        return o.seconds * 1000 + Math.floor(nanoseconds / 1_000_000)
      }
      return Object.fromEntries(
        Object.keys(o)
          .filter((k) => o[k] !== undefined && o[k] !== null)
          .sort()
          .map((k) => [k, normalize(o[k])]),
      )
    }
    return value ?? null
  }
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b))
}
