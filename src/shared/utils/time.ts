const TIME_24_HOUR_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

export function formatTime12Hour(value: string) {
  const match = TIME_24_HOUR_PATTERN.exec(value)

  if (!match) {
    return value
  }

  const hour = Number(match[1])
  const minute = match[2]
  const displayHour = hour % 12 || 12
  const period = hour >= 12 ? 'p. m.' : 'a. m.'

  return `${displayHour}:${minute} ${period}`
}
