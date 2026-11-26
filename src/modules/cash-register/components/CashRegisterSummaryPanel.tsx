import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  ChevronDown,
  CreditCard,
  HandCoins,
  Landmark,
  ReceiptText,
  Wallet,
  Vault,
} from "lucide-react";
import type { ReactNode } from "react";
import type {
  CashRegisterPaymentMethod,
  CashRegisterSession,
  ReserveSummary,
} from "@/modules/cash-register/types/cash-register";
import {
  cashRegisterPaymentMethods,
  getPaymentMethodBalance,
  getPaymentMethodRows,
  getShiftBalance,
  getSignedCurrency,
} from "@/modules/cash-register/utils/cash-register-summary";
import { formatCashRegisterCurrency } from "@/modules/cash-register/utils/format-cash-register";
import { CashRegisterReserveBreakdown } from "./CashRegisterReserveBreakdown";
import styles from "./CashRegisterSummaryPanel.module.css";

const methodIcons = {
  CASH: Banknote,
  CARD: CreditCard,
  DIGITAL_WALLET: Wallet,
  TRANSFER: ArrowLeftRight,
  BANK_DEPOSIT: Landmark,
  OTHER: ReceiptText,
  CREDIT: HandCoins,
};

type CashRegisterSummaryPanelProps = {
  session: CashRegisterSession;
  reserveSummary?: ReserveSummary;
  children?: ReactNode;
};

export function CashRegisterSummaryPanel({
  session,
  reserveSummary,
  children,
}: CashRegisterSummaryPanelProps) {
  const shiftBalance = getShiftBalance(session);
  const metrics = [
    {
      label: "Ventas del turno",
      amount: session.salesTotal,
      Icon: ReceiptText,
      tone: "sales",
      hint: "Incluye ventas a crédito",
    },
    {
      label: "Abonos de clientes",
      amount: session.receivableCollectionsTotal,
      Icon: HandCoins,
      tone: "income",
    },
    {
      label: "Otros ingresos",
      amount: session.manualIncomeTotal,
      Icon: ArrowDownLeft,
      tone: "income",
    },
    {
      label: "Gastos del turno",
      amount: session.expensesTotal,
      Icon: ArrowUpRight,
      tone: "expense",
    },
  ];
  const adjustments = [
    { label: "Préstamos recibidos", amount: session.ownerLoanProceedsTotal },
    { label: "Abonos a préstamos", amount: session.ownerLoanPaymentsTotal },
    {
      label: "Deuda con propietario",
      amount: session.ownerLoansOutstandingTotal,
    },
    { label: "Reversiones de ventas", amount: session.reversalsTotal },
  ].filter(({ amount }) => amount > 0);

  return (
    <div className={styles.panel}>
      <div className={styles.overview}>
        <dl className={styles.balance}>
          <div className={styles.balanceMain}>
            <dt>
              <Wallet aria-hidden="true" /> Saldo total del turno
            </dt>
            <dd>{formatCashRegisterCurrency(shiftBalance)}</dd>
          </div>
          <div className={styles.balanceOpening}>
            <dt>Base inicial en efectivo</dt>
            <dd>{formatCashRegisterCurrency(session.openingAmount)}</dd>
          </div>
          <div className={styles.balanceCash}>
            <dt>Efectivo esperado</dt>
            <dd>{formatCashRegisterCurrency(session.cashExpectedTotal)}</dd>
          </div>
        </dl>

        <dl className={styles.metrics}>
          {metrics.map(({ label, amount, Icon, tone, hint }) => (
            <div className={styles.metric} data-tone={tone} key={label}>
              <dt>
                <span className={styles.metricIcon}>
                  <Icon aria-hidden="true" />
                </span>
                {label}
              </dt>
              <dd>
                {formatCashRegisterCurrency(amount)}
                {hint ? (
                  <small className={styles.metricHint}>{hint}</small>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {reserveSummary ? (
        <div className={styles.fundsOverview}>
          <details className={styles.reserveOverview}>
            <summary>
              <Vault aria-hidden="true" />
              <span className={styles.fundsLabel}>Reserva del negocio</span>
              <strong>
                {formatCashRegisterCurrency(reserveSummary.total)}
              </strong>
              <ChevronDown className={styles.chevron} aria-hidden="true" />
            </summary>
            <div className={styles.reserveDetails}>
              <p>Dinero guardado fuera del turno.</p>
              <CashRegisterReserveBreakdown
                balances={reserveSummary.balances}
              />
            </div>
          </details>
          <div className={styles.totalFunds}>
            <Wallet aria-hidden="true" />
            <div>
              <span className={styles.fundsLabel}>
                Total disponible del negocio
              </span>
              <small>Saldo del turno más reserva</small>
            </div>
            <strong>
              {formatCashRegisterCurrency(shiftBalance + reserveSummary.total)}
            </strong>
          </div>
        </div>
      ) : null}

      {adjustments.length > 0 ? (
        <dl className={styles.adjustments}>
          {adjustments.map(({ label, amount }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{formatCashRegisterCurrency(amount)}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {children}

      <section
        className={styles.methods}
        aria-labelledby="cash-payment-methods"
      >
        <div className={styles.methodsHeading}>
          <h3 id="cash-payment-methods">Saldos por medio de pago</h3>
          <span>Saldo esperado</span>
        </div>
        <div className={styles.methodGrid}>
          <PaymentMethodDetails
            label="Efectivo"
            method="CASH"
            session={session}
          />
          <div className={styles.otherMethods}>
            {cashRegisterPaymentMethods
              .filter(({ method }) => method !== "CASH")
              .map(({ method, label }) => (
                <PaymentMethodDetails
                  key={method}
                  label={label}
                  method={method}
                  session={session}
                />
              ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function PaymentMethodDetails({
  label,
  method,
  session,
}: {
  label: string;
  method: CashRegisterPaymentMethod;
  session: CashRegisterSession;
}) {
  const Icon = methodIcons[method];
  const isCash = method === "CASH";

  return (
    <details className={styles.method} data-method={method} open={isCash}>
      <summary>
        <span className={styles.methodIcon}>
          <Icon aria-hidden="true" />
        </span>
        <span className={styles.methodLabel}>{label}</span>
        <strong>
          {formatCashRegisterCurrency(getPaymentMethodBalance(session, method))}
        </strong>
        <ChevronDown aria-hidden="true" className={styles.chevron} />
      </summary>
      <dl className={styles.methodRows}>
        {getPaymentMethodRows(session, method).map(
          ({ label: rowLabel, value, tone }) => (
            <div key={rowLabel}>
              <dt>{rowLabel}</dt>
              <dd data-tone={tone}>
                {tone === "danger"
                  ? getSignedCurrency(value)
                  : formatCashRegisterCurrency(value)}
              </dd>
            </div>
          ),
        )}
      </dl>
    </details>
  );
}
