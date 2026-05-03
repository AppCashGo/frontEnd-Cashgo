import styles from './ChartPlaceholderState.module.css'

type ChartPlaceholderStateProps = {
  title: string
  description: string
}

export function ChartPlaceholderState({
  title,
  description,
}: ChartPlaceholderStateProps) {
  return (
    <div className={styles.state}>
      <p className={styles.title}>{title}</p>
      <p className={styles.description}>{description}</p>
    </div>
  )
}
