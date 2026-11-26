import { ChevronDown, Ellipsis, type LucideIcon } from 'lucide-react'
import { useRef } from 'react'
import styles from './RecordActions.module.css'

export type RecordAction = {
  label: string
  icon: LucideIcon
  tone?: 'green' | 'violet' | 'amber' | 'danger'
  disabled?: boolean
  run: () => void
}

export function RecordActions({
  label,
  context,
  actions,
  className,
}: {
  label: string
  context: string
  actions: RecordAction[]
  className?: string
}) {
  const details = useRef<HTMLDetailsElement>(null)
  const summary = useRef<HTMLElement>(null)

  function close() {
    if (details.current) details.current.open = false
    summary.current?.focus()
  }

  return (
    <details
      className={className ? `${styles.actions} ${className}` : styles.actions}
      ref={details}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && details.current?.open) {
          event.stopPropagation()
          close()
        }
      }}
    >
      <summary ref={summary} aria-label={`${label} · ${context}`}>
        <Ellipsis aria-hidden="true" />
        {label}
        <ChevronDown aria-hidden="true" />
      </summary>
      <div className={styles.choices} role="group" aria-label={context}>
        {actions.map(({ label: actionLabel, icon: Icon, tone, disabled, run }) => (
          <button
            data-tone={tone}
            disabled={disabled}
            key={actionLabel}
            type="button"
            onClick={() => {
              close()
              run()
            }}
          >
            <Icon aria-hidden="true" />
            {actionLabel}
          </button>
        ))}
      </div>
    </details>
  )
}
