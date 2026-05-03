import type {
  CashRegisterEntry,
  CashRegisterEntryType,
} from "@/modules/cash-register/types/cash-register";
import {
  formatCashRegisterCurrency,
  formatCashRegisterDateTime,
} from "@/modules/cash-register/utils/format-cash-register";
import { joinClassNames } from "@/shared/utils/join-class-names";
import { SurfaceCard } from "@/shared/components/ui/SurfaceCard";
import styles from "./CashRegisterTransactionsList.module.css";

type CashRegisterTransactionsListProps = {
  entries: CashRegisterEntry[];
  searchValue: string;
  selectedType: "ALL" | CashRegisterEntryType;
  onSearchChange: (value: string) => void;
  onTypeChange: (value: "ALL" | CashRegisterEntryType) => void;
};

export function CashRegisterTransactionsList({
  entries,
  searchValue,
  selectedType,
  onSearchChange,
  onTypeChange,
}: CashRegisterTransactionsListProps) {
  return (
    <SurfaceCard className={styles.panel}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Transacciones</p>
          <h3 className={styles.title}>Movimientos del turno actual</h3>
        </div>
        <span className={styles.countPill}>{entries.length} registros</span>
      </div>

      <div className={styles.filtersBar}>
        <div className={styles.filterChips}>
          <button
            className={joinClassNames(
              styles.filterChip,
              selectedType === "ALL" && styles.filterChipActive,
            )}
            type="button"
            onClick={() => onTypeChange("ALL")}
          >
            Todos
          </button>
          <button
            className={joinClassNames(
              styles.filterChip,
              selectedType === "INCOME" && styles.filterChipActive,
            )}
            type="button"
            onClick={() => onTypeChange("INCOME")}
          >
            Ingresos
          </button>
          <button
            className={joinClassNames(
              styles.filterChip,
              selectedType === "EXPENSE" && styles.filterChipActive,
            )}
            type="button"
            onClick={() => onTypeChange("EXPENSE")}
          >
            Egresos
          </button>
        </div>

        <label className={styles.searchField}>
          <span className={styles.searchLabel}>Buscar concepto</span>
          <input
            className={styles.searchInput}
            placeholder="Ej. venta, flete, abono..."
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
      </div>

      {entries.length > 0 ? (
        <div className={styles.entryList}>
          {entries.map((entry) => (
            <article className={styles.entryCard} key={entry.id}>
              <div className={styles.entryCopy}>
                <div className={styles.entryMeta}>
                  <span
                    className={joinClassNames(
                      styles.entryType,
                      entry.type === "INCOME" && styles.entryTypeIncome,
                      entry.type === "EXPENSE" && styles.entryTypeExpense,
                    )}
                  >
                    {entry.type === "INCOME" ? "Ingreso" : "Egreso"}
                  </span>
                  <span className={styles.entryDate}>
                    {formatCashRegisterDateTime(entry.createdAt)}
                  </span>
                </div>

                <p className={styles.entryReason}>{entry.reason}</p>
              </div>

              <strong
                className={joinClassNames(
                  styles.entryAmount,
                  entry.type === "EXPENSE" && styles.entryAmountExpense,
                )}
              >
                {entry.type === "EXPENSE" ? "-" : "+"}
                {formatCashRegisterCurrency(entry.amount)}
              </strong>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>
            No hay movimientos para estos filtros.
          </p>
          <p className={styles.emptyDescription}>
            Prueba con otro tipo de movimiento o ajusta el texto de búsqueda.
          </p>
        </div>
      )}
    </SurfaceCard>
  );
}
