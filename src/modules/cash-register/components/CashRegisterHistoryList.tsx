import { Search } from "lucide-react";
import type { CashRegisterSession } from "@/modules/cash-register/types/cash-register";
import {
  formatCashRegisterCurrency,
  formatCashRegisterDate,
  getPaymentMethodLabel,
} from "@/modules/cash-register/utils/format-cash-register";
import { joinClassNames } from "@/shared/utils/join-class-names";
import styles from "./CashRegisterHistoryList.module.css";

type CashRegisterHistoryListProps = {
  sessions: CashRegisterSession[];
};

export function CashRegisterHistoryList({
  sessions,
}: CashRegisterHistoryListProps) {
  if (sessions.length === 0) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon} aria-hidden="true">
          <Search />
        </span>
        <p className={styles.emptyTitle}>
          <strong>No se encontraron cierres de caja con estos filtros</strong>{" "}
          Intenta buscar usando otros criterios
        </p>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Cierres de caja</p>
          <h3 className={styles.title}>Historial reciente del arqueo</h3>
        </div>
        <span className={styles.countPill}>{sessions.length} cierres</span>
      </div>

      <div className={styles.list}>
        {sessions.map((session) => (
          <article className={styles.card} key={session.id}>
            <div className={styles.cardHeader}>
              <div>
                <p className={styles.cardTitle}>
                  {session.responsibleUserName ?? "Responsable no asignado"}
                </p>
                <p className={styles.cardDate}>
                  {formatCashRegisterDate(session.openedAt)}
                </p>
              </div>

              <span
                className={joinClassNames(
                  styles.differencePill,
                  session.difference !== null &&
                    session.difference < 0 &&
                    styles.differencePillAlert,
                  session.difference !== null &&
                    session.difference > 0 &&
                    styles.differencePillAccent,
                )}
              >
                {session.difference === null
                  ? "Sin cierre"
                  : formatCashRegisterCurrency(session.difference)}
              </span>
            </div>

            <div className={styles.metricsGrid}>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Ventas</span>
                <strong>
                  {formatCashRegisterCurrency(session.salesTotal)}
                </strong>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Gastos</span>
                <strong>
                  {formatCashRegisterCurrency(session.expensesTotal)}
                </strong>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Esperado</span>
                <strong>
                  {formatCashRegisterCurrency(session.cashExpectedTotal)}
                </strong>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Contado</span>
                <strong>
                  {formatCashRegisterCurrency(session.closingAmount ?? 0)}
                </strong>
              </div>
            </div>

            {session.paymentMethods.length > 0 ? (
              <div className={styles.paymentTags}>
                {session.paymentMethods.map((paymentMethod) => (
                  <span
                    className={styles.paymentTag}
                    key={paymentMethod.method}
                  >
                    {getPaymentMethodLabel(paymentMethod.method)} ·{" "}
                    {formatCashRegisterCurrency(paymentMethod.amount)}
                  </span>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
