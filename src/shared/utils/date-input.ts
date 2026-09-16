const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function createLocalDateFromDateInput(value: string) {
  const [year, month, day] = value.split('-').map(Number)

  return new Date(year, month - 1, day)
}

export function toDateInputValue(value: string | Date) {
  const date =
    typeof value === 'string' && DATE_INPUT_PATTERN.test(value)
      ? createLocalDateFromDateInput(value)
      : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function getTodayDateInput() {
  return toDateInputValue(new Date())
}

export function toOperationDateTime(
  value: string,
  timeSource: string | Date = new Date(),
) {
  if (!DATE_INPUT_PATTERN.test(value)) {
    return value
  }

  const operationDate = createLocalDateFromDateInput(value)
  const sourceDate = new Date(timeSource)

  if (Number.isNaN(operationDate.getTime()) || Number.isNaN(sourceDate.getTime())) {
    return value
  }

  operationDate.setHours(
    sourceDate.getHours(),
    sourceDate.getMinutes(),
    sourceDate.getSeconds(),
    sourceDate.getMilliseconds(),
  )

  return operationDate.toISOString()
}

export function toDateOnlyRequestDate(value: string) {
  if (!DATE_INPUT_PATTERN.test(value)) {
    return value
  }

  const date = createLocalDateFromDateInput(value)
  date.setHours(12, 0, 0, 0)
  return date.toISOString()
}
