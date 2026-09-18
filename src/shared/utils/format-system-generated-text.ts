const SYSTEM_TEXT_TRANSLATIONS: ReadonlyArray<
  readonly [pattern: RegExp, replacement: string]
> = [
  [
    /^Refund from purchase cancellation (.+)$/,
    "Reembolso por anulación de compra $1",
  ],
  [/^Purchase cancellation (.+)$/, "Anulación de compra $1"],
  [
    /^Refund from purchase return (.+)$/,
    "Reembolso por devolución de compra $1",
  ],
  [/^Supplier purchase return (.+)$/, "Devolución de compra a proveedor $1"],
];

export function formatSystemGeneratedText(value: string) {
  for (const [pattern, replacement] of SYSTEM_TEXT_TRANSLATIONS) {
    if (pattern.test(value)) {
      return value.replace(pattern, replacement);
    }
  }

  return value;
}
