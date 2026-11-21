export function formatDate(value: string, locale = 'en-US') {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
  }).format(new Date(value))
}
