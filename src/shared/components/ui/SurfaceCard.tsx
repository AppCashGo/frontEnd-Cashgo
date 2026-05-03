import type { PropsWithChildren } from 'react'
import { joinClassNames } from '@/shared/utils/join-class-names'
import styles from './SurfaceCard.module.css'

type SurfaceCardProps = PropsWithChildren<{
  className?: string
}>

export function SurfaceCard({ className, children }: SurfaceCardProps) {
  return <section className={joinClassNames(styles.card, className)}>{children}</section>
}
