import { CalendarDays, CircleAlert, CircleCheck, Search, Scale } from "lucide-react";
import type { CashRegisterSession } from "@/modules/cash-register/types/cash-register";
import {
  formatCashRegisterCurrency,
  formatCashRegisterDateTime,
  getPaymentMethodLabel,
} from "@/modules/cash-register/utils/format-cash-register";
import { joinClassNames } from "@/shared/utils/join-class-names";
import { CashRegisterOperatorAvatar } from "./CashRegisterOperatorAvatar";
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
        <p className={styles.emptyTitle}>No hay cierres en este periodo</p>
        <p className={styles.emptyDescription}>Cambia la fecha o selecciona un periodo más amplio.</p>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <p className={styles.count}>
        {sessions.length} {sessions.length === 1 ? "cierre" : "cierres"} en el periodo
      </p>

      <div className={styles.list}>
        {sessions.map((session) => (
          <article className={styles.card} key={session.id}>
            <div className={styles.cardHeader}>
              <div className={styles.cardOperator}>
                <CashRegisterOperatorAvatar name={session.responsibleUserName} />
                <div>
                  <p className={styles.cardTitle}>
                    {session.responsibleUserName ?? "Responsable no asignado"}
                  </p>
                  <p className={styles.cardDate}>
                    <CalendarDays aria-hidden="true" />
                    {formatCashRegisterDateTime(session.closedAt ?? session.openedAt)}
                  </p>
                </div>
              </div>

              <span
                className={joinClassNames(
                  styles.differencePill,
                  session.difference === 0 && styles.differencePillMatched,
                  session.difference !== null &&
                    session.difference < 0 &&
                    styles.differencePillAlert,
                  session.difference !== null &&
                    session.difference > 0 &&
                    styles.differencePillAccent,
                )}
              >
                {session.difference === 0 ? (
                  <CircleCheck aria-hidden="true" />
                ) : session.difference === null ? (
                  <Scale aria-hidden="true" />
                ) : (
                  <CircleAlert aria-hidden="true" />
                )}
                {session.difference === null
                  ? "Sin diferencia registrada"
                  : session.difference === 0
                    ? "Cuadrada"
                    : `Diferencia ${formatCashRegisterCurrency(session.difference)}`}
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
                <span className={styles.metricLabel}>Efectivo esperado</span>
                <strong>
                  {formatCashRegisterCurrency(session.cashExpectedTotal)}
                </strong>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Efectivo contado</span>
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
