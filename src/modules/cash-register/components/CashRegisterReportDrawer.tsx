import { useEffect, useState } from "react";
import type {
  CashRegisterEntryType,
  CashRegisterReportDownloadInput,
  CashRegisterReportView,
} from "@/modules/cash-register/types/cash-register";
import { CashRegisterRetailDrawer } from "./CashRegisterRetailDrawer";
import styles from "./CashRegisterReportDrawer.module.css";

type CashRegisterReportDrawerProps = {
  isOpen: boolean;
  initialView: CashRegisterReportView;
  selectedDate: string;
  searchValue: string;
  selectedType: "ALL" | CashRegisterEntryType;
  isSubmitting: boolean;
  onClose: () => void;
  onDownload: (input: CashRegisterReportDownloadInput) => Promise<void>;
};

export function CashRegisterReportDrawer({
  isOpen,
  initialView,
  selectedDate,
  searchValue,
  selectedType,
  isSubmitting,
  onClose,
  onDownload,
}: CashRegisterReportDrawerProps) {
  const [view, setView] = useState<CashRegisterReportView>(initialView);
  const [reportDate, setReportDate] = useState(selectedDate);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setView(initialView);
    setReportDate(selectedDate);
    setErrorMessage(null);
  }, [initialView, isOpen, selectedDate]);

  async function handleDownload() {
    try {
      setErrorMessage(null);
      await onDownload({
        view,
        from: reportDate || undefined,
        to: reportDate || undefined,
        search: view === "transactions" ? searchValue : undefined,
        type: view === "transactions" ? selectedType : undefined,
      });
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No fue posible descargar el reporte en este momento.",
      );
    }
  }

  return (
    <CashRegisterRetailDrawer
      isOpen={isOpen}
      title="Descargar reporte"
      description="Exporta los movimientos visibles o el histórico de cierres en formato CSV."
      onClose={onClose}
      footer={
        <button
          className={styles.footerButton}
          disabled={isSubmitting}
          type="button"
          onClick={() => void handleDownload()}
        >
          {isSubmitting ? "Descargando..." : "Descargar reporte"}
        </button>
      }
    >
      <div className={styles.form}>
        <label className={styles.field}>
          <span className={styles.label}>Vista del reporte</span>
          <select
            className={styles.select}
            value={view}
            onChange={(event) =>
              setView(event.target.value as CashRegisterReportView)
            }
          >
            <option value="transactions">Transacciones</option>
            <option value="closures">Cierres de caja</option>
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Fecha del reporte</span>
          <input
            className={styles.input}
            type="date"
            value={reportDate}
            onChange={(event) => setReportDate(event.target.value)}
          />
        </label>

        {view === "transactions" ? (
          <div className={styles.summaryBox}>
            <span className={styles.summaryLabel}>Filtros incluidos</span>
            <span>Tipo: {selectedType === "ALL" ? "Todos" : selectedType}</span>
            <span>Texto: {searchValue.trim() || "Sin búsqueda"}</span>
          </div>
        ) : (
          <div className={styles.summaryBox}>
            <span className={styles.summaryLabel}>Contenido incluido</span>
            <span>
              Historial de cierres con responsable, esperado, contado y
              diferencia.
            </span>
          </div>
        )}

        {errorMessage ? (
          <p className={styles.errorMessage}>{errorMessage}</p>
        ) : null}
      </div>
    </CashRegisterRetailDrawer>
  );
}
