import type {
  ExpenseCategory,
  ExpenseStatus,
} from '@/modules/expenses/types/expense'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import styles from './ExpensesFiltersBar.module.css'

type ExpensesFiltersBarProps = {
  categories: ExpenseCategory[]
  fromDate: string
  searchValue: string
  selectedCategoryId: string
  selectedStatus: 'ALL' | ExpenseStatus
  toDate: string
  onCategoryChange: (value: string) => void
  onFromDateChange: (value: string) => void
  onReset: () => void
  onSearchChange: (value: string) => void
  onStatusChange: (value: 'ALL' | ExpenseStatus) => void
  onToDateChange: (value: string) => void
}

export function ExpensesFiltersBar({
  categories,
  fromDate,
  searchValue,
  selectedCategoryId,
  selectedStatus,
  toDate,
  onCategoryChange,
  onFromDateChange,
  onReset,
  onSearchChange,
  onStatusChange,
  onToDateChange,
}: ExpensesFiltersBarProps) {
  return (
    <SurfaceCard className={styles.card}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Filtros rápidos</p>
          <h3 className={styles.title}>Busca por concepto, estado o fecha</h3>
        </div>

        <button className={styles.resetButton} type="button" onClick={onReset}>
          Limpiar
        </button>
      </div>

      <div className={styles.grid}>
        <label className={styles.field}>
          <span className={styles.label}>Concepto</span>
          <input
            className={styles.input}
            placeholder="Buscar arriendo, transporte, servicios..."
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Estado</span>
          <select
            className={styles.select}
            value={selectedStatus}
            onChange={(event) =>
              onStatusChange(event.target.value as 'ALL' | ExpenseStatus)
            }
          >
            <option value="ALL">Todos</option>
            <option value="PAID">Pagados</option>
            <option value="PENDING">Pendientes</option>
            <option value="CANCELLED">Cancelados</option>
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Categoría</span>
          <select
            className={styles.select}
            value={selectedCategoryId}
            onChange={(event) => onCategoryChange(event.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Desde</span>
          <input
            className={styles.input}
            type="date"
            value={fromDate}
            onChange={(event) => onFromDateChange(event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Hasta</span>
          <input
            className={styles.input}
            type="date"
            value={toDate}
            onChange={(event) => onToDateChange(event.target.value)}
          />
        </label>
      </div>
    </SurfaceCard>
  )
}
