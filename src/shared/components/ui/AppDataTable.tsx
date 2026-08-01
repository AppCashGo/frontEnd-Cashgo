import type { Key, ReactNode } from "react";
import { joinClassNames } from "@/shared/utils/join-class-names";
import { AppButton } from "./AppButton";
import styles from "./AppDataTable.module.css";

export type AppDataTableColumn<TRow> = {
  align?: "left" | "center" | "right";
  cell?: (row: TRow, index: number) => ReactNode;
  className?: string;
  header: ReactNode;
  headerClassName?: string;
  id: string;
};

export type AppDataTableProps<TRow> = {
  actions?: ReactNode;
  className?: string;
  columns: Array<AppDataTableColumn<TRow>>;
  description?: ReactNode;
  emptyAction?: ReactNode;
  emptyDescription?: ReactNode;
  emptyTitle?: ReactNode;
  errorMessage?: ReactNode;
  getRowClassName?: (row: TRow, index: number) => string | undefined;
  getRowKey: (row: TRow, index: number) => Key;
  isLoading?: boolean;
  isRefreshing?: boolean;
  loadingLabel?: ReactNode;
  loadingRowsCount?: number;
  refreshingLabel?: ReactNode;
  retryLabel?: ReactNode;
  rows: TRow[];
  tableClassName?: string;
  title?: ReactNode;
  onRetry?: () => void;
  onRowClick?: (row: TRow, index: number) => void;
};

function getAlignClass(align?: AppDataTableColumn<unknown>["align"]) {
  if (align === "center") {
    return styles.alignCenter;
  }

  if (align === "right") {
    return styles.alignRight;
  }

  return undefined;
}

export function AppDataTable<TRow,>({
  actions,
  className,
  columns,
  description,
  emptyAction,
  emptyDescription = "No hay registros para mostrar.",
  emptyTitle = "Sin resultados",
  errorMessage,
  getRowClassName,
  getRowKey,
  isLoading = false,
  isRefreshing = false,
  loadingLabel = "Cargando registros...",
  loadingRowsCount = 3,
  refreshingLabel = "Actualizando...",
  retryLabel = "Reintentar",
  rows,
  tableClassName,
  title,
  onRetry,
  onRowClick,
}: AppDataTableProps<TRow>) {
  const hasHeader = title || description || actions || isRefreshing;
  const loadingRows = Array.from({ length: loadingRowsCount }, (_, index) => index);

  return (
    <section className={joinClassNames(styles.card, className)}>
      {hasHeader ? (
        <div className={styles.header}>
          <div className={styles.copy}>
            {title ? <h3 className={styles.title}>{title}</h3> : null}
            {description ? <p className={styles.description}>{description}</p> : null}
          </div>

          <div className={styles.actions}>
            {isRefreshing && !isLoading ? (
              <p className={styles.refreshing}>{refreshingLabel}</p>
            ) : null}
            {actions}
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className={styles.state} aria-live="polite">
          <p className={styles.stateTitle}>{loadingLabel}</p>
          <div className={styles.loadingRows}>
            {loadingRows.map((rowIndex) => (
              <span className={styles.loadingRow} key={rowIndex} />
            ))}
          </div>
        </div>
      ) : errorMessage ? (
        <div className={styles.state} role="alert">
          <p className={styles.stateTitle}>No pudimos cargar los datos</p>
          <p className={styles.stateDescription}>{errorMessage}</p>
          {onRetry ? (
            <AppButton size="sm" variant="secondary" onClick={onRetry}>
              {retryLabel}
            </AppButton>
          ) : null}
        </div>
      ) : rows.length === 0 ? (
        <div className={styles.state}>
          <p className={styles.stateTitle}>{emptyTitle}</p>
          {emptyDescription ? (
            <p className={styles.stateDescription}>{emptyDescription}</p>
          ) : null}
          {emptyAction}
        </div>
      ) : (
        <div className={styles.scroller}>
          <table className={joinClassNames(styles.table, tableClassName)}>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    className={joinClassNames(
                      getAlignClass(column.align),
                      column.headerClassName,
                    )}
                    key={column.id}
                    scope="col"
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => {
                const rowClassName = getRowClassName?.(row, rowIndex);

                return (
                  <tr
                    className={joinClassNames(
                      onRowClick && styles.rowClickable,
                      rowClassName,
                    )}
                    key={getRowKey(row, rowIndex)}
                    onClick={() => onRowClick?.(row, rowIndex)}
                  >
                    {columns.map((column) => (
                      <td
                        className={joinClassNames(
                          getAlignClass(column.align),
                          column.className,
                        )}
                        key={column.id}
                      >
                        {column.cell?.(row, rowIndex)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
