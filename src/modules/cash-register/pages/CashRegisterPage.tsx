import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CashRegisterActionPanel } from "@/modules/cash-register/components/CashRegisterActionPanel";
import { CashRegisterHistoryList } from "@/modules/cash-register/components/CashRegisterHistoryList";
import { CashRegisterReportDrawer } from "@/modules/cash-register/components/CashRegisterReportDrawer";
import { CashRegisterRetailTransactionsTable } from "@/modules/cash-register/components/CashRegisterRetailTransactionsTable";
import { CashRegisterSessionDrawer } from "@/modules/cash-register/components/CashRegisterSessionDrawer";
import { CashRegisterSummaryPanel } from "@/modules/cash-register/components/CashRegisterSummaryPanel";
import { CashRegisterTransactionsList } from "@/modules/cash-register/components/CashRegisterTransactionsList";
import {
  useCashRegisterAssigneesQuery,
  useDownloadCashRegisterReportMutation,
  useDownloadMovementsReportMutation,
  useCashRegisterHistoryQuery,
  useCloseCashRegisterMutation,
  useCreateCashRegisterManualEntryMutation,
  useCurrentCashRegisterQuery,
  useMovementsOverviewQuery,
  useOpenCashRegisterMutation,
} from "@/modules/cash-register/hooks/use-cash-register-query";
import type {
  CashRegisterEntry,
  CashRegisterEntryType,
  CashRegisterReportDownloadInput,
  CloseCashRegisterInput,
  OpenCashRegisterInput,
} from "@/modules/cash-register/types/cash-register";
import {
  formatCashRegisterCurrency,
  formatCashRegisterDate,
} from "@/modules/cash-register/utils/format-cash-register";
import { MetricCard } from "@/shared/components/ui/MetricCard";
import { SurfaceCard } from "@/shared/components/ui/SurfaceCard";
import { RetailEmptyState } from "@/shared/components/retail/RetailEmptyState";
import retailStyles from "@/shared/components/retail/RetailUI.module.css";
import { useBusinessNavigationPreset } from "@/shared/hooks/use-business-navigation-preset";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import { joinClassNames } from "@/shared/utils/join-class-names";
import styles from "./CashRegisterPage.module.css";
import retailPageStyles from "./CashRegisterRetailPage.module.css";

type CashRegisterTab = "transactions" | "closures";

function toDateInputValue(value: string | Date) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isSameCalendarDate(value: string | Date, expectedDate: string) {
  if (!expectedDate) {
    return true;
  }

  return toDateInputValue(value) === expectedDate;
}

function matchesEntry(entry: CashRegisterEntry, query: string) {
  if (query.length === 0) {
    return true;
  }

  const normalizedQuery = query.toLowerCase();

  return (
    entry.reason.toLowerCase().includes(normalizedQuery) ||
    entry.type.toLowerCase().includes(normalizedQuery)
  );
}

export function CashRegisterPage() {
  const navigationPreset = useBusinessNavigationPreset();
  const isRetailPreset = navigationPreset === "retail";
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<CashRegisterTab>("transactions");
  const [searchValue, setSearchValue] = useState("");
  const [selectedDate, setSelectedDate] = useState(() =>
    toDateInputValue(new Date()),
  );
  const [selectedType, setSelectedType] = useState<
    "ALL" | CashRegisterEntryType
  >("ALL");
  const [isSessionDrawerOpen, setSessionDrawerOpen] = useState(false);
  const [isReportDrawerOpen, setReportDrawerOpen] = useState(false);
  const deferredSearchValue = useDeferredValue(
    searchValue.trim().toLowerCase(),
  );
  const currentSessionQuery = useCurrentCashRegisterQuery();
  const historyQuery = useCashRegisterHistoryQuery();
  const assigneesQuery = useCashRegisterAssigneesQuery();
  const movementsOverviewQuery = useMovementsOverviewQuery({
    from: selectedDate || undefined,
    to: selectedDate || undefined,
    search: deferredSearchValue || undefined,
    type: selectedType,
  });
  const openMutation = useOpenCashRegisterMutation();
  const closeMutation = useCloseCashRegisterMutation();
  const manualEntryMutation = useCreateCashRegisterManualEntryMutation();
  const downloadReportMutation = useDownloadCashRegisterReportMutation();
  const downloadMovementsReportMutation = useDownloadMovementsReportMutation();
  const currentSession = currentSessionQuery.data ?? null;
  const history = historyQuery.data ?? [];
  const movementsOverview = movementsOverviewQuery.data ?? null;
  const closedSessions = history.filter(
    (session) => session.status === "CLOSED",
  );
  const latestClosedSession = closedSessions[0] ?? null;
  const visibleEntries = useMemo(() => {
    if (!currentSession) {
      return [];
    }

    return currentSession.entries.filter((entry) => {
      if (selectedType !== "ALL" && entry.type !== selectedType) {
        return false;
      }

      return matchesEntry(entry, deferredSearchValue);
    });
  }, [currentSession, deferredSearchValue, selectedType]);
  const visibleTransactions = movementsOverview?.transactions ?? [];
  const visibleClosures = useMemo(
    () =>
      closedSessions.filter((session) =>
        isSameCalendarDate(session.closedAt ?? session.openedAt, selectedDate),
      ),
    [closedSessions, selectedDate],
  );
  const isSubmitting =
    openMutation.isPending ||
    closeMutation.isPending ||
    manualEntryMutation.isPending;
  const isLoading =
    currentSessionQuery.isLoading ||
    historyQuery.isLoading ||
    assigneesQuery.isLoading ||
    movementsOverviewQuery.isLoading;
  const isRefreshing =
    currentSessionQuery.isFetching ||
    historyQuery.isFetching ||
    assigneesQuery.isFetching ||
    movementsOverviewQuery.isFetching;
  const hasError =
    currentSessionQuery.isError ||
    historyQuery.isError ||
    assigneesQuery.isError ||
    movementsOverviewQuery.isError;
  const error =
    currentSessionQuery.error ??
    historyQuery.error ??
    assigneesQuery.error ??
    movementsOverviewQuery.error;

  useEffect(() => {
    if (searchParams.get("session") !== "open") {
      return;
    }

    setSessionDrawerOpen(true);

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("session");
    setSearchParams(nextSearchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  async function handleRefresh() {
    await Promise.allSettled([
      currentSessionQuery.refetch(),
      historyQuery.refetch(),
      assigneesQuery.refetch(),
      movementsOverviewQuery.refetch(),
    ]);
  }

  async function handleOpen(input: OpenCashRegisterInput) {
    await openMutation.mutateAsync(input);
    setActiveTab("transactions");
  }

  async function handleClose(input: CloseCashRegisterInput) {
    await closeMutation.mutateAsync(input);
    setActiveTab("closures");
  }

  async function handleDownloadReport(input: CashRegisterReportDownloadInput) {
    const report =
      input.view === "transactions"
        ? await downloadMovementsReportMutation.mutateAsync({
            from: input.from,
            to: input.to,
            search: input.search,
            type: input.type,
          })
        : await downloadReportMutation.mutateAsync(input);

    const downloadUrl = URL.createObjectURL(report.blob);
    const linkElement = document.createElement("a");

    linkElement.href = downloadUrl;
    linkElement.download =
      report.filename ??
      (input.view === "transactions"
        ? "movements-transactions.csv"
        : `cash-register-${input.view}.csv`);
    linkElement.click();
    URL.revokeObjectURL(downloadUrl);
  }

  if (isRetailPreset) {
    return (
      <div className={retailPageStyles.page}>
        <div className={retailPageStyles.headerRow}>
          <button
            className={retailStyles.buttonDark}
            type="button"
            onClick={() => setSessionDrawerOpen(true)}
          >
            {currentSession ? "Caja activa" : "Abrir caja"}
          </button>
          <button
            className={retailStyles.buttonOutline}
            type="button"
            onClick={() => setReportDrawerOpen(true)}
          >
            Descargar reporte
          </button>
        </div>

        <div className={retailPageStyles.tabs}>
          <button
            className={
              activeTab === "transactions"
                ? retailPageStyles.tabActive
                : retailPageStyles.tab
            }
            type="button"
            onClick={() => setActiveTab("transactions")}
          >
            Transacciones
          </button>
          <button
            className={
              activeTab === "closures"
                ? retailPageStyles.tabActive
                : retailPageStyles.tab
            }
            type="button"
            onClick={() => setActiveTab("closures")}
          >
            Cierres de caja
          </button>
        </div>

        <div className={retailPageStyles.filtersRow}>
          <label className={retailStyles.selectField}>
            <select
              className={retailStyles.select}
              value={selectedType}
              onChange={(event) =>
                setSelectedType(
                  event.target.value as "ALL" | CashRegisterEntryType,
                )
              }
            >
              <option value="ALL">Diario</option>
              <option value="INCOME">Ingresos</option>
              <option value="EXPENSE">Egresos</option>
            </select>
          </label>
          <label className={retailStyles.dateField}>
            <input
              className={retailStyles.input}
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </label>
          <label className={retailStyles.searchField}>
            <input
              className={retailStyles.input}
              placeholder="Buscar concepto..."
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
          </label>
        </div>

        {activeTab === "transactions" ? (
          <>
            <div className={retailPageStyles.metricsGrid}>
              <MetricCard
                hint="Resultado acumulado de ingresos, egresos y ajustes visibles en los movimientos filtrados."
                label="Balance"
                tone={movementsOverview?.balance ? "success" : "default"}
                value={formatCashRegisterCurrency(
                  movementsOverview?.balance ?? 0,
                )}
              />
              <MetricCard
                hint="Ventas registradas en el rango y filtros seleccionados."
                label="Ventas totales"
                tone="accent"
                value={formatCashRegisterCurrency(
                  movementsOverview?.salesTotal ?? 0,
                )}
              />
              <MetricCard
                hint="Gastos y egresos visibles dentro de la consulta actual."
                label="Gastos totales"
                tone="alert"
                value={formatCashRegisterCurrency(
                  movementsOverview?.expensesTotal ?? 0,
                )}
              />
            </div>

            <SurfaceCard className={retailPageStyles.tablePanel}>
              <div className={retailPageStyles.tableHeader}>
                <strong className={retailPageStyles.tableTitle}>
                  Transacciones
                </strong>
                <span className={retailPageStyles.tableMeta}>
                  {selectedDate ? formatCashRegisterDate(selectedDate) : "Hoy"}
                </span>
              </div>

              {movementsOverviewQuery.isLoading ? (
                <div className={retailPageStyles.emptyPanel}>
                  <RetailEmptyState
                    title="Preparando movimientos..."
                    description="Estamos consolidando ventas, gastos, inventario y caja para mostrar el historial real del negocio."
                  />
                </div>
              ) : movementsOverviewQuery.isError ? (
                <div className={retailPageStyles.emptyPanel}>
                  <RetailEmptyState
                    title="No pudimos cargar los movimientos."
                    description={getErrorMessage(
                      movementsOverviewQuery.error,
                      "Intenta actualizar la pantalla o revisar que el backend siga respondiendo.",
                    )}
                  />
                </div>
              ) : (
                <CashRegisterRetailTransactionsTable
                  transactions={visibleTransactions}
                />
              )}
            </SurfaceCard>
          </>
        ) : (
          <CashRegisterHistoryList sessions={visibleClosures} />
        )}

        <CashRegisterSessionDrawer
          assignees={assigneesQuery.data ?? []}
          currentSession={currentSession}
          isOpen={isSessionDrawerOpen}
          isSubmitting={isSubmitting}
          onClose={() => setSessionDrawerOpen(false)}
          onCloseSession={handleClose}
          onManualEntry={async (input) => {
            await manualEntryMutation.mutateAsync(input);
          }}
          onOpenSession={handleOpen}
        />

        <CashRegisterReportDrawer
          initialView={activeTab}
          isOpen={isReportDrawerOpen}
          isSubmitting={
            downloadReportMutation.isPending ||
            downloadMovementsReportMutation.isPending
          }
          searchValue={searchValue}
          selectedDate={selectedDate}
          selectedType={selectedType}
          onClose={() => setReportDrawerOpen(false)}
          onDownload={async (input) => {
            await handleDownloadReport(input);
          }}
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Movimientos</p>
          <h2 className={styles.title}>
            Controla la caja del día con apertura, arqueo y trazabilidad en una
            sola vista.
          </h2>
          <p className={styles.description}>
            Esta pantalla aterriza la lógica del video en un flujo operativo:
            abrir caja, registrar movimientos rápidos, leer el efectivo esperado
            y cerrar con diferencia clara antes de terminar el turno.
          </p>
        </div>

        <div className={styles.heroActions}>
          <button
            className={styles.heroButton}
            type="button"
            onClick={() => void handleRefresh()}
          >
            {isRefreshing ? "Actualizando..." : "Actualizar"}
          </button>
          <button
            className={styles.heroGhostButton}
            type="button"
            onClick={() =>
              setActiveTab((currentTab) =>
                currentTab === "transactions" ? "closures" : "transactions",
              )
            }
          >
            {activeTab === "transactions" ? "Ver cierres" : "Volver al turno"}
          </button>
        </div>
      </section>

      <div className={styles.metricsGrid}>
        <MetricCard
          hint={
            currentSession
              ? "Efectivo esperado con base, cobros en efectivo e ingresos manuales."
              : "Abre una caja para empezar a ver el efectivo esperado del turno."
          }
          label="Balance"
          tone={currentSession ? "success" : "default"}
          value={formatCashRegisterCurrency(currentSession?.balance ?? 0)}
        />
        <MetricCard
          hint="Ventas registradas dentro de la caja activa o del último cierre visible."
          label="Ventas totales"
          tone="accent"
          value={formatCashRegisterCurrency(
            currentSession?.salesTotal ?? latestClosedSession?.salesTotal ?? 0,
          )}
        />
        <MetricCard
          hint="Gastos manuales que afectan el conteo operativo del turno."
          label="Gastos totales"
          tone="alert"
          value={formatCashRegisterCurrency(
            currentSession?.expensesTotal ??
              latestClosedSession?.expensesTotal ??
              0,
          )}
        />
        <MetricCard
          hint="Cobros de cartera realizados en la caja activa."
          label="Cobros"
          value={formatCashRegisterCurrency(
            currentSession?.receivableCollectionsTotal ??
              latestClosedSession?.receivableCollectionsTotal ??
              0,
          )}
        />
      </div>

      <div className={styles.tabs}>
        <button
          className={joinClassNames(
            styles.tabButton,
            activeTab === "transactions" && styles.tabButtonActive,
          )}
          type="button"
          onClick={() => setActiveTab("transactions")}
        >
          Transacciones
        </button>
        <button
          className={joinClassNames(
            styles.tabButton,
            activeTab === "closures" && styles.tabButtonActive,
          )}
          type="button"
          onClick={() => setActiveTab("closures")}
        >
          Cierres de caja
        </button>
      </div>

      {hasError ? (
        <SurfaceCard className={styles.feedbackCard}>
          <p className={styles.feedbackTitle}>
            No pudimos cargar la caja diaria.
          </p>
          <p className={styles.feedbackDescription}>
            {getErrorMessage(
              error,
              "Intenta refrescar la pantalla o revisar que el backend siga respondiendo.",
            )}
          </p>
          <button
            className={styles.feedbackButton}
            type="button"
            onClick={() => void handleRefresh()}
          >
            Reintentar
          </button>
        </SurfaceCard>
      ) : null}

      {activeTab === "transactions" ? (
        <div className={styles.workspace}>
          <div className={styles.primaryColumn}>
            {currentSession ? (
              <CashRegisterTransactionsList
                entries={visibleEntries}
                searchValue={searchValue}
                selectedType={selectedType}
                onSearchChange={setSearchValue}
                onTypeChange={setSelectedType}
              />
            ) : (
              <SurfaceCard className={styles.emptyWorkspaceCard}>
                <p className={styles.emptyWorkspaceEyebrow}>
                  Caja lista para abrir
                </p>
                <h3 className={styles.emptyWorkspaceTitle}>
                  No hay una caja activa en este momento.
                </h3>
                <p className={styles.emptyWorkspaceDescription}>
                  Usa el panel lateral para asignar responsable, monto inicial y
                  arrancar el turno. Apenas abras la caja, aquí aparecerán las
                  transacciones del día y los filtros rápidos.
                </p>
              </SurfaceCard>
            )}
          </div>

          <div className={styles.secondaryColumn}>
            {currentSession ? (
              <CashRegisterSummaryPanel session={currentSession} />
            ) : null}

            <CashRegisterActionPanel
              assignees={assigneesQuery.data ?? []}
              currentSession={currentSession ?? null}
              isSubmitting={isSubmitting}
              onClose={handleClose}
              onManualEntry={async (input) => {
                await manualEntryMutation.mutateAsync(input);
              }}
              onOpen={handleOpen}
            />
          </div>
        </div>
      ) : (
        <CashRegisterHistoryList sessions={closedSessions} />
      )}

      {isLoading ? (
        <SurfaceCard className={styles.loadingCard}>
          <p className={styles.loadingText}>Preparando el arqueo diario...</p>
        </SurfaceCard>
      ) : null}
    </div>
  );
}
