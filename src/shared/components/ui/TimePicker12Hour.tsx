import { useMemo } from 'react'
import { SearchableSelect } from './SearchableSelect'
import styles from './TimePicker12Hour.module.css'

type TimePeriod = 'AM' | 'PM'

type TimePicker12HourProps = {
  ariaLabel: string
  disabled?: boolean
  value: string
  onChange: (value: string) => void
}

const hourOptions = Array.from({ length: 12 }, (_, index) => index + 1)
const standardMinuteOptions = Array.from({ length: 12 }, (_, index) =>
  String(index * 5).padStart(2, '0'),
)

function parseTime(value: string) {
  const [rawHour = '8', rawMinute = '00'] = value.split(':')
  const hour24 = Math.min(23, Math.max(0, Number(rawHour) || 0))
  const minute = String(Math.min(59, Math.max(0, Number(rawMinute) || 0))).padStart(
    2,
    '0',
  )

  return {
    hour12: hour24 % 12 || 12,
    minute,
    period: (hour24 >= 12 ? 'PM' : 'AM') as TimePeriod,
  }
}

function buildTime(hour12: number, minute: string, period: TimePeriod) {
  const hour24 =
    period === 'AM'
      ? hour12 === 12
        ? 0
        : hour12
      : hour12 === 12
        ? 12
        : hour12 + 12

  return `${String(hour24).padStart(2, '0')}:${minute}`
}

export function TimePicker12Hour({
  ariaLabel,
  disabled = false,
  value,
  onChange,
}: TimePicker12HourProps) {
  const parsedTime = parseTime(value)
  const minuteOptions = useMemo(
    () =>
      Array.from(new Set([...standardMinuteOptions, parsedTime.minute])).sort(
        (firstMinute, secondMinute) =>
          Number(firstMinute) - Number(secondMinute),
      ),
    [parsedTime.minute],
  )

  return (
    <div aria-label={ariaLabel} className={styles.picker} role="group">
      <SearchableSelect
        aria-label={`${ariaLabel}, hora`}
        className={styles.segment}
        disabled={disabled}
        value={String(parsedTime.hour12)}
        onChange={(event) =>
          onChange(
            buildTime(
              Number(event.target.value),
              parsedTime.minute,
              parsedTime.period,
            ),
          )
        }
      >
        {hourOptions.map((hour) => (
          <option key={hour} value={hour}>
            {String(hour).padStart(2, '0')}
          </option>
        ))}
      </SearchableSelect>
      <span aria-hidden="true" className={styles.separator}>
        :
      </span>
      <SearchableSelect
        aria-label={`${ariaLabel}, minutos`}
        className={styles.segment}
        disabled={disabled}
        value={parsedTime.minute}
        onChange={(event) =>
          onChange(
            buildTime(
              parsedTime.hour12,
              event.target.value,
              parsedTime.period,
            ),
          )
        }
      >
        {minuteOptions.map((minute) => (
          <option key={minute} value={minute}>
            {minute}
          </option>
        ))}
      </SearchableSelect>
      <div aria-label={`${ariaLabel}, periodo`} className={styles.periodToggle}>
        {(['AM', 'PM'] as const).map((period) => (
          <button
            aria-pressed={parsedTime.period === period}
            className={parsedTime.period === period ? styles.periodActive : undefined}
            disabled={disabled}
            key={period}
            type="button"
            onClick={() =>
              onChange(
                buildTime(parsedTime.hour12, parsedTime.minute, period),
              )
            }
          >
            {period === 'AM' ? 'a. m.' : 'p. m.'}
          </button>
        ))}
      </div>
    </div>
  )
}
