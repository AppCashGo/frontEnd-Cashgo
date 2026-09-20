export function normalizeWhatsAppPhone(value: string) {
  const digits = value.replace(/\D/g, '').replace(/^00/, '')

  if (digits.length === 10 && digits.startsWith('3')) {
    return `57${digits}`
  }

  return digits
}
