import {
  AlertCircle,
  Ban,
  CheckCircle2,
  CloudOff,
  Loader2,
  SearchX,
  TriangleAlert,
} from 'lucide-react'
import { type ReactNode } from 'react'
import { joinClassNames } from '@/shared/utils/join-class-names'
import styles from './AsyncStateBlock.module.css'

type AsyncStateTone =
  | 'neutral'
  | 'loading'
  | 'error'
  | 'warning'
  | 'success'
  | 'offline'
  | 'empty'
  | 'unauthorized'

type AsyncStateVariant = 'page' | 'panel' | 'inline'

type AsyncStateBlockProps = {
  title: string
  description?: string
  tone?: AsyncStateTone
  variant?: AsyncStateVariant
  actionLabel?: string
  onAction?: () => void
  className?: string
  children?: ReactNode
  icon?: ReactNode
}

function getDefaultIcon(tone: AsyncStateTone) {
  switch (tone) {
    case 'loading':
      return <Loader2 size={24} strokeWidth={2.4} />
    case 'error':
      return <AlertCircle size={24} strokeWidth={2.4} />
    case 'warning':
      return <TriangleAlert size={24} strokeWidth={2.4} />
    case 'success':
      return <CheckCircle2 size={24} strokeWidth={2.4} />
    case 'offline':
      return <CloudOff size={24} strokeWidth={2.4} />
    case 'unauthorized':
      return <Ban size={24} strokeWidth={2.4} />
    case 'empty':
      return <SearchX size={24} strokeWidth={2.4} />
    default:
      return <AlertCircle size={24} strokeWidth={2.4} />
  }
}

export function AsyncStateBlock({
  actionLabel,
  children,
  className,
  description,
  icon,
  onAction,
  title,
  tone = 'neutral',
  variant = 'panel',
}: AsyncStateBlockProps) {
  return (
    <section
      className={joinClassNames(
        styles.state,
        styles[variant],
        styles[tone],
        className,
      )}
    >
      <span className={styles.icon}>{icon ?? getDefaultIcon(tone)}</span>
      <h2 className={styles.title}>{title}</h2>
      {description ? <p className={styles.description}>{description}</p> : null}
      {children ? <div className={styles.body}>{children}</div> : null}
      {actionLabel && onAction ? (
        <button className={styles.action} onClick={onAction} type="button">
          {actionLabel}
        </button>
      ) : null}
    </section>
  )
}
