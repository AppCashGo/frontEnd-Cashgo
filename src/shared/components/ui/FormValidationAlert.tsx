import { AlertCircle } from 'lucide-react'
import styles from './FormValidationAlert.module.css'

type FormValidationAlertProps = {
  message: string
  title?: string
  className?: string
  id?: string
}

export function FormValidationAlert({
  message,
  title = 'Revisa la información',
  className,
  id,
}: FormValidationAlertProps) {
  return (
    <div
      aria-live="assertive"
      className={[styles.alert, className].filter(Boolean).join(' ')}
      id={id}
      role="alert"
    >
      <AlertCircle aria-hidden="true" className={styles.icon} size={20} />
      <span className={styles.copy}>
        <strong>{title}</strong>
        <span>{message}</span>
      </span>
    </div>
  )
}
