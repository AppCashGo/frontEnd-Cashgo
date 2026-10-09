import { ArrowRightLeft, Landmark } from "lucide-react";
import {
  formatCashRegisterCurrency,
  formatCashRegisterDateTime,
} from "@/modules/cash-register/utils/format-cash-register";
import styles from "./CashRegisterTransferHistoryTable.module.css";

export type CashRegisterTransferHistoryItem = {
  id: string;
  kind: "PAYMENT_METHOD" | "RESERVE";
  movement: string;
  amount: number;
  responsible: string;
  notes: string | null;
  createdAt: string;
};

type CashRegisterTransferHistoryTableProps = {
  items: CashRegisterTransferHistoryItem[];
};

export function CashRegisterTransferHistoryTable({
  items,
}: CashRegisterTransferHistoryTableProps) {
  if (items.length === 0) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon} aria-hidden="true">
          <ArrowRightLeft />
        </span>
        <p className={styles.emptyTitle}>
          No hay transferencias en este periodo.
        </p>
        <p className={styles.emptyDescription}>
          Aquí aparecerán los movimientos entre medios de pago y entre la caja
          y la reserva del negocio.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.tableScroller}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th aria-hidden="true" />
            <th>Movimiento</th>
            <th>Monto</th>
            <th>Responsable</th>
            <th>Fecha y hora</th>
            <th>Nota</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td data-label="Tipo">
                <span
                  className={
                    item.kind === "RESERVE"
                      ? `${styles.kindIcon} ${styles.kindIconReserve}`
                      : `${styles.kindIcon} ${styles.kindIconTransfer}`
                  }
                  title={
                    item.kind === "RESERVE"
                      ? "Movimiento de reserva"
                      : "Transferencia entre medios"
                  }
                >
                  {item.kind === "RESERVE" ? <Landmark /> : <ArrowRightLeft />}
                </span>
              </td>
              <td data-label="Movimiento">
                <strong className={styles.movement}>{item.movement}</strong>
                <span className={styles.kindLabel}>
                  {item.kind === "RESERVE"
                    ? "Caja y reserva"
                    : "Entre medios de pago"}
                </span>
              </td>
              <td data-label="Monto">
                <strong className={styles.amount}>
                  {formatCashRegisterCurrency(item.amount)}
                </strong>
              </td>
              <td data-label="Responsable">{item.responsible}</td>
              <td data-label="Fecha y hora">
                {formatCashRegisterDateTime(item.createdAt)}
              </td>
              <td data-label="Nota">
                <span className={styles.notes}>{item.notes || "Sin nota"}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
