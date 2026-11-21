import type { ReactNode } from 'react'
import styles from './SettingsAccordionHeading.module.css'

type SettingsAccordionHeadingProps = {
  description: string
  icon: ReactNode
  title: string
}

export function SettingsAccordionHeading({
  description,
  icon,
  title,
}: SettingsAccordionHeadingProps) {
  return (
    <span className={styles.heading}>
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.copy}>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
    </span>
  )
}
