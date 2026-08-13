export const getMonthKey = (date: Date | string | undefined | null) => {
  if (!date) return null

  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return null

  return `${parsed.getFullYear()}-${parsed.getMonth()}`
}

export const isDateInMonthBuckets = (
  date: Date | string | undefined | null,
  monthKeys: ReadonlySet<string>,
) => {
  const key = getMonthKey(date)
  return key !== null && monthKeys.has(key)
}
