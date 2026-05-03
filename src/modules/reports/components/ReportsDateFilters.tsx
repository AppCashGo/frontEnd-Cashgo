import type { ReportRangePreset } from '@/modules/reports/types/report'
import styles from './ReportsDateFilters.module.css'

type ReportsDateFiltersProps = {
  from: string
  to: string
  isRefreshing: boolean
  rangeLabel: string
  selectedPreset: ReportRangePreset
  onApply: () => void
  onClear: () => void
  onFromChange: (value: string) => void
  onPresetChange: (value: ReportRangePreset) => void
  onRefresh: () => void
  onToChange: (value: string) => void
}

export function ReportsDateFilters({
  from,
  to,
  isRefreshing,
  rangeLabel,
  selectedPreset,
  onApply,
  onClear,
  onFromChange,
  onPresetChange,
  onRefresh,
  onToChange,
}: ReportsDateFiltersProps) {
  return (
    <section className={styles.filtersCard}>
      <div className={styles.copy}>
        <p className={styles.label}>Vista estadística</p>
        <h3 className={styles.title}>Filtra el tablero por el periodo que te importa.</h3>
        <p className={styles.description}>
          Cambia rango, actualiza la lectura y mantén ventas, gastos y flujo de
          caja alineados dentro de la misma vista.
        </p>
        <p className={styles.rangeBadge}>{rangeLabel}</p>
      </div>

      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault()
          onApply()
        }}
      >
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Periodo</span>
          <select
            className={styles.input}
            value={selectedPreset}
            onChange={(event) =>
              onPresetChange(event.target.value as ReportRangePreset)
            }
          >
            <option value="WEEK">Semanal</option>
            <option value="MONTH">Mensual</option>
            <option value="ALL">Todo</option>
            <option value="CUSTOM">Personalizado</option>
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Desde</span>
          <input
            className={styles.input}
            type="date"
            value={from}
            onChange={(event) => onFromChange(event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Hasta</span>
          <input
            className={styles.input}
            type="date"
            value={to}
            onChange={(event) => onToChange(event.target.value)}
          />
        </label>

        <div className={styles.actions}>
          <button className={styles.primaryAction} disabled={isRefreshing} type="submit">
            {isRefreshing ? 'Actualizando...' : 'Aplicar filtros'}
          </button>
          <button
            className={styles.secondaryAction}
            disabled={isRefreshing}
            type="button"
            onClick={onRefresh}
          >
            Refrescar
          </button>
          <button
            className={styles.secondaryAction}
            disabled={isRefreshing}
            type="button"
            onClick={onClear}
          >
            Limpiar
          </button>
        </div>
      </form>
    </section>
  )
}
