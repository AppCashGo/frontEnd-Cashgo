import { SurfaceCard } from "@/shared/components/ui/SurfaceCard";
import type { CashRegisterSession } from "@/modules/cash-register/types/cash-register";
import {
  formatCashRegisterCurrency,
  formatCashRegisterDateTime,
  getPaymentMethodLabel,
} from "@/modules/cash-register/utils/format-cash-register";
import { joinClassNames } from "@/shared/utils/join-class-names";
import styles from "./CashRegisterSummaryPanel.module.css";

type CashRegisterSummaryPanelProps = {
  session: CashRegisterSession;
};

export function CashRegisterSummaryPanel({
  session,
}: CashRegisterSummaryPanelProps) {
  return (
    <SurfaceCard className={styles.panel}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Registros realizados</p>
          <h3 className={styles.title}>Resumen operativo del turno</h3>
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
            ? "Caja abierta"
            : `Diferencia ${formatCashRegisterCurrency(session.difference)}`}
        </span>
      </div>

      <div className={styles.metaGrid}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Responsable</span>
          <span className={styles.metaValue}>
            {session.responsibleUserName ?? "Sin asignar"}
          </span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Abierta</span>
          <span className={styles.metaValue}>
            {formatCashRegisterDateTime(session.openedAt)}
          </span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Transacciones</span>
          <span className={styles.metaValue}>{session.transactionCount}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Base inicial</span>
          <span className={styles.metaValue}>
            {formatCashRegisterCurrency(session.openingAmount)}
          </span>
        </div>
      </div>

      <div className={styles.metricsStack}>
        <div className={styles.metricRow}>
          <span>Total ventas</span>
          <strong>{formatCashRegisterCurrency(session.salesTotal)}</strong>
        </div>
        <div className={styles.metricRow}>
          <span>Cobros de cartera</span>
          <strong>
            {formatCashRegisterCurrency(session.receivableCollectionsTotal)}
          </strong>
        </div>
        <div className={styles.metricRow}>
          <span>Otros ingresos</span>
          <strong>
            {formatCashRegisterCurrency(session.manualIncomeTotal)}
          </strong>
        </div>
        <div className={styles.metricRow}>
          <span>Gastos manuales</span>
          <strong>{formatCashRegisterCurrency(session.expensesTotal)}</strong>
        </div>
        <div
          className={joinClassNames(styles.metricRow, styles.metricRowStrong)}
        >
          <span>Efectivo esperado</span>
          <strong>
            {formatCashRegisterCurrency(session.cashExpectedTotal)}
          </strong>
        </div>
      </div>

      <div className={styles.paymentBlock}>
        <div className={styles.paymentHeader}>
          <span className={styles.paymentTitle}>Métodos de pago</span>
          <span className={styles.paymentHint}>
            Solo el efectivo entra al arqueo esperado.
          </span>
        </div>

        {session.paymentMethods.length > 0 ? (
          <div className={styles.paymentList}>
            {session.paymentMethods.map((paymentMethod) => (
              <div className={styles.paymentRow} key={paymentMethod.method}>
                <span>{getPaymentMethodLabel(paymentMethod.method)}</span>
                <strong>
                  {formatCashRegisterCurrency(paymentMethod.amount)}
                </strong>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyCopy}>
            Todavía no hay pagos asociados a esta caja.
          </p>
        )}
      </div>
    </SurfaceCard>
  );
}
