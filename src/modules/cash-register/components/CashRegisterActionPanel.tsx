import { useEffect, useMemo, useState } from "react";
import { SurfaceCard } from "@/shared/components/ui/SurfaceCard";
import type {
  CashRegisterAssignee,
  CashRegisterEntryType,
  CashRegisterManualEntryInput,
  CashRegisterSession,
  CloseCashRegisterInput,
  OpenCashRegisterInput,
} from "@/modules/cash-register/types/cash-register";
import { formatCashRegisterCurrency } from "@/modules/cash-register/utils/format-cash-register";
import styles from "./CashRegisterActionPanel.module.css";

type CashRegisterActionPanelProps = {
  assignees: CashRegisterAssignee[];
  currentSession: CashRegisterSession | null;
  isSubmitting: boolean;
  onOpen: (input: OpenCashRegisterInput) => Promise<void>;
  onClose: (input: CloseCashRegisterInput) => Promise<void>;
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

export function CashRegisterActionPanel({
  assignees,
  currentSession,
  isSubmitting,
  onOpen,
  onClose,
  onManualEntry,
}: CashRegisterActionPanelProps) {
  const [assigneeId, setAssigneeId] = useState(
    getInitialAssigneeId(assignees, currentSession),
  );
  const [openingAmount, setOpeningAmount] = useState("0");
  const [openingNote, setOpeningNote] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [closingNote, setClosingNote] = useState("");
  const [entryType, setEntryType] = useState<CashRegisterEntryType>("INCOME");
  const [entryAmount, setEntryAmount] = useState("");
  const [entryReason, setEntryReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setAssigneeId(getInitialAssigneeId(assignees, currentSession));
  }, [assignees, currentSession]);

  useEffect(() => {
    if (!currentSession) {
      setClosingAmount("");
      setClosingNote("");
      setEntryAmount("");
      setEntryReason("");
      return;
    }

    setClosingAmount(currentSession.cashExpectedTotal.toFixed(2));
  }, [currentSession]);

  const selectedAssignee = useMemo(
    () => assignees.find((assignee) => assignee.id === assigneeId) ?? null,
    [assigneeId, assignees],
  );

  async function handleOpenSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    try {
      await onOpen({
        responsibleUserId: assigneeId || undefined,
        openingAmount: Number(openingAmount),
        openingNote: openingNote.trim() || undefined,
      });
      setOpeningAmount("0");
      setOpeningNote("");
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
      await onClose({
        closingAmount: Number(closingAmount),
        closingNote: closingNote.trim() || undefined,
      });
      setClosingNote("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No fue posible cerrar la caja en este momento.",
      );
    }
  }

  if (!currentSession) {
    return (
      <SurfaceCard className={styles.panel}>
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Apertura de caja</p>
            <h3 className={styles.title}>
              Inicia el turno con un responsable y un monto base.
            </h3>
          </div>
          {selectedAssignee ? (
            <span className={styles.statusPill}>{selectedAssignee.role}</span>
          ) : null}
        </div>

        <form className={styles.form} noValidate onSubmit={handleOpenSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="cash-register-assignee">
              Responsable del turno
            </label>
            <select
              className={styles.select}
              id="cash-register-assignee"
              value={assigneeId}
              onChange={(event) => setAssigneeId(event.target.value)}
            >
              {assignees.map((assignee) => (
                <option key={assignee.id} value={assignee.id}>
                  {assignee.name} · {assignee.role}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label
              className={styles.label}
              htmlFor="cash-register-opening-amount"
            >
              Monto inicial
            </label>
            <input
              className={styles.input}
              id="cash-register-opening-amount"
              inputMode="decimal"
              min="0"
              placeholder="0.00"
              step="0.01"
              type="number"
              value={openingAmount}
              onChange={(event) => setOpeningAmount(event.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label
              className={styles.label}
              htmlFor="cash-register-opening-note"
            >
              Nota de apertura
            </label>
            <textarea
              className={styles.textarea}
              id="cash-register-opening-note"
              placeholder="Ej. caja principal del turno de la mañana."
              rows={3}
              value={openingNote}
              onChange={(event) => setOpeningNote(event.target.value)}
            />
          </div>

          {errorMessage ? (
            <p className={styles.errorMessage}>{errorMessage}</p>
          ) : null}

          <button
            className={styles.primaryButton}
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Abriendo..." : "Abrir caja"}
          </button>
        </form>
      </SurfaceCard>
    );
  }

  return (
    <div className={styles.column}>
      <SurfaceCard className={styles.panel}>
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Movimiento rápido</p>
            <h3 className={styles.title}>
              Registra ingresos o egresos manuales sin salir del arqueo.
            </h3>
          </div>
          <span className={styles.statusPill}>
            {currentSession.responsibleUserName ?? "Caja activa"}
          </span>
        </div>

        <form
          className={styles.form}
          noValidate
          onSubmit={handleManualEntrySubmit}
        >
          <div className={styles.inlineFields}>
            <div className={styles.field}>
              <label
                className={styles.label}
                htmlFor="cash-register-entry-type"
              >
                Tipo
              </label>
              <select
                className={styles.select}
                id="cash-register-entry-type"
                value={entryType}
                onChange={(event) =>
                  setEntryType(event.target.value as CashRegisterEntryType)
                }
              >
                <option value="INCOME">Ingreso</option>
                <option value="EXPENSE">Egreso</option>
              </select>
            </div>

            <div className={styles.field}>
              <label
                className={styles.label}
                htmlFor="cash-register-entry-amount"
              >
                Monto
              </label>
              <input
                className={styles.input}
                id="cash-register-entry-amount"
                inputMode="decimal"
                min="0"
                placeholder="0.00"
                step="0.01"
                type="number"
                value={entryAmount}
                onChange={(event) => setEntryAmount(event.target.value)}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label
              className={styles.label}
              htmlFor="cash-register-entry-reason"
            >
              Concepto
            </label>
            <input
              className={styles.input}
              id="cash-register-entry-reason"
              placeholder="Ej. flete, reposición de caja menor, anticipo..."
              type="text"
              value={entryReason}
              onChange={(event) => setEntryReason(event.target.value)}
            />
          </div>

          <button
            className={styles.secondaryButton}
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Guardando..." : "Crear movimiento"}
          </button>
        </form>
      </SurfaceCard>

      <SurfaceCard className={styles.panel}>
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Cierre de caja</p>
            <h3 className={styles.title}>
              Compara el conteo real contra el efectivo esperado.
            </h3>
          </div>
          <span className={styles.metricChip}>
            Esperado{" "}
            {formatCashRegisterCurrency(currentSession.cashExpectedTotal)}
          </span>
        </div>

        <form className={styles.form} noValidate onSubmit={handleCloseSubmit}>
          <div className={styles.field}>
            <label
              className={styles.label}
              htmlFor="cash-register-closing-amount"
            >
              Efectivo contado
            </label>
            <input
              className={styles.input}
              id="cash-register-closing-amount"
              inputMode="decimal"
              min="0"
              placeholder="0.00"
              step="0.01"
              type="number"
              value={closingAmount}
              onChange={(event) => setClosingAmount(event.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label
              className={styles.label}
              htmlFor="cash-register-closing-note"
            >
              Nota de cierre
            </label>
            <textarea
              className={styles.textarea}
              id="cash-register-closing-note"
              placeholder="Observaciones del conteo final."
              rows={3}
              value={closingNote}
              onChange={(event) => setClosingNote(event.target.value)}
            />
          </div>

          {errorMessage ? (
            <p className={styles.errorMessage}>{errorMessage}</p>
          ) : null}

          <button
            className={styles.primaryButton}
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Cerrando..." : "Cerrar caja"}
          </button>
        </form>
      </SurfaceCard>
    </div>
  );
}
