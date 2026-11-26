import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import { useEffect, useId, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowLeft,
  ArrowLeftRight,
  Banknote,
  CheckCircle2,
  ChevronDown,
  LockKeyhole,
  Vault,
} from "lucide-react";
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
import {
  cashRegisterPaymentMethods as paymentMethodsOrder,
  getPaymentMethodBalance,
  getPaymentMethodRows,
  getShiftBalance,
  getSignedCurrency,
} from "@/modules/cash-register/utils/cash-register-summary";
import { useAuthSessionStore } from "@/modules/auth/hooks/use-auth-session-store";
import { getActiveBusinessRole } from "@/modules/auth/utils/get-active-business";
import { isTeamManagementRole } from "@/shared/constants/user-roles";
import { FormValidationAlert } from "@/shared/components/ui/FormValidationAlert";
import { downloadBlobFile } from "@/shared/utils/download-blob-file";
import { CashRegisterRetailDrawer } from "./CashRegisterRetailDrawer";
import { CashRegisterReserveBreakdown } from "./CashRegisterReserveBreakdown";
import styles from "./CashRegisterSessionDrawer.module.css";

export type CashRegisterDrawerMode = "manage" | "close";
export type CashRegisterManagementSection = "movement" | "transfer" | "reserve";

const managementSections = [
  { id: "movement", label: "Ingresos y retiros", Icon: Banknote },
  { id: "transfer", label: "Entre medios", Icon: ArrowLeftRight },
  { id: "reserve", label: "Reserva", Icon: Vault },
] as const;

type CashRegisterSessionDrawerProps = {
  isOpen: boolean;
  assignees: CashRegisterAssignee[];
  currentSession: CashRegisterSession | null;
  latestClosedSession?: CashRegisterSession | null;
  reserveSummary?: ReserveSummary | null;
  businessLogoUrl?: string | null;
  businessName?: string | null;
  initialMode?: CashRegisterDrawerMode;
  initialManagementSection?: CashRegisterManagementSection;
  isSubmitting: boolean;
  onClose: () => void;
  onOpenSession: (input: OpenCashRegisterInput) => Promise<void>;
  onOpened?: () => void;
  onCloseSession: (
    input: CloseCashRegisterInput,
  ) => Promise<CashRegisterSession | void>;
  onManualEntry: (input: CashRegisterManualEntryInput) => Promise<void>;
  onTransfer: (input: PaymentMethodTransferInput) => Promise<void>;
  onReserveTransfer: (input: ReserveTransferInput) => Promise<void>;
  onReserveAdjust: (input: ReserveBalanceAdjustmentInput) => Promise<void>;
  onViewTransferHistory?: () => void;
};

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

function getExpectedClosingBalances(
  session: CashRegisterSession,
): MethodAmounts {
  const balances = createEmptyMethodAmounts();

  for (const { method } of paymentMethodsOrder) {
    const expected = getPaymentMethodBalance(session, method);
    balances[method] = String(Number(expected.toFixed(2)));
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
  initialManagementSection = "movement",
  isSubmitting,
  onClose,
  onOpenSession,
  onOpened,
  onCloseSession,
  onManualEntry,
  onTransfer,
  onReserveTransfer,
  onReserveAdjust,
  onViewTransferHistory,
}: CashRegisterSessionDrawerProps) {
  const role = useAuthSessionStore((state) =>
    getActiveBusinessRole(state.user),
  );
  const canAdjustReserve = isTeamManagementRole(role);
  const [assigneeId, setAssigneeId] = useState(
    getInitialAssigneeId(assignees, currentSession),
  );
  const [activeMode, setActiveMode] =
    useState<CashRegisterDrawerMode>(initialMode);
  const [managementSection, setManagementSection] = useState(
    initialManagementSection,
  );
  const [successMessage, setSuccessMessage] = useState("");
  const managementFormId = useId();
  const [closingStep, setClosingStep] = useState<"form" | "review">("form");
  const [expandedPaymentMethod, setExpandedPaymentMethod] =
    useState<CashRegisterPaymentMethod>("CASH");
  const [openingBalances, setOpeningBalances] = useState<MethodAmounts>(() =>
    getSuggestedOpeningBalances(latestClosedSession),
  );
  const [entryType, setEntryType] = useState<CashRegisterEntryType>("INCOME");
  const submitActionLabel = {
    movement: entryType === "INCOME" ? "Registrar ingreso" : "Registrar retiro",
    transfer: "Registrar traslado",
    reserve: "Registrar movimiento de reserva",
  }[managementSection];
  const [entryAmount, setEntryAmount] = useState("");
  const [entryReason, setEntryReason] = useState("");
  const [closingBalanceEdits, setClosingBalanceEdits] = useState<
    Partial<MethodAmounts>
  >({});
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

    setActiveMode(initialMode);
    setManagementSection(initialManagementSection);
    setClosingStep("form");
    setExpandedPaymentMethod("CASH");
    setErrorMessage(null);
    setSuccessMessage("");
    setClosingBalanceEdits({});
    setClosingNote("");
    setEntryAmount("");
    setEntryReason("");
    setTransferAmount("");
    setTransferNotes("");
    setReserveTransferAmount("");
    setReserveTransferNotes("");
    setReserveAdjustmentAmount("");
  }, [initialMode, initialManagementSection, isOpen]);

  useEffect(() => {
    if (isOpen) setAssigneeId(getInitialAssigneeId(assignees, currentSession));
  }, [assignees, currentSession, isOpen]);

  useEffect(() => {
    if (isOpen && !currentSession) {
      setOpeningBalances(getSuggestedOpeningBalances(latestClosedSession));
    }
  }, [currentSession, isOpen, latestClosedSession]);

  const closingBalances = useMemo(
    () => ({
      ...(currentSession
        ? getExpectedClosingBalances(currentSession)
        : createEmptyMethodAmounts()),
      ...closingBalanceEdits,
    }),
    [currentSession, closingBalanceEdits],
  );

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

        return {
          method,
          label,
          expected,
          counted,
          difference: counted - expected,
        };
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
    : closingStep === "review"
      ? "Revisar arqueo"
      : activeMode === "close"
        ? "Cerrar caja"
        : "Caja activa";
  const drawerDescription =
    currentSession && activeMode === "manage"
      ? "Elige qué operación vas a registrar en este turno."
      : currentSession && activeMode === "close" && closingStep === "form"
        ? "En el siguiente paso podrás confirmar los valores por método de pago."
        : undefined;
  const shouldUseRecordsLayout = Boolean(
    currentSession && closingStep === "review",
  );
  const hasDraft =
    [
      entryAmount,
      entryReason,
      transferAmount,
      transferNotes,
      reserveTransferAmount,
      reserveTransferNotes,
      reserveAdjustmentAmount,
      closingNote,
    ].some((value) => value.trim()) ||
    Object.keys(closingBalanceEdits).length > 0;

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
      onOpened?.();
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
    setSuccessMessage("");

    const amount = parseAmountInput(entryAmount);
    if (amount <= 0 || !entryReason.trim()) {
      setErrorMessage("Ingresa un monto mayor que cero y escribe el concepto.");
      return;
    }

    try {
      await onManualEntry({
        type: entryType,
        amount,
        reason: entryReason.trim(),
      });
      setEntryAmount("");
      setEntryReason("");
      setSuccessMessage(
        entryType === "INCOME"
          ? "Ingreso de efectivo registrado."
          : "Retiro de efectivo registrado.",
      );
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
    setSuccessMessage("");

    if (transferFrom === transferTo) {
      setErrorMessage(
        "Selecciona dos medios de pago diferentes para realizar la transferencia.",
      );
      return;
    }

    if (parseAmountInput(transferAmount) <= 0) {
      setErrorMessage("Ingresa un monto mayor que cero para la transferencia.");
      return;
    }

    try {
      await onTransfer({
        fromMethod: transferFrom,
        toMethod: transferTo,
        amount: parseAmountInput(transferAmount),
        notes: transferNotes.trim() || undefined,
      });
      setTransferAmount("");
      setTransferNotes("");
      setSuccessMessage("Traslado entre medios registrado.");
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
    setSuccessMessage("");

    const amount = parseAmountInput(reserveTransferAmount);
    if (amount <= 0) {
      setErrorMessage("Ingresa un monto mayor que cero para mover dinero.");
      return;
    }

    try {
      await onReserveTransfer({
        method: reserveTransferMethod,
        direction: reserveTransferDirection,
        amount,
        notes: reserveTransferNotes.trim() || undefined,
      });
      setReserveTransferAmount("");
      setReserveTransferNotes("");
      setSuccessMessage("Movimiento entre caja y reserva registrado.");
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
    setSuccessMessage("");

    if (
      !reserveAdjustmentAmount.trim() ||
      parseAmountInput(reserveAdjustmentAmount) < 0
    ) {
      setErrorMessage("Ingresa un saldo real guardado mayor o igual a cero.");
      return;
    }

    try {
      await onReserveAdjust({
        method: reserveAdjustmentMethod,
        amount: parseAmountInput(reserveAdjustmentAmount),
        notes: "Conciliación del dinero que ya estaba guardado",
      });
      setReserveAdjustmentAmount("");
      setSuccessMessage("Saldo de la reserva actualizado.");
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
    const invalid = paymentMethodsOrder.find(({ method }) => {
      const value = closingBalances[method].replace(/[\s$]/g, "");
      return !/^(?:\d+(?:[,.]\d{1,2})?|\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?)$/.test(
        value,
      );
    });
    if (invalid) {
      setErrorMessage(
        `Revisa el saldo contado de ${invalid.label}. Ingresa un valor mayor o igual a cero.`,
      );
      return;
    }
    setClosingBalanceEdits(closingBalances);
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
            {session.reversalsTotal > 0 ? (
              <div className={styles.shiftSummaryRow}>
                <span>Reversiones de ventas</span>
                <strong className={styles.negativeValue}>
                  {getSignedCurrency(session.reversalsTotal)}
                </strong>
              </div>
            ) : null}
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
      confirmClose={!currentSession || hasDraft}
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
            Revisar arqueo
          </button>
        ) : activeMode === "close" && closingStep === "review" ? (
          <div className={styles.reviewFooter}>
            <button
              className={styles.editCountButton}
              disabled={isSubmitting}
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setClosingStep("form");
              }}
            >
              <ArrowLeft aria-hidden="true" /> Editar conteo
            </button>
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
        ) : (
          <button
            className={styles.operationSubmit}
            disabled={isSubmitting}
            form={managementFormId}
            type="submit"
          >
            {isSubmitting ? "Guardando…" : submitActionLabel}
          </button>
        )
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
              {latestClosedSession ? (
                <em>Sugerido desde el último cierre</em>
              ) : null}
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
      ) : closingStep === "review" ? (
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
                  Comprueba los montos y corrige cada saldo con el valor que
                  contaste.
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
                      setClosingBalanceEdits((current) => ({
                        ...current,
                        [method]: event.target.value,
                      }))
                    }
                  />
                  <small className={styles.expectedHint}>
                    Esperado:{" "}
                    {formatCashRegisterCurrency(
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
          {errorMessage ? <FormValidationAlert message={errorMessage} /> : null}

          <details className={styles.reconcileDisclosure}>
            <summary>
              Consultar saldos del turno <ChevronDown aria-hidden="true" />
            </summary>
            <dl className={styles.drawerBalances}>
              <div>
                <dt>Base inicial en efectivo</dt>
                <dd>
                  {formatCashRegisterCurrency(currentSession.openingAmount)}
                </dd>
              </div>
              <div>
                <dt>Efectivo esperado</dt>
                <dd>
                  {formatCashRegisterCurrency(currentSession.cashExpectedTotal)}
                </dd>
              </div>
              <div>
                <dt>Saldo total del turno</dt>
                <dd>
                  {formatCashRegisterCurrency(getShiftBalance(currentSession))}
                </dd>
              </div>
              {reserveSummary ? (
                <>
                  <div>
                    <dt>Reserva del negocio</dt>
                    <dd>{formatCashRegisterCurrency(reserveSummary.total)}</dd>
                  </div>
                  <div>
                    <dt>Total disponible del negocio</dt>
                    <dd>
                      {formatCashRegisterCurrency(
                        getShiftBalance(currentSession) + reserveSummary.total,
                      )}
                    </dd>
                  </div>
                </>
              ) : null}
            </dl>
          </details>

          <div
            className={styles.managementNav}
            role="group"
            aria-label="Operaciones de caja"
          >
            {managementSections.map(({ id, label, Icon }) => (
              <button
                aria-pressed={managementSection === id}
                data-operation={id}
                disabled={isSubmitting}
                key={id}
                type="button"
                onClick={() => {
                  setManagementSection(id);
                  setErrorMessage(null);
                  setSuccessMessage("");
                }}
              >
                <Icon aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>

          {successMessage ? (
            <p className={styles.managementSuccess} role="status">
              <CheckCircle2 aria-hidden="true" /> {successMessage}
            </p>
          ) : null}

          {managementSection === "movement" ? (
            <form
              className={`${styles.form} ${styles.transferForm}`}
              id={managementFormId}
              noValidate
              onSubmit={handleManualEntrySubmit}
            >
              <div>
                <h4 className={styles.sectionTitle}>Movimiento de efectivo</h4>
                <p className={styles.sectionDescription}>
                  Registra efectivo que entra o sale de la caja del turno.
                </p>
              </div>
              <p className={styles.availableAmount}>
                Efectivo esperado{" "}
                <strong>
                  {formatCashRegisterCurrency(currentSession.cashExpectedTotal)}
                </strong>
              </p>

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
                    <option value="EXPENSE">Retiro</option>
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
                  placeholder="Ej. cambio para la caja o retiro para un gasto"
                  type="text"
                  value={entryReason}
                  onChange={(event) => setEntryReason(event.target.value)}
                />
              </label>
            </form>
          ) : null}

          {managementSection === "transfer" ? (
            <form
              className={`${styles.form} ${styles.transferForm}`}
              id={managementFormId}
              noValidate
              onSubmit={handleTransferSubmit}
            >
              <div>
                <h4 className={styles.sectionTitle}>Traslado entre medios</h4>
                <p className={styles.sectionDescription}>
                  Registra un traslado que ya realizaste, como pasar efectivo a
                  Nequi. El saldo total del turno se conserva.
                </p>
              </div>

              <div className={styles.inlineFields}>
                <label className={styles.field}>
                  <span className={styles.label}>Desde</span>
                  <SearchableSelect
                    className={styles.select}
                    value={transferFrom}
                    onChange={(event) =>
                      setTransferFrom(
                        event.target.value as CashRegisterPaymentMethod,
                      )
                    }
                  >
                    {paymentMethodsOrder.map(({ method, label }) => (
                      <option key={method} value={method}>
                        {label}
                      </option>
                    ))}
                  </SearchableSelect>
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>Hacia</span>
                  <SearchableSelect
                    className={styles.select}
                    value={transferTo}
                    onChange={(event) =>
                      setTransferTo(
                        event.target.value as CashRegisterPaymentMethod,
                      )
                    }
                  >
                    {paymentMethodsOrder.map(({ method, label }) => (
                      <option key={method} value={method}>
                        {label}
                      </option>
                    ))}
                  </SearchableSelect>
                </label>
              </div>

              <p className={styles.availableAmount}>
                Saldo esperado en el origen{" "}
                <strong>
                  {formatCashRegisterCurrency(
                    getPaymentMethodBalance(currentSession, transferFrom),
                  )}
                </strong>
              </p>

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
            </form>
          ) : null}

          {managementSection === "reserve" ? (
            <>
              <details className={styles.reserveCard}>
                <summary className={styles.reserveCardHeader}>
                  <span>
                    <small>Reserva del negocio</small>
                    <strong>
                      {reserveSummary
                        ? formatCashRegisterCurrency(reserveSummary.total)
                        : "Saldo no disponible"}
                    </strong>
                  </span>
                  <ChevronDown aria-hidden="true" />
                </summary>
                {reserveSummary ? (
                  <div className={styles.reserveDetails}>
                    <CashRegisterReserveBreakdown
                      balances={reserveSummary.balances}
                    />
                  </div>
                ) : (
                  <p className={styles.reserveDetails}>
                    No pudimos consultar el desglose de la reserva.
                  </p>
                )}
              </details>

              <form
                className={`${styles.form} ${styles.transferForm}`}
                id={managementFormId}
                noValidate
                onSubmit={handleReserveTransferSubmit}
              >
                <div>
                  <h4 className={styles.sectionTitle}>
                    Mover dinero entre caja y reserva
                  </h4>
                  <p className={styles.sectionDescription}>
                    Registra dinero que guardas fuera del turno o que devuelves
                    a la caja.
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
                      <option value="TO_RESERVE">Guardar en la reserva</option>
                      <option value="FROM_RESERVE">Traer a la caja</option>
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
                        <option key={method} value={method}>
                          {label}
                        </option>
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
                    onChange={(event) =>
                      setReserveTransferAmount(event.target.value)
                    }
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>Nota opcional</span>
                  <input
                    className={styles.input}
                    placeholder="Ej. dinero guardado en caja fuerte"
                    type="text"
                    value={reserveTransferNotes}
                    onChange={(event) =>
                      setReserveTransferNotes(event.target.value)
                    }
                  />
                </label>
              </form>

              {canAdjustReserve ? (
                <details className={styles.reconcileDisclosure}>
                  <summary>
                    Conciliar la reserva <ChevronDown aria-hidden="true" />
                  </summary>
                  <form
                    className={`${styles.form} ${styles.reserveAdjustmentForm}`}
                    noValidate
                    onSubmit={handleReserveAdjustmentSubmit}
                  >
                    <div>
                      <h4 className={styles.sectionTitle}>
                        Actualizar el saldo guardado
                      </h4>
                      <p className={styles.sectionDescription}>
                        Úsalo para registrar el valor real que ya tenías fuera
                        de la caja. Escribe el saldo total de la reserva, no
                        solo la diferencia.
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
                            <option key={method} value={method}>
                              {label}
                            </option>
                          ))}
                        </SearchableSelect>
                      </label>
                      <label className={styles.field}>
                        <span className={styles.label}>
                          Saldo real guardado
                        </span>
                        <input
                          className={styles.input}
                          inputMode="decimal"
                          min="0"
                          placeholder="$ 0"
                          required
                          step="0.01"
                          type="number"
                          value={reserveAdjustmentAmount}
                          onChange={(event) =>
                            setReserveAdjustmentAmount(event.target.value)
                          }
                        />
                      </label>
                    </div>
                    <button
                      className={styles.operationSubmit}
                      disabled={isSubmitting}
                      type="submit"
                    >
                      {isSubmitting ? "Guardando..." : "Actualizar reserva"}
                    </button>
                  </form>
                </details>
              ) : null}
            </>
          ) : null}

          {onViewTransferHistory && managementSection !== "movement" ? (
            <button
              className={styles.historyButton}
              type="button"
              onClick={onViewTransferHistory}
            >
              <span>
                <strong>Historial de transferencias</strong>
                <small>
                  Consulta movimientos entre medios y caja ↔ reserva.
                </small>
              </span>
              <span aria-hidden="true">→</span>
            </button>
          ) : null}

          <button
            className={styles.closeShiftLink}
            disabled={isSubmitting}
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setSuccessMessage("");
              setActiveMode("close");
              setClosingStep("form");
            }}
          >
            <LockKeyhole aria-hidden="true" /> Ir al arqueo
          </button>
        </div>
      )}
    </CashRegisterRetailDrawer>
  );
}
