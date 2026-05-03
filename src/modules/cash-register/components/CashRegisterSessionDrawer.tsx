import { useEffect, useMemo, useState } from "react";
import type {
  CashRegisterAssignee,
  CashRegisterEntryType,
  CashRegisterManualEntryInput,
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

type CashRegisterSessionDrawerProps = {
  isOpen: boolean;
  assignees: CashRegisterAssignee[];
  currentSession: CashRegisterSession | null;
  isSubmitting: boolean;
  onClose: () => void;
  onOpenSession: (input: OpenCashRegisterInput) => Promise<void>;
  onCloseSession: (input: CloseCashRegisterInput) => Promise<void>;
  onManualEntry: (input: CashRegisterManualEntryInput) => Promise<void>;
};

function getInitialAssigneeId(
  assignees: CashRegisterAssignee[],
  currentSession: CashRegisterSession | null,
) {
  if (currentSession?.responsibleUserId) {
    return currentSession.responsibleUserId;
  }

  return assignees[0]?.id ?? "";
}

export function CashRegisterSessionDrawer({
  isOpen,
  assignees,
  currentSession,
  isSubmitting,
  onClose,
  onOpenSession,
  onCloseSession,
  onManualEntry,
}: CashRegisterSessionDrawerProps) {
  const [assigneeId, setAssigneeId] = useState(
    getInitialAssigneeId(assignees, currentSession),
  );
  const [openingAmount, setOpeningAmount] = useState("0");
  const [openingNote, setOpeningNote] = useState("");
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
    setErrorMessage(null);
  }, [assignees, currentSession, isOpen]);

  useEffect(() => {
    if (!currentSession) {
      setClosingAmount("");
      setClosingNote("");
      return;
    }

    setClosingAmount(currentSession.cashExpectedTotal.toFixed(2));
  }, [currentSession]);

  const drawerTitle = currentSession ? "Caja activa" : "Abrir caja";
  const drawerDescription = currentSession
    ? "Consulta el turno actual, registra movimientos rápidos y cierra la caja cuando termines el arqueo."
    : "Asigna un responsable, define el monto inicial y deja lista la caja del turno.";
  const selectedAssignee = useMemo(
    () => assignees.find((assignee) => assignee.id === assigneeId) ?? null,
    [assigneeId, assignees],
  );

  async function handleOpenSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    try {
      await onOpenSession({
        responsibleUserId: assigneeId || undefined,
        openingAmount: Number(openingAmount),
        openingNote: openingNote.trim() || undefined,
      });
      setOpeningAmount("0");
      setOpeningNote("");
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No fue posible abrir la caja en este momento.",
      );
    }
  }

  async function handleManualEntrySubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setErrorMessage(null);

    try {
      await onManualEntry({
        type: entryType,
        amount: Number(entryAmount),
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

  async function handleCloseSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    try {
      await onCloseSession({
        closingAmount: Number(closingAmount),
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

  return (
    <CashRegisterRetailDrawer
      isOpen={isOpen}
      title={drawerTitle}
      description={drawerDescription}
      onClose={onClose}
      footer={
        !currentSession ? (
          <button
            className={styles.footerButton}
            disabled={isSubmitting}
            form="open-cash-register-form"
            type="submit"
          >
            {isSubmitting ? "Abriendo..." : "Abrir caja"}
          </button>
        ) : undefined
      }
    >
      {!currentSession ? (
        <form
          className={styles.form}
          id="open-cash-register-form"
          noValidate
          onSubmit={handleOpenSubmit}
        >
          <label className={styles.field}>
            <span className={styles.label}>Responsable del turno</span>
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
            <span className={styles.label}>Monto inicial</span>
            <input
              className={styles.input}
              inputMode="decimal"
              min="0"
              placeholder="0.00"
              step="0.01"
              type="number"
              value={openingAmount}
              onChange={(event) => setOpeningAmount(event.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Nota de apertura</span>
            <textarea
              className={styles.textarea}
              placeholder="Ej. caja principal del turno de la mañana."
              rows={4}
              value={openingNote}
              onChange={(event) => setOpeningNote(event.target.value)}
            />
          </label>

          {selectedAssignee ? (
            <div className={styles.summaryBox}>
              <span className={styles.summaryLabel}>
                Responsable seleccionado
              </span>
              <strong>{selectedAssignee.name}</strong>
              <span>{selectedAssignee.role}</span>
            </div>
          ) : null}

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

          <form className={styles.form} noValidate onSubmit={handleCloseSubmit}>
            <h4 className={styles.sectionTitle}>Cerrar caja</h4>

            <label className={styles.field}>
              <span className={styles.label}>Efectivo contado</span>
              <input
                className={styles.input}
                inputMode="decimal"
                min="0"
                placeholder="0.00"
                step="0.01"
                type="number"
                value={closingAmount}
                onChange={(event) => setClosingAmount(event.target.value)}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Nota de cierre</span>
              <textarea
                className={styles.textarea}
                placeholder="Observaciones del conteo final."
                rows={4}
                value={closingNote}
                onChange={(event) => setClosingNote(event.target.value)}
              />
            </label>

            {errorMessage ? (
              <p className={styles.errorMessage}>{errorMessage}</p>
            ) : null}

            <button
              className={styles.footerButton}
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Cerrando..." : "Cerrar caja"}
            </button>
          </form>
        </div>
      )}
    </CashRegisterRetailDrawer>
  );
}
