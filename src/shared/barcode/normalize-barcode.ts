export function normalizeBarcode(value: string) {
  return value.replace(/\s+/g, '').trim()
}

export function isUsableBarcode(value: string) {
  const normalized = normalizeBarcode(value)
  return normalized.length >= 4 && normalized.length <= 120
}
