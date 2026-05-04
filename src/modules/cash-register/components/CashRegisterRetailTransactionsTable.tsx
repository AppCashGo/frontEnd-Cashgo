import type { MovementLedgerItem } from "@/modules/cash-register/types/cash-register";
import {
  formatCashRegisterCurrency,
  formatCashRegisterDateTime,
  getPaymentMethodLabel,
} from "@/modules/cash-register/utils/format-cash-register";
import { joinClassNames } from "@/shared/utils/join-class-names";
import styles from "./CashRegisterRetailTransactionsTable.module.css";

type CashRegisterRetailTransactionsTableProps = {
  transactions: MovementLedgerItem[];
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
};

function getStatusLabel(status: string) {
  switch (status) {
    case "COMPLETED":
    case "PAID":
      return "Pagada";
    case "PARTIALLY_PAID":
      return "Pago parcial";
    case "PENDING_PAYMENT":
    case "PENDING":
      return "En deuda";
    case "CANCELLED":
      return "Cancelada";
    case "RECORDED":
      return "Registrada";
    case "ACTIVE":
      return "Activo";
    case "REVERSED":
      return "Reversado";
    default:
      return status;
  }
}

function getKindIcon(direction: MovementLedgerItem["direction"]) {
  if (direction === "IN") {
    return "+";
  }

  if (direction === "OUT") {
    return "-";
  }

  return "~";
}

function getPaymentColumnLabel(transaction: MovementLedgerItem) {
  if (transaction.paymentMethod) {
    return getPaymentMethodLabel(transaction.paymentMethod);
  }

  if (
    transaction.previousStock !== null &&
    transaction.newStock !== null &&
    transaction.direction !== "ADJUSTMENT"
  ) {
    return `${transaction.previousStock} -> ${transaction.newStock}`;
  }

  if (transaction.newStock !== null) {
    return `Stock final ${transaction.newStock}`;
  }

  return transaction.scope === "INVENTORY" ? "Inventario" : "Sistema";
}

function getValueLabel(transaction: MovementLedgerItem) {
  if (transaction.amount !== null) {
    return formatCashRegisterCurrency(transaction.amount);
  }

  if (transaction.quantity !== null) {
    const prefix = transaction.direction === "OUT" ? "-" : "+";

    return `${prefix}${transaction.quantity} und`;
  }

  if (transaction.newStock !== null) {
    return `Ajuste a ${transaction.newStock}`;
  }

  return "—";
}

export function CashRegisterRetailTransactionsTable({
  emptyActionLabel,
  emptyDescription,
  onEmptyAction,
  transactions,
}: CashRegisterRetailTransactionsTableProps) {
  if (transactions.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyTitle}>
          Aún no tienes registros creados en esta fecha.
        </p>
        {emptyDescription ? (
          <p className={styles.emptyDescription}>{emptyDescription}</p>
        ) : null}
        {emptyActionLabel && onEmptyAction ? (
          <button
            className={styles.emptyActionButton}
            type="button"
            onClick={onEmptyAction}
          >
            {emptyActionLabel}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles.tableScroller}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th aria-hidden="true" />
            <th>Concepto</th>
            <th>Valor</th>
            <th>Medio de pago</th>
            <th>Fecha y hora</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.id}>
              <td>
                <span
                  className={joinClassNames(
                    styles.kindIcon,
                    transaction.direction === "IN" && styles.kindIconIncome,
                    transaction.direction === "OUT" && styles.kindIconExpense,
                    transaction.direction === "ADJUSTMENT" &&
                      styles.kindIconAdjustment,
                  )}
                >
                  {getKindIcon(transaction.direction)}
                </span>
              </td>
              <td>
                <div className={styles.conceptCell}>
                  <strong className={styles.conceptTitle}>
                    {transaction.concept}
                  </strong>
                  {transaction.details ? (
                    <span className={styles.conceptDetails}>
                      {transaction.details}
                    </span>
                  ) : null}
                </div>
              </td>
              <td>{getValueLabel(transaction)}</td>
              <td>{getPaymentColumnLabel(transaction)}</td>
              <td>{formatCashRegisterDateTime(transaction.createdAt)}</td>
              <td>
                <span
                  className={joinClassNames(
                    styles.statusPill,
                    (transaction.status === "COMPLETED" ||
                      transaction.status === "PAID" ||
                      transaction.status === "RECORDED") &&
                      styles.statusPaid,
                    transaction.status === "PARTIALLY_PAID" &&
                      styles.statusPartial,
                    (transaction.status === "PENDING_PAYMENT" ||
                      transaction.status === "PENDING") &&
                      styles.statusPending,
                    (transaction.status === "ACTIVE" ||
                      transaction.status === "REVERSED") &&
                      styles.statusNeutral,
                    transaction.status === "CANCELLED" &&
                      styles.statusCancelled,
                  )}
                >
                  {getStatusLabel(transaction.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
