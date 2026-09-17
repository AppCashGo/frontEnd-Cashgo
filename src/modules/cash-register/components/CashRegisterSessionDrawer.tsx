import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type {
  CashRegisterAssignee,
  CashRegisterEntryType,
  CashRegisterManualEntryInput,
  CashRegisterPaymentMethod,
  CashRegisterSession,
  CloseCashRegisterInput,
  OpenCashRegisterInput,
  PaymentMethodTransferInput,
  ReserveSummary,
  ReserveBalanceAdjustmentInput,
  ReserveTransferDirection,
  ReserveTransferInput,
} from "@/modules/cash-register/types/cash-register";
import {
  formatCashRegisterCurrency,
  formatCashRegisterDateTime,
} from "@/modules/cash-register/utils/format-cash-register";
import retailStyles from "@/shared/components/retail/RetailUI.module.css";
import { downloadBlobFile } from "@/shared/utils/download-blob-file";
import { CashRegisterRetailDrawer } from "./CashRegisterRetailDrawer";
import styles from "./CashRegisterSessionDrawer.module.css";

export type CashRegisterDrawerMode = "manage" | "summary" | "close";

type CashRegisterSessionDrawerProps = {
  isOpen: boolean;
  assignees: CashRegisterAssignee[];
  currentSession: CashRegisterSession | null;
  latestClosedSession?: CashRegisterSession | null;
  reserveSummary?: ReserveSummary | null;
  businessLogoUrl?: string | null;
  businessName?: string | null;
  initialMode?: CashRegisterDrawerMode;
  isSubmitting: boolean;
  onClose: () => void;
  onOpenSession: (input: OpenCashRegisterInput) => Promise<void>;
  onCloseSession: (
    input: CloseCashRegisterInput,
  ) => Promise<CashRegisterSession | void>;
  onManualEntry: (input: CashRegisterManualEntryInput) => Promise<void>;
  onTransfer: (input: PaymentMethodTransferInput) => Promise<void>;
  onReserveTransfer: (input: ReserveTransferInput) => Promise<void>;
  onReserveAdjust: (input: ReserveBalanceAdjustmentInput) => Promise<void>;
};

type PaymentMethodSummary = {
  method: CashRegisterPaymentMethod;
  label: string;
};

type SummaryRow = {
  label: string;
  value: number;
  tone?: "danger";
};

const paymentMethodsOrder: PaymentMethodSummary[] = [
  { method: "CASH", label: "Efectivo" },
  { method: "CARD", label: "Tarjeta" },
  { method: "DIGITAL_WALLET", label: "Nequi / Daviplata" },
  { method: "TRANSFER", label: "Transferencia bancaria" },
  { method: "BANK_DEPOSIT", label: "Consignación bancaria" },
  { method: "OTHER", label: "Otros" },
];

type MethodAmounts = Record<CashRegisterPaymentMethod, string>;

function createEmptyMethodAmounts(): MethodAmounts {
  return {
    CASH: "0",
    CARD: "0",
    TRANSFER: "0",
    DIGITAL_WALLET: "0",
    BANK_DEPOSIT: "0",
    CREDIT: "0",
    OTHER: "0",
  };
}

function getSuggestedOpeningBalances(
  latestClosedSession?: CashRegisterSession | null,
): MethodAmounts {
  const balances = createEmptyMethodAmounts();

  for (const paymentMethod of latestClosedSession?.paymentMethods ?? []) {
    if (paymentMethod.method === "CREDIT") {
      continue;
    }

    balances[paymentMethod.method] = String(
      paymentMethod.closingAmount ?? paymentMethod.expectedAmount,
    );
  }

  return balances;
}

function getExpectedClosingBalances(session: CashRegisterSession): MethodAmounts {
  const balances = createEmptyMethodAmounts();

  for (const paymentMethod of session.paymentMethods) {
    if (paymentMethod.method !== "CREDIT") {
      balances[paymentMethod.method] = String(paymentMethod.expectedAmount);
    }
  }

  return balances;
}

function getInitialAssigneeId(
  assignees: CashRegisterAssignee[],
  currentSession: CashRegisterSession | null,
) {
  if (currentSession?.responsibleUserId) {
    return currentSession.responsibleUserId;
  }

  return assignees[0]?.id ?? "";
}

function parseAmountInput(value: string) {
  const normalizedValue = value.trim().replace(/[^\d,.-]/g, "");

  if (!normalizedValue) {
    return 0;
  }

  if (normalizedValue.includes(",")) {
    const decimalValue = normalizedValue.replace(/\./g, "").replace(",", ".");
    const parsedValue = Number(decimalValue);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  const lastDotIndex = normalizedValue.lastIndexOf(".");

  if (lastDotIndex >= 0) {
    const decimalLength = normalizedValue.length - lastDotIndex - 1;
    const valueWithoutDots =
      decimalLength === 3
        ? normalizedValue.replace(/\./g, "")
        : normalizedValue;
    const parsedValue = Number(valueWithoutDots);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function getPaymentMethodTotal(
  session: CashRegisterSession,
  method: CashRegisterPaymentMethod,
) {
  return (
    session.paymentMethods.find(
      (paymentMethod) => paymentMethod.method === method,
    )?.expectedAmount ?? 0
  );
}

function getPaymentMethodRows(
  session: CashRegisterSession,
  method: CashRegisterPaymentMethod,
): SummaryRow[] {
  const paymentMethod = session.paymentMethods.find(
    (summary) => summary.method === method,
  );
  const financingRows = ([
    {
      label: "Préstamos recibidos",
      value: paymentMethod?.ownerLoanProceedsAmount ?? 0,
    },
    {
      label: "Abonos a préstamos",
      value: paymentMethod?.ownerLoanPaymentsAmount ?? 0,
      tone: "danger",
    },
  ] satisfies SummaryRow[]).filter((row) => row.value > 0);
  const transferRows = ([
    {
      label: "Transferencias recibidas",
      value: paymentMethod?.transfersInAmount ?? 0,
    },
    {
      label: "Transferencias enviadas",
      value: paymentMethod?.transfersOutAmount ?? 0,
      tone: "danger",
    },
  ] satisfies SummaryRow[]).filter((row) => row.value > 0);

  if (method === "CASH") {
    const manualIncomeRows =
      session.manualIncomeTotal > 0
        ? ([
            {
              label: "Otros ingresos",
              value: session.manualIncomeTotal,
            },
          ] satisfies SummaryRow[])
        : [];

    return [
      { label: "Saldo inicial", value: paymentMethod?.openingAmount ?? session.openingAmount },
      { label: "Ventas", value: session.cashSalesTotal },
      { label: "Abonos", value: session.cashCollectionsTotal },
      ...manualIncomeRows,
      ...financingRows,
      ...transferRows,
      {
        label: "Gastos",
        value: paymentMethod?.expensesAmount ?? session.manualExpenseTotal,
        tone: "danger",
      },
    ];
  }

  return [
    { label: "Saldo inicial", value: paymentMethod?.openingAmount ?? 0 },
    { label: "Ventas", value: paymentMethod?.salesAmount ?? 0 },
    { label: "Abonos", value: paymentMethod?.collectionsAmount ?? 0 },
    ...financingRows,
    ...transferRows,
    {
      label: "Gastos",
      value: paymentMethod?.expensesAmount ?? 0,
      tone: "danger",
    },
  ];
}

function getPaymentMethodBalance(
  session: CashRegisterSession,
  method: CashRegisterPaymentMethod,
) {
  if (method === "CASH") {
    return session.cashExpectedTotal;
  }

  return getPaymentMethodTotal(session, method);
}

function getShiftBalance(session: CashRegisterSession, difference = 0) {
  return session.paymentMethods.reduce(
    (total, paymentMethod) => total + paymentMethod.expectedAmount,
    difference,
  );
}

function getSignedCurrency(value: number) {
  if (value <= 0) {
    return formatCashRegisterCurrency(value);
  }

  return `-${formatCashRegisterCurrency(value)}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildVoucherHtml(
  session: CashRegisterSession,
  closingAmount?: number,
  difference = 0,
  options?: { businessLogoUrl?: string | null; businessName?: string | null },
) {
  const businessName = options?.businessName?.trim() || "Cashgo";
  const escapedBusinessName = escapeHtml(businessName);
  const escapedLogoUrl = options?.businessLogoUrl
    ? escapeHtml(options.businessLogoUrl)
    : null;
  const brandMarkup = options?.businessLogoUrl
    ? `<img class="brand-logo" src="${escapedLogoUrl}" alt="${escapedBusinessName}" />`
    : `<span class="brand-name">${escapedBusinessName}</span>`;
  const rows = paymentMethodsOrder
    .map((paymentMethod) => {
      const amount = getPaymentMethodBalance(session, paymentMethod.method);

      if (amount === 0 && paymentMethod.method !== "CASH") {
        return "";
      }

      return `
        <tr>
          <td>${paymentMethod.label}</td>
          <td>${formatCashRegisterCurrency(amount)}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Arqueo de caja</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 48px;
            color: #1f2937;
            font-family: Arial, sans-serif;
            line-height: 1.45;
          }
          h1 { margin: 0 0 44px; font-size: 28px; }
          .meta { margin-bottom: 42px; }
          .brand { float: right; font-weight: 800; }
          .brand-logo {
            display: block;
            width: 116px;
            max-height: 56px;
            object-fit: contain;
          }
          .brand-name { font-weight: 800; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 26px; }
          th, td { padding: 14px 0; border-bottom: 1px solid #d9e2ec; text-align: left; }
          th:last-child, td:last-child { text-align: right; }
          .total { font-size: 22px; font-weight: 900; }
          .footer {
            margin-top: 38px;
            padding: 14px 18px;
            background: #1f2937;
            color: #ffffff;
            font-size: 13px;
          }
        </style>
      </head>
      <body>
        <h1>Arqueo de caja <span class="brand">${brandMarkup}</span></h1>
        <div class="meta">
          <strong>Apertura:</strong> ${formatCashRegisterDateTime(session.openedAt)}, ${
            session.responsibleUserName ?? "Sin empleado"
          }<br />
          <strong>Cierre:</strong> ${formatCashRegisterDateTime(new Date())}, ${
            session.responsibleUserName ?? "Sin empleado"
          }
        </div>
        <table>
          <thead>
            <tr>
              <th>Método de pago</th>
              <th>Monto</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <table>
          <tbody>
            <tr>
              <td><strong>Total ingresos</strong></td>
              <td class="total">${formatCashRegisterCurrency(session.totalIncome)}</td>
            </tr>
            <tr>
              <td>Dinero base</td>
              <td>${formatCashRegisterCurrency(session.openingAmount)}</td>
            </tr>
            <tr>
              <td>Ingresos en efectivo</td>
              <td>${formatCashRegisterCurrency(
                session.cashSalesTotal + session.cashCollectionsTotal,
              )}</td>
            </tr>
            <tr>
              <td>Gastos en efectivo</td>
              <td>${formatCashRegisterCurrency(session.manualExpenseTotal)}</td>
            </tr>
            ${
              closingAmount === undefined
                ? ""
                : `<tr>
                    <td><strong>Dinero contado en efectivo</strong></td>
                    <td><strong>${formatCashRegisterCurrency(closingAmount)}</strong></td>
                  </tr>
                  <tr>
                    <td><strong>Descuadre</strong></td>
                    <td><strong>${formatCashRegisterCurrency(difference)}</strong></td>
                  </tr>`
            }
          </tbody>
        </table>
        <div class="footer">Reporte generado desde Cashgo</div>
      </body>
    </html>
  `;
}

function openPrintableVoucher(
  session: CashRegisterSession,
  closingAmount?: number,
  difference = 0,
  options?: { businessLogoUrl?: string | null; businessName?: string | null },
) {
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    return;
  }

  printWindow.document.write(
    buildVoucherHtml(session, closingAmount, difference, options),
  );
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function downloadVoucher(
  session: CashRegisterSession,
  closingAmount?: number,
  difference = 0,
  options?: { businessLogoUrl?: string | null; businessName?: string | null },
) {
  const blob = new Blob(
    [buildVoucherHtml(session, closingAmount, difference, options)],
    {
      type: "text/html;charset=utf-8",
    },
  );

  downloadBlobFile(blob, `arqueo-caja-${session.id}.html`);
}

export function CashRegisterSessionDrawer({
  isOpen,
  assignees,
  currentSession,
  latestClosedSession,
  reserveSummary,
  businessLogoUrl,
  businessName,
  initialMode = "manage",
  isSubmitting,
  onClose,
  onOpenSession,
  onCloseSession,
  onManualEntry,
  onTransfer,
  onReserveTransfer,
  onReserveAdjust,
}: CashRegisterSessionDrawerProps) {
  const [assigneeId, setAssigneeId] = useState(
    getInitialAssigneeId(assignees, currentSession),
  );
  const [activeMode, setActiveMode] =
    useState<CashRegisterDrawerMode>(initialMode);
  const [closingStep, setClosingStep] = useState<"form" | "review">("form");
  const [expandedPaymentMethod, setExpandedPaymentMethod] =
    useState<CashRegisterPaymentMethod>("CASH");
  const [openingBalances, setOpeningBalances] = useState<MethodAmounts>(() =>
    getSuggestedOpeningBalances(latestClosedSession),
  );
  const [entryType, setEntryType] = useState<CashRegisterEntryType>("INCOME");
  const [entryAmount, setEntryAmount] = useState("");
  const [entryReason, setEntryReason] = useState("");
  const [closingBalances, setClosingBalances] = useState<MethodAmounts>(
    createEmptyMethodAmounts,
  );
  const [closingNote, setClosingNote] = useState("");
  const [transferFrom, setTransferFrom] =
    useState<CashRegisterPaymentMethod>("CASH");
  const [transferTo, setTransferTo] =
    useState<CashRegisterPaymentMethod>("DIGITAL_WALLET");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [reserveTransferMethod, setReserveTransferMethod] =
    useState<CashRegisterPaymentMethod>("CASH");
  const [reserveTransferDirection, setReserveTransferDirection] =
    useState<ReserveTransferDirection>("TO_RESERVE");
  const [reserveTransferAmount, setReserveTransferAmount] = useState("");
  const [reserveTransferNotes, setReserveTransferNotes] = useState("");
  const [reserveAdjustmentMethod, setReserveAdjustmentMethod] =
    useState<CashRegisterPaymentMethod>("CASH");
  const [reserveAdjustmentAmount, setReserveAdjustmentAmount] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setAssigneeId(getInitialAssigneeId(assignees, currentSession));
    setActiveMode(initialMode);
    setClosingStep("form");
    setExpandedPaymentMethod("CASH");
    setErrorMessage(null);
    if (!currentSession) {
      setOpeningBalances(getSuggestedOpeningBalances(latestClosedSession));
    }
  }, [assignees, currentSession, initialMode, isOpen, latestClosedSession]);

  useEffect(() => {
    if (!currentSession) {
      setClosingBalances(createEmptyMethodAmounts());
      setClosingNote("");
      return;
    }

    setClosingBalances(getExpectedClosingBalances(currentSession));
  }, [currentSession]);

  const closingAmountValue = useMemo(
    () => parseAmountInput(closingBalances.CASH),
    [closingBalances.CASH],
  );
  const closingDifferences = useMemo(
    () =>
      paymentMethodsOrder.map(({ method, label }) => {
        const expected = currentSession
          ? getPaymentMethodBalance(currentSession, method)
          : 0;
        const counted = parseAmountInput(closingBalances[method]);

        return { method, label, expected, counted, difference: counted - expected };
      }),
    [closingBalances, currentSession],
  );
  const closingDifference = closingDifferences.reduce(
    (total, item) => total + item.difference,
    0,
  );
  const hasClosingDifference = closingDifferences.some(
    (item) => Math.abs(item.difference) >= 0.01,
  );
  const drawerTitle = !currentSession
    ? "Abrir caja"
    : activeMode === "summary" || closingStep === "review"
      ? "Registros realizados"
      : activeMode === "close"
        ? "Cerrar caja"
        : "Caja activa";
  const drawerDescription =
    currentSession && activeMode === "manage"
      ? "Consulta el turno actual, registra movimientos rápidos y cierra la caja cuando termines el arqueo."
      : currentSession && activeMode === "close" && closingStep === "form"
        ? "En el siguiente paso podrás confirmar los valores por método de pago."
        : undefined;
  const shouldUseRecordsLayout = Boolean(
    currentSession && (activeMode === "summary" || closingStep === "review"),
  );

  async function handleOpenRequest() {
    setErrorMessage(null);

    try {
      await onOpenSession({
        responsibleUserId: assigneeId || undefined,
        openingAmount: parseAmountInput(openingBalances.CASH),
        openingBalances: paymentMethodsOrder.map(({ method }) => ({
          method,
          amount: parseAmountInput(openingBalances[method]),
        })),
      });
      setOpeningBalances(createEmptyMethodAmounts());
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No fue posible abrir la caja en este momento.",
      );
    }
  }

  async function handleOpenSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await handleOpenRequest();
  }

  async function handleManualEntrySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    try {
      await onManualEntry({
        type: entryType,
        amount: parseAmountInput(entryAmount),
        reason: entryReason.trim(),
      });
      setEntryAmount("");
      setEntryReason("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No fue posible registrar el movimiento manual.",
      );
    }
  }

  async function handleTransferSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    try {
      await onTransfer({
        fromMethod: transferFrom,
        toMethod: transferTo,
        amount: parseAmountInput(transferAmount),
        notes: transferNotes.trim() || undefined,
      });
      setTransferAmount("");
      setTransferNotes("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No fue posible transferir el dinero entre medios.",
      );
    }
  }

  async function handleReserveTransferSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setErrorMessage(null);

    try {
      await onReserveTransfer({
        method: reserveTransferMethod,
        direction: reserveTransferDirection,
        amount: parseAmountInput(reserveTransferAmount),
        notes: reserveTransferNotes.trim() || undefined,
      });
      setReserveTransferAmount("");
      setReserveTransferNotes("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No fue posible mover el dinero entre la caja y la reserva.",
      );
    }
  }

  async function handleReserveAdjustmentSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setErrorMessage(null);

    try {
      await onReserveAdjust({
        method: reserveAdjustmentMethod,
        amount: parseAmountInput(reserveAdjustmentAmount),
        notes: "Conciliación del dinero que ya estaba guardado",
      });
      setReserveAdjustmentAmount("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No fue posible conciliar la reserva.",
      );
    }
  }

  function handleCloseCountRequest() {
    setErrorMessage(null);
    setClosingStep("review");
    setExpandedPaymentMethod("CASH");
  }

  function handleCloseCountSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    handleCloseCountRequest();
  }

  async function handleConfirmClose() {
    setErrorMessage(null);

    try {
      await onCloseSession({
        closingAmount: closingAmountValue,
        closingBalances: paymentMethodsOrder.map(({ method }) => ({
          method,
          amount: parseAmountInput(closingBalances[method]),
        })),
        closingNote: closingNote.trim() || undefined,
      });
      setClosingNote("");
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No fue posible cerrar la caja en este momento.",
      );
    }
  }

  function renderRecordsSummary(session: CashRegisterSession) {
    return (
      <div className={styles.recordsView}>
        <div className={styles.recordsList}>
          {paymentMethodsOrder.map((paymentMethod) => {
            const isExpanded = expandedPaymentMethod === paymentMethod.method;
            const balance = getPaymentMethodBalance(
              session,
              paymentMethod.method,
            );

            return (
              <section
                className={
                  isExpanded
                    ? `${styles.methodCard} ${styles.methodCardExpanded}`
                    : styles.methodCard
                }
                key={paymentMethod.method}
              >
                <button
                  className={styles.methodHeader}
                  type="button"
                  onClick={() =>
                    setExpandedPaymentMethod(
                      isExpanded ? "CASH" : paymentMethod.method,
                    )
                  }
                >
                  <strong>{paymentMethod.label}</strong>
                  <span className={styles.methodHeaderAmount}>
                    {formatCashRegisterCurrency(balance)}
                    <span className={styles.methodChevron}>
                      {isExpanded ? "⌃" : "⌄"}
                    </span>
                  </span>
                </button>

                {isExpanded ? (
                  <div className={styles.methodRows}>
                    {getPaymentMethodRows(session, paymentMethod.method).map(
                      (row) => (
                        <div className={styles.methodRow} key={row.label}>
                          <span>{row.label}</span>
                          <strong
                            className={
                              row.tone === "danger" ? styles.negativeValue : ""
                            }
                          >
                            {row.tone === "danger"
                              ? getSignedCurrency(row.value)
                              : formatCashRegisterCurrency(row.value)}
                          </strong>
                        </div>
                      ),
                    )}
                    <div className={styles.methodDivider} />
                    <div className={styles.methodBalanceRow}>
                      <strong>Balance total</strong>
                      <strong>{formatCashRegisterCurrency(balance)}</strong>
                    </div>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>

        {closingStep === "review" ? (
          <>
            <section className={styles.reconciliationCard}>
              <h4>Conteo por medio de pago</h4>
              {closingDifferences.map((item) => (
                <div className={styles.reconciliationRow} key={item.method}>
                  <span>
                    <strong>{item.label}</strong>
                    <small>
                      Esperado {formatCashRegisterCurrency(item.expected)}
                    </small>
                  </span>
                  <span>
                    <strong>{formatCashRegisterCurrency(item.counted)}</strong>
                    <small
                      className={
                        Math.abs(item.difference) >= 0.01
                          ? styles.negativeValue
                          : styles.reconciledValue
                      }
                    >
                      {Math.abs(item.difference) < 0.01
                        ? "Cuadra"
                        : `Diferencia ${formatCashRegisterCurrency(item.difference)}`}
                    </small>
                  </span>
                </div>
              ))}
            </section>

            {hasClosingDifference ? (
              <>
                <div className={styles.cashAlert} role="alert">
                  <span aria-hidden="true">i</span>
                  <strong>
                    {closingDifference < 0
                      ? `Te faltan ${formatCashRegisterCurrency(
                          Math.abs(closingDifference),
                        )} entre todos los medios.`
                      : `Te sobran ${formatCashRegisterCurrency(
                          closingDifference,
                        )} entre todos los medios.`}
                  </strong>
                </div>

                <label className={`${styles.field} ${styles.discrepancyNote}`}>
                  <span className={styles.noteLabel}>Nota</span>
                  <textarea
                    className={styles.discrepancyTextarea}
                    placeholder="Puedes dejar una nota que aclare el motivo del descuadre para recordarlo más adelante."
                    rows={4}
                    value={closingNote}
                    onChange={(event) => setClosingNote(event.target.value)}
                  />
                </label>
              </>
            ) : (
              <div className={styles.cashSuccess} role="status">
                <span aria-hidden="true">✓</span>
                <strong>
                  ¡Perfecto! El dinero que tienes en caja es correcto.
                </strong>
              </div>
            )}
          </>
        ) : null}

        <section className={styles.shiftSummary}>
          <button className={styles.shiftSummaryHeader} type="button">
            <strong>Resumen del turno</strong>
            <span>⌃</span>
          </button>
          <div className={styles.shiftSummaryRows}>
            <div className={styles.shiftSummaryRow}>
              <span>Total ventas</span>
              <strong>{formatCashRegisterCurrency(session.salesTotal)}</strong>
            </div>
            <div className={styles.shiftSummaryRow}>
              <span>Total abonos</span>
              <strong>
                {formatCashRegisterCurrency(session.receivableCollectionsTotal)}
              </strong>
            </div>
            {session.ownerLoanProceedsTotal > 0 ? (
              <div className={styles.shiftSummaryRow}>
                <span>Préstamos recibidos</span>
                <strong>
                  {formatCashRegisterCurrency(session.ownerLoanProceedsTotal)}
                </strong>
              </div>
            ) : null}
            {session.ownerLoanPaymentsTotal > 0 ? (
              <div className={styles.shiftSummaryRow}>
                <span>Abonos a préstamos</span>
                <strong className={styles.negativeValue}>
                  {getSignedCurrency(session.ownerLoanPaymentsTotal)}
                </strong>
              </div>
            ) : null}
            {session.ownerLoansOutstandingTotal > 0 ? (
              <div className={styles.shiftSummaryRow}>
                <span>Deuda con propietario</span>
                <strong>
                  {formatCashRegisterCurrency(
                    session.ownerLoansOutstandingTotal,
                  )}
                </strong>
              </div>
            ) : null}
            {closingStep === "review" && hasClosingDifference ? (
              <div className={styles.shiftSummaryRow}>
                <span>Descuadre</span>
                <strong className={styles.negativeValue}>
                  {formatCashRegisterCurrency(closingDifference)}
                </strong>
              </div>
            ) : null}
            <div className={styles.shiftSummaryRow}>
              <span>Total gastos</span>
              <strong className={styles.negativeValue}>
                {getSignedCurrency(session.expensesTotal)}
              </strong>
            </div>
            <div className={styles.shiftSummaryRow}>
              <span>Balance</span>
              <strong>
                {formatCashRegisterCurrency(
                  getShiftBalance(
                    session,
                    closingStep === "review" ? closingDifference : 0,
                  ),
                )}
              </strong>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <CashRegisterRetailDrawer
      bodyClassName={shouldUseRecordsLayout ? styles.recordsBody : undefined}
      confirmClose
      footer={
        !currentSession ? (
          <button
            className={styles.footerButton}
            disabled={isSubmitting}
            type="button"
            onClick={() => {
              void handleOpenRequest();
            }}
          >
            {isSubmitting ? "Abriendo..." : "Empezar turno"}
          </button>
        ) : activeMode === "close" && closingStep === "form" ? (
          <button
            className={styles.footerButton}
            disabled={isSubmitting}
            type="button"
            onClick={handleCloseCountRequest}
          >
            Continuar
          </button>
        ) : activeMode === "close" && closingStep === "review" ? (
          <div className={styles.reviewFooter}>
            <button
              aria-label="Imprimir arqueo"
              className={styles.iconFooterButton}
              disabled={isSubmitting}
              type="button"
              onClick={() =>
                currentSession
                  ? openPrintableVoucher(
                      currentSession,
                      closingAmountValue,
                      closingDifference,
                      { businessLogoUrl, businessName },
                    )
                  : undefined
              }
            >
              ⎙
            </button>
            <button
              aria-label="Descargar arqueo"
              className={styles.iconFooterButton}
              disabled={isSubmitting}
              type="button"
              onClick={() =>
                currentSession
                  ? downloadVoucher(
                      currentSession,
                      closingAmountValue,
                      closingDifference,
                      { businessLogoUrl, businessName },
                    )
                  : undefined
              }
            >
              ↓
            </button>
            <button
              className={styles.confirmCloseButton}
              disabled={isSubmitting}
              type="button"
              onClick={() => {
                void handleConfirmClose();
              }}
            >
              {isSubmitting ? "Cerrando..." : "Confirmar cierre"}
            </button>
          </div>
        ) : undefined
      }
      footerClassName={
        activeMode === "close" && closingStep === "review"
          ? styles.reviewFooterShell
          : undefined
      }
      isOpen={isOpen}
      panelClassName={shouldUseRecordsLayout ? styles.recordsPanel : undefined}
      title={drawerTitle}
      description={drawerDescription}
      onClose={onClose}
    >
      {!currentSession ? (
        <form
          className={styles.form}
          id="open-cash-register-form"
          noValidate
          onSubmit={handleOpenSubmit}
        >
          <label className={styles.field}>
            <span className={styles.label}>Empleado encargado</span>
            <SearchableSelect
              className={styles.select}
              value={assigneeId}
              onChange={(event) => setAssigneeId(event.target.value)}
            >
              {assignees.map((assignee) => (
                <option key={assignee.id} value={assignee.id}>
                  {assignee.name} · {assignee.role}
                </option>
              ))}
            </SearchableSelect>
          </label>

          <section className={styles.balanceSection}>
            <div className={styles.balanceSectionHeader}>
              <span>
                <strong>Saldos al iniciar el turno</strong>
                <small>
                  Registra lo que realmente tienes disponible en cada medio.
                </small>
              </span>
              {latestClosedSession ? <em>Sugerido desde el último cierre</em> : null}
            </div>
            <div className={styles.balanceGrid}>
              {paymentMethodsOrder.map(({ method, label }) => (
                <label className={styles.field} key={method}>
                  <span className={styles.label}>{label}</span>
                  <input
                    className={styles.input}
                    inputMode="decimal"
                    min="0"
                    placeholder="$ 0"
                    step="0.01"
                    type="number"
                    value={openingBalances[method]}
                    onChange={(event) =>
                      setOpeningBalances((current) => ({
                        ...current,
                        [method]: event.target.value,
                      }))
                    }
                  />
                </label>
              ))}
            </div>
          </section>

          {errorMessage ? (
            <p className={styles.errorMessage}>{errorMessage}</p>
          ) : null}
        </form>
      ) : activeMode === "summary" || closingStep === "review" ? (
        <>
          {renderRecordsSummary(currentSession)}
          {errorMessage ? (
            <p className={styles.errorMessage}>{errorMessage}</p>
          ) : null}
        </>
      ) : activeMode === "close" ? (
        <form
          className={styles.form}
          id="close-cash-register-count-form"
          noValidate
          onSubmit={handleCloseCountSubmit}
        >
          <label className={styles.field}>
            <span className={styles.label}>Empleado encargado</span>
            <SearchableSelect
              className={styles.select}
              value={assigneeId}
              onChange={(event) => setAssigneeId(event.target.value)}
            >
              {assignees.map((assignee) => (
                <option key={assignee.id} value={assignee.id}>
                  {assignee.name} · {assignee.role}
                </option>
              ))}
            </SearchableSelect>
          </label>

          <section className={styles.balanceSection}>
            <div className={styles.balanceSectionHeader}>
              <span>
                <strong>Conteo real al cerrar</strong>
                <small>
                  Cuenta el efectivo y consulta los saldos reales de tus otros medios.
                </small>
              </span>
            </div>
            <div className={styles.balanceGrid}>
              {paymentMethodsOrder.map(({ method, label }) => (
                <label className={styles.field} key={method}>
                  <span className={styles.label}>{label}</span>
                  <input
                    className={styles.input}
                    inputMode="decimal"
                    placeholder="$ 0"
                    type="text"
                    value={closingBalances[method]}
                    onChange={(event) =>
                      setClosingBalances((current) => ({
                        ...current,
                        [method]: event.target.value,
                      }))
                    }
                  />
                  <small className={styles.expectedHint}>
                    Esperado: {formatCashRegisterCurrency(
                      getPaymentMethodBalance(currentSession, method),
                    )}
                  </small>
                </label>
              ))}
            </div>
          </section>

          {errorMessage ? (
            <p className={styles.errorMessage}>{errorMessage}</p>
          ) : null}
        </form>
      ) : (
        <div className={styles.sections}>
          <section className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Turno actual</span>
            <strong className={styles.summaryValue}>
              {currentSession.responsibleUserName ?? "Caja activa"}
            </strong>
            <span className={styles.summaryMeta}>
              Abierta el {formatCashRegisterDateTime(currentSession.openedAt)}
            </span>

            <div className={styles.metricsGrid}>
              <div className={styles.metric}>
                <span>Base en efectivo</span>
                <strong>
                  {formatCashRegisterCurrency(currentSession.openingAmount)}
                </strong>
              </div>
              <div className={styles.metric}>
                <span>Efectivo esperado</span>
                <strong>
                  {formatCashRegisterCurrency(currentSession.cashExpectedTotal)}
                </strong>
              </div>
              <div className={styles.metric}>
                <span>Total del turno</span>
                <strong>
                  {formatCashRegisterCurrency(getShiftBalance(currentSession))}
                </strong>
              </div>
              <div className={styles.metric}>
                <span>Total negocio disponible</span>
                <strong>
                  {formatCashRegisterCurrency(
                    getShiftBalance(currentSession) + (reserveSummary?.total ?? 0),
                  )}
                </strong>
              </div>
            </div>
          </section>

          <section className={styles.reserveCard}>
            <div className={styles.reserveCardHeader}>
              <span>
                <small>Reserva del negocio</small>
                <strong>
                  {formatCashRegisterCurrency(reserveSummary?.total ?? 0)}
                </strong>
              </span>
              <em>No pertenece al turno</em>
            </div>
            <div className={styles.reserveBalances}>
              {paymentMethodsOrder.map(({ method, label }) => {
                const amount =
                  reserveSummary?.balances.find(
                    (balance) => balance.method === method,
                  )?.amount ?? 0;

                return (
                  <div key={method}>
                    <span>{label}</span>
                    <strong>{formatCashRegisterCurrency(amount)}</strong>
                  </div>
                );
              })}
            </div>
          </section>

          <form
            className={styles.form}
            noValidate
            onSubmit={handleManualEntrySubmit}
          >
            <h4 className={styles.sectionTitle}>Movimiento rápido</h4>

            <div className={styles.inlineFields}>
              <label className={styles.field}>
                <span className={styles.label}>Tipo</span>
                <SearchableSelect
                  className={styles.select}
                  value={entryType}
                  onChange={(event) =>
                    setEntryType(event.target.value as CashRegisterEntryType)
                  }
                >
                  <option value="INCOME">Ingreso</option>
                  <option value="EXPENSE">Egreso</option>
                </SearchableSelect>
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Monto</span>
                <input
                  className={styles.input}
                  inputMode="decimal"
                  min="0"
                  placeholder="0.00"
                  step="0.01"
                  type="number"
                  value={entryAmount}
                  onChange={(event) => setEntryAmount(event.target.value)}
                />
              </label>
            </div>

            <label className={styles.field}>
              <span className={styles.label}>Concepto</span>
              <input
                className={styles.input}
                placeholder="Ej. flete, caja menor, reposición..."
                type="text"
                value={entryReason}
                onChange={(event) => setEntryReason(event.target.value)}
              />
            </label>

            <button
              className={retailStyles.buttonOutline}
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Guardando..." : "Crear movimiento"}
            </button>
          </form>

          <form
            className={`${styles.form} ${styles.transferForm}`}
            noValidate
            onSubmit={handleTransferSubmit}
          >
            <div>
              <h4 className={styles.sectionTitle}>Mover dinero entre medios</h4>
              <p className={styles.sectionDescription}>
                Úsalo, por ejemplo, cuando pases efectivo a Nequi o retires dinero de Nequi para la caja.
              </p>
            </div>

            <div className={styles.inlineFields}>
              <label className={styles.field}>
                <span className={styles.label}>Desde</span>
                <SearchableSelect
                  className={styles.select}
                  value={transferFrom}
                  onChange={(event) =>
                    setTransferFrom(event.target.value as CashRegisterPaymentMethod)
                  }
                >
                  {paymentMethodsOrder.map(({ method, label }) => (
                    <option key={method} value={method}>{label}</option>
                  ))}
                </SearchableSelect>
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Hacia</span>
                <SearchableSelect
                  className={styles.select}
                  value={transferTo}
                  onChange={(event) =>
                    setTransferTo(event.target.value as CashRegisterPaymentMethod)
                  }
                >
                  {paymentMethodsOrder.map(({ method, label }) => (
                    <option key={method} value={method}>{label}</option>
                  ))}
                </SearchableSelect>
              </label>
            </div>

            <label className={styles.field}>
              <span className={styles.label}>Monto</span>
              <input
                className={styles.input}
                inputMode="decimal"
                min="0.01"
                placeholder="$ 0"
                step="0.01"
                type="number"
                value={transferAmount}
                onChange={(event) => setTransferAmount(event.target.value)}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Nota opcional</span>
              <input
                className={styles.input}
                placeholder="Ej. consignación de efectivo a Nequi"
                type="text"
                value={transferNotes}
                onChange={(event) => setTransferNotes(event.target.value)}
              />
            </label>

            <button
              className={retailStyles.buttonOutline}
              disabled={isSubmitting || transferFrom === transferTo}
              type="submit"
            >
              {isSubmitting ? "Guardando..." : "Registrar transferencia"}
            </button>
          </form>

          <form
            className={`${styles.form} ${styles.transferForm}`}
            noValidate
            onSubmit={handleReserveTransferSubmit}
          >
            <div>
              <h4 className={styles.sectionTitle}>Caja del turno ↔ reserva</h4>
              <p className={styles.sectionDescription}>
                Guarda dinero fuera del turno o vuelve a traerlo cuando lo necesites. Este movimiento no cambia la ganancia.
              </p>
            </div>

            <div className={styles.inlineFields}>
              <label className={styles.field}>
                <span className={styles.label}>Movimiento</span>
                <SearchableSelect
                  className={styles.select}
                  value={reserveTransferDirection}
                  onChange={(event) =>
                    setReserveTransferDirection(
                      event.target.value as ReserveTransferDirection,
                    )
                  }
                >
                  <option value="TO_RESERVE">Caja → reserva</option>
                  <option value="FROM_RESERVE">Reserva → caja</option>
                </SearchableSelect>
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Medio</span>
                <SearchableSelect
                  className={styles.select}
                  value={reserveTransferMethod}
                  onChange={(event) =>
                    setReserveTransferMethod(
                      event.target.value as CashRegisterPaymentMethod,
                    )
                  }
                >
                  {paymentMethodsOrder.map(({ method, label }) => (
                    <option key={method} value={method}>{label}</option>
                  ))}
                </SearchableSelect>
              </label>
            </div>

            <label className={styles.field}>
              <span className={styles.label}>Monto</span>
              <input
                className={styles.input}
                inputMode="decimal"
                min="0.01"
                placeholder="$ 0"
                step="0.01"
                type="number"
                value={reserveTransferAmount}
                onChange={(event) => setReserveTransferAmount(event.target.value)}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Nota opcional</span>
              <input
                className={styles.input}
                placeholder="Ej. dinero guardado en caja fuerte"
                type="text"
                value={reserveTransferNotes}
                onChange={(event) => setReserveTransferNotes(event.target.value)}
              />
            </label>

            <button
              className={retailStyles.buttonOutline}
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Guardando..." : "Mover dinero"}
            </button>
          </form>

          <form
            className={`${styles.form} ${styles.reserveAdjustmentForm}`}
            noValidate
            onSubmit={handleReserveAdjustmentSubmit}
          >
            <div>
              <h4 className={styles.sectionTitle}>Conciliar dinero ya guardado</h4>
              <p className={styles.sectionDescription}>
                Úsalo para registrar el valor real que ya tenías fuera de la caja. Escribe el saldo total de la reserva, no solo la diferencia.
              </p>
            </div>
            <div className={styles.inlineFields}>
              <label className={styles.field}>
                <span className={styles.label}>Medio</span>
                <SearchableSelect
                  className={styles.select}
                  value={reserveAdjustmentMethod}
                  onChange={(event) =>
                    setReserveAdjustmentMethod(
                      event.target.value as CashRegisterPaymentMethod,
                    )
                  }
                >
                  {paymentMethodsOrder.map(({ method, label }) => (
                    <option key={method} value={method}>{label}</option>
                  ))}
                </SearchableSelect>
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Saldo real guardado</span>
                <input
                  className={styles.input}
                  inputMode="decimal"
                  min="0"
                  placeholder="$ 0"
                  step="0.01"
                  type="number"
                  value={reserveAdjustmentAmount}
                  onChange={(event) => setReserveAdjustmentAmount(event.target.value)}
                />
              </label>
            </div>
            <button
              className={retailStyles.buttonOutline}
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Guardando..." : "Actualizar reserva"}
            </button>
          </form>

          <button
            className={styles.footerButton}
            disabled={isSubmitting}
            type="button"
            onClick={() => {
              setActiveMode("close");
              setClosingStep("form");
            }}
          >
            Cerrar caja
          </button>
        </div>
      )}
    </CashRegisterRetailDrawer>
  );
}
