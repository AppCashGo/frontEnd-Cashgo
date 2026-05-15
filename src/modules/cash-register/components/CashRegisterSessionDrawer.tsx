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
} from "@/modules/cash-register/types/cash-register";
import {
  formatCashRegisterCurrency,
  formatCashRegisterDateTime,
} from "@/modules/cash-register/utils/format-cash-register";
import retailStyles from "@/shared/components/retail/RetailUI.module.css";
import { CashRegisterRetailDrawer } from "./CashRegisterRetailDrawer";
import styles from "./CashRegisterSessionDrawer.module.css";

export type CashRegisterDrawerMode = "manage" | "summary" | "close";

type CashRegisterSessionDrawerProps = {
  isOpen: boolean;
  assignees: CashRegisterAssignee[];
  currentSession: CashRegisterSession | null;
  initialMode?: CashRegisterDrawerMode;
  isSubmitting: boolean;
  onClose: () => void;
  onOpenSession: (input: OpenCashRegisterInput) => Promise<void>;
  onCloseSession: (
    input: CloseCashRegisterInput,
  ) => Promise<CashRegisterSession | void>;
  onManualEntry: (input: CashRegisterManualEntryInput) => Promise<void>;
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
  { method: "TRANSFER", label: "Transferencia" },
  { method: "BANK_DEPOSIT", label: "Consignación" },
  { method: "OTHER", label: "Otros" },
];

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
  if (method === "CASH") {
    return session.cashExpectedTotal;
  }

  return (
    session.paymentMethods.find((paymentMethod) => paymentMethod.method === method)
      ?.amount ?? 0
  );
}

function getPaymentMethodRows(
  session: CashRegisterSession,
  method: CashRegisterPaymentMethod,
): SummaryRow[] {
  if (method === "CASH") {
    return [
      { label: "Dinero base", value: session.openingAmount },
      { label: "Ventas", value: session.cashSalesTotal },
      { label: "Abonos", value: session.cashCollectionsTotal },
      { label: "Gastos", value: session.manualExpenseTotal, tone: "danger" },
    ];
  }

  return [
    { label: "Ventas", value: getPaymentMethodTotal(session, method) },
    { label: "Abonos", value: 0 },
    { label: "Gastos", value: 0, tone: "danger" },
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
  return session.totalIncome - session.expensesTotal + difference;
}

function getSignedCurrency(value: number) {
  if (value <= 0) {
    return formatCashRegisterCurrency(value);
  }

  return `-${formatCashRegisterCurrency(value)}`;
}

function buildVoucherHtml(
  session: CashRegisterSession,
  closingAmount?: number,
  difference = 0,
) {
  const rows = paymentMethodsOrder
    .map((paymentMethod) => {
      const amount = getPaymentMethodBalance(session, paymentMethod.method);

      if (amount <= 0 && paymentMethod.method !== "CASH") {
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
        <h1>Arqueo de caja <span class="brand">Cashgo</span></h1>
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
) {
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    return;
  }

  printWindow.document.write(buildVoucherHtml(session, closingAmount, difference));
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function downloadVoucher(
  session: CashRegisterSession,
  closingAmount?: number,
  difference = 0,
) {
  const blob = new Blob([buildVoucherHtml(session, closingAmount, difference)], {
    type: "text/html;charset=utf-8",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `arqueo-caja-${session.id}.html`;
  link.click();
  window.URL.revokeObjectURL(url);
}

export function CashRegisterSessionDrawer({
  isOpen,
  assignees,
  currentSession,
  initialMode = "manage",
  isSubmitting,
  onClose,
  onOpenSession,
  onCloseSession,
  onManualEntry,
}: CashRegisterSessionDrawerProps) {
  const [assigneeId, setAssigneeId] = useState(
    getInitialAssigneeId(assignees, currentSession),
  );
  const [activeMode, setActiveMode] =
    useState<CashRegisterDrawerMode>(initialMode);
  const [closingStep, setClosingStep] = useState<"form" | "review">("form");
  const [expandedPaymentMethod, setExpandedPaymentMethod] =
    useState<CashRegisterPaymentMethod>("CASH");
  const [openingAmount, setOpeningAmount] = useState("0");
  const [entryType, setEntryType] = useState<CashRegisterEntryType>("INCOME");
  const [entryAmount, setEntryAmount] = useState("");
  const [entryReason, setEntryReason] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [closingNote, setClosingNote] = useState("");
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
  }, [assignees, currentSession, initialMode, isOpen]);

  useEffect(() => {
    if (!currentSession) {
      setClosingAmount("");
      setClosingNote("");
      return;
    }

    setClosingAmount(currentSession.cashExpectedTotal.toFixed(2));
  }, [currentSession]);

  const closingAmountValue = useMemo(
    () => parseAmountInput(closingAmount),
    [closingAmount],
  );
  const closingDifference = currentSession
    ? closingAmountValue - currentSession.cashExpectedTotal
    : 0;
  const hasClosingDifference = Math.abs(closingDifference) >= 0.01;
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
        openingAmount: parseAmountInput(openingAmount),
      });
      setOpeningAmount("0");
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
            const balance = getPaymentMethodBalance(session, paymentMethod.method);

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
            <section className={styles.cashCountCard}>
              <div>
                <strong>Dinero en efectivo</strong>
                <span>{formatCashRegisterCurrency(closingAmountValue)}</span>
              </div>
              <span
                className={
                  hasClosingDifference
                    ? styles.cashStatusPillDanger
                    : styles.cashStatusPillSuccess
                }
              >
                {hasClosingDifference ? "Descuadre" : "Caja completa"}
              </span>
            </section>

            {hasClosingDifference ? (
              <>
                <div className={styles.cashAlert} role="alert">
                  <span aria-hidden="true">i</span>
                  <strong>
                    {closingDifference < 0
                      ? `Te faltan ${formatCashRegisterCurrency(
                          Math.abs(closingDifference),
                        )} en efectivo.`
                      : `Te sobran ${formatCashRegisterCurrency(
                          closingDifference,
                        )} en efectivo.`}
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
                {formatCashRegisterCurrency(
                  session.receivableCollectionsTotal,
                )}
              </strong>
            </div>
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
            <select
              className={styles.select}
              value={assigneeId}
              onChange={(event) => setAssigneeId(event.target.value)}
            >
              {assignees.map((assignee) => (
                <option key={assignee.id} value={assignee.id}>
                  {assignee.name} · {assignee.role}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>
              ¿Con cuánto dinero empiezas el turno? *
            </span>
            <input
              className={styles.input}
              inputMode="decimal"
              min="0"
              placeholder="$ 0"
              step="0.01"
              type="number"
              value={openingAmount}
              onChange={(event) => setOpeningAmount(event.target.value)}
            />
          </label>

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
            <select
              className={styles.select}
              value={assigneeId}
              onChange={(event) => setAssigneeId(event.target.value)}
            >
              {assignees.map((assignee) => (
                <option key={assignee.id} value={assignee.id}>
                  {assignee.name} · {assignee.role}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>
              ¿Cuánto dinero tienes en efectivo? *
            </span>
            <input
              className={styles.input}
              inputMode="decimal"
              placeholder="$ 0"
              type="text"
              value={closingAmount}
              onChange={(event) => setClosingAmount(event.target.value)}
            />
          </label>

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
                <span>Base</span>
                <strong>
                  {formatCashRegisterCurrency(currentSession.openingAmount)}
                </strong>
              </div>
              <div className={styles.metric}>
                <span>Esperado</span>
                <strong>
                  {formatCashRegisterCurrency(currentSession.cashExpectedTotal)}
                </strong>
              </div>
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
                <select
                  className={styles.select}
                  value={entryType}
                  onChange={(event) =>
                    setEntryType(event.target.value as CashRegisterEntryType)
                  }
                >
                  <option value="INCOME">Ingreso</option>
                  <option value="EXPENSE">Egreso</option>
                </select>
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
