export function normalizeNumber(
  value: number | string | null | undefined,
  fallbackValue = 0,
) {
  if (value === null || value === undefined) {
    return fallbackValue
  }

  const parsedValue =
    typeof value === 'number' ? value : Number.parseFloat(value)

  return Number.isFinite(parsedValue) ? parsedValue : fallbackValue
}
