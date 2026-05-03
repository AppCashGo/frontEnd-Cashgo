export function normalizeId(value: number | string): string {
  return String(value);
}

export function normalizeOptionalId(
  value: number | string | null | undefined,
): string | null {
  return value === null || value === undefined ? null : normalizeId(value);
}
