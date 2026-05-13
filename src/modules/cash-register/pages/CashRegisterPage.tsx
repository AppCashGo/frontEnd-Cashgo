import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Banknote,
  Calendar,
  Crown,
  Search,
  SlidersHorizontal,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { CashRegisterHistoryList } from "@/modules/cash-register/components/CashRegisterHistoryList";
import { CashRegisterRetailDrawer } from "@/modules/cash-register/components/CashRegisterRetailDrawer";
import { CashRegisterRetailTransactionsTable } from "@/modules/cash-register/components/CashRegisterRetailTransactionsTable";
import { CashRegisterSessionDrawer } from "@/modules/cash-register/components/CashRegisterSessionDrawer";
import {
  useCashRegisterAssigneesQuery,
  useCashRegisterHistoryQuery,
  useCloseCashRegisterMutation,
  useCreateCashRegisterManualEntryMutation,
  useCurrentCashRegisterQuery,
  useDownloadCashRegisterReportMutation,
  useDownloadMovementsReportMutation,
  useMovementsOverviewQuery,
  useOpenCashRegisterMutation,
} from "@/modules/cash-register/hooks/use-cash-register-query";
import type {
  CashRegisterEntryType,
  CashRegisterPaymentMethod,
  CashRegisterReportDownloadInput,
  CloseCashRegisterInput,
  MovementLedgerItem,
  OpenCashRegisterInput,
} from "@/modules/cash-register/types/cash-register";
import {
  formatCashRegisterCurrency,
  formatCashRegisterDate,
} from "@/modules/cash-register/utils/format-cash-register";
import { useCustomersQuery } from "@/modules/customers/hooks/use-customers-query";
import { useEmployeesQuery } from "@/modules/employees/hooks/use-employees-query";
import { useSuppliersQuery } from "@/modules/suppliers/hooks/use-suppliers-query";
import { AppIcon } from "@/shared/components/icons/AppIcon";
import { RetailEmptyState } from "@/shared/components/retail/RetailEmptyState";
import { RetailPageLayout } from "@/shared/components/retail/RetailPageLayout";
import { toDateInputValue } from "@/shared/utils/date-input";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import { joinClassNames } from "@/shared/utils/join-class-names";
import styles from "./CashRegisterRetailPage.module.css";

type CashRegisterTab = "transactions" | "closures";
type LedgerTab = "income" | "expenses" | "receivables" | "payables";
type PeriodOption = "daily" | "weekly" | "monthly";
type SelectionDrawerType = "employees" | "customers" | "suppliers";
type ReportStep = "menu" | "balance" | "debts";

type FilterOption = {
  id: string;
  label: string;
};

type SelectorItem = {
  id: string;
  title: string;
  description?: string;
};

const paymentFilterOptions: Array<
  FilterOption & { methods: CashRegisterPaymentMethod[] }
> = [
  { id: "CASH", label: "Efectivo", methods: ["CASH"] },
  { id: "CARD", label: "Tarjeta", methods: ["CARD"] },
  { id: "TRANSFER", label: "Transferencia bancaria", methods: ["TRANSFER"] },
  { id: "OTHER", label: "Otro", methods: ["OTHER"] },
  { id: "NEQUI", label: "Nequi", methods: ["DIGITAL_WALLET"] },
  { id: "DAVIPLATA", label: "Daviplata", methods: ["DIGITAL_WALLET"] },
  { id: "DATAPHONE", label: "Datáfono Treinta", methods: ["CARD"] },
];

const saleOriginOptions: FilterOption[] = [
  { id: "TABLE", label: "Mesa" },
  { id: "COUNTER", label: "Mostrador" },
  { id: "OWN_DELIVERY", label: "Domicilio propio" },
  { id: "RAPPI", label: "Domicilio Rappi" },
  { id: "DIDI", label: "Domicilio Didi" },
];

const ledgerTabs: Array<{ id: LedgerTab; label: string }> = [
  { id: "income", label: "Ingresos" },
  { id: "expenses", label: "Egresos" },
  { id: "receivables", label: "Por cobrar" },
  { id: "payables", label: "Por pagar" },
];

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);

  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function toIsoDate(date: Date) {
  return toDateInputValue(date);
}

function getPeriodRange(selectedDate: string, period: PeriodOption) {
  const anchorDate = selectedDate ? new Date(`${selectedDate}T00:00:00`) : new Date();

  if (period === "weekly") {
    const dayIndex = anchorDate.getDay() === 0 ? 6 : anchorDate.getDay() - 1;
    const from = addDays(anchorDate, -dayIndex);
    const to = addDays(from, 6);

    return {
      from: toIsoDate(from),
      to: toIsoDate(to),
    };
  }

  if (period === "monthly") {
    const from = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
    const to = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);

    return {
      from: toIsoDate(from),
      to: toIsoDate(to),
    };
  }

  return {
    from: toIsoDate(anchorDate),
    to: toIsoDate(anchorDate),
  };
}

function formatPeriodLabel(from: string, to: string, period: PeriodOption) {
  if (period === "monthly") {
    return new Intl.DateTimeFormat("es-CO", {
      month: "short",
      year: "numeric",
    }).format(new Date(`${from}T00:00:00`));
  }

  if (from === to) {
    return formatCashRegisterDate(from);
  }

  const formatter = new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
  });

  return `${formatter.format(new Date(`${from}T00:00:00`))} | ${formatter.format(
    new Date(`${to}T00:00:00`),
  )}`;
}

function getServerType(activeLedgerTab: LedgerTab): "ALL" | CashRegisterEntryType {
  if (activeLedgerTab === "expenses") {
    return "EXPENSE";
  }

  if (activeLedgerTab === "income") {
    return "INCOME";
  }

  return "ALL";
}

function matchesLedgerTab(transaction: MovementLedgerItem, activeLedgerTab: LedgerTab) {
  if (activeLedgerTab === "income") {
    return transaction.direction === "IN";
  }

  if (activeLedgerTab === "expenses") {
    return transaction.direction === "OUT";
  }

  if (activeLedgerTab === "receivables") {
    return (
      transaction.source === "DEBT_PAYMENT" ||
      transaction.status === "PENDING_PAYMENT" ||
      transaction.status === "PARTIALLY_PAID"
    );
  }

  return transaction.direction === "OUT" && transaction.status === "PENDING";
}

function getTransactionText(transaction: MovementLedgerItem) {
  return [
    transaction.source,
    transaction.kind,
    transaction.concept,
    transaction.details,
    transaction.userName,
    transaction.productName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesSaleOrigin(transaction: MovementLedgerItem, originId: string) {
  const text = getTransactionText(transaction);

  switch (originId) {
    case "TABLE":
      return text.includes("mesa");
    case "COUNTER":
      return (
        text.includes("mostrador") ||
        (transaction.source === "SALE" &&
          !text.includes("mesa") &&
          !text.includes("domicilio") &&
          !text.includes("rappi") &&
          !text.includes("didi"))
      );
    case "OWN_DELIVERY":
      return text.includes("domicilio") || text.includes("delivery");
    case "RAPPI":
      return text.includes("rappi");
    case "DIDI":
      return text.includes("didi");
    default:
      return true;
  }
}

function matchesPaymentFilter(
  transaction: MovementLedgerItem,
  selectedPaymentFilters: string[],
) {
  if (selectedPaymentFilters.length === 0) {
    return true;
  }

  if (!transaction.paymentMethod) {
    return false;
  }

  return selectedPaymentFilters.some((filterId) => {
    const filter = paymentFilterOptions.find((option) => option.id === filterId);

    return filter?.methods.includes(transaction.paymentMethod as CashRegisterPaymentMethod);
  });
}

function toggleArrayValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((currentValue) => currentValue !== value)
    : [...values, value];
}

function formatSelectedCount(count: number, emptyLabel: string) {
  if (count === 0) {
    return emptyLabel;
  }

  if (count === 1) {
    return "1 seleccionado";
  }

  return `${count} seleccionados`;
}

function SummaryCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "balance" | "sales" | "expenses" | "neutral";
}) {
  const Icon =
    tone === "balance" ? TrendingUp : tone === "expenses" ? Wallet : Banknote;

  return (
    <article className={styles.summaryCard}>
      <span className={joinClassNames(styles.summaryIcon, styles[`summaryIcon_${tone}`])}>
        <Icon />
      </span>
      <div>
        <p className={styles.summaryLabel}>{label}</p>
        <strong className={styles.summaryValue}>{value}</strong>
      </div>
    </article>
  );
}

function FilterChips({
  options,
  selectedValues,
  onToggle,
}: {
  options: FilterOption[];
  selectedValues: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className={styles.chipGrid}>
      {options.map((option) => (
        <button
          className={joinClassNames(
            styles.filterChip,
            selectedValues.includes(option.id) && styles.filterChipActive,
          )}
          key={option.id}
          type="button"
          onClick={() => onToggle(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function MovementFiltersDrawer({
  isOpen,
  selectedPaymentFilters,
  selectedSaleOrigins,
  selectedEmployees,
  selectedCustomers,
  selectedSuppliers,
  onClose,
  onOpenSelector,
  onClear,
  onConfirm,
  onTogglePaymentFilter,
  onToggleSaleOrigin,
}: {
  isOpen: boolean;
  selectedPaymentFilters: string[];
  selectedSaleOrigins: string[];
  selectedEmployees: string[];
  selectedCustomers: string[];
  selectedSuppliers: string[];
  onClose: () => void;
  onOpenSelector: (type: SelectionDrawerType) => void;
  onClear: () => void;
  onConfirm: () => void;
  onTogglePaymentFilter: (value: string) => void;
  onToggleSaleOrigin: (value: string) => void;
}) {
  return (
    <CashRegisterRetailDrawer
      isOpen={isOpen}
      title="Filtros"
      onClose={onClose}
      footer={
        <div className={styles.drawerActions}>
          <button className={styles.linkButton} type="button" onClick={onClear}>
            Limpiar filtros
          </button>
          <button className={styles.drawerPrimaryButton} type="button" onClick={onConfirm}>
            Filtrar
          </button>
        </div>
      }
    >
      <div className={styles.drawerStack}>
        <section className={styles.drawerSection}>
          <h4 className={styles.drawerSectionTitle}>Métodos de pago</h4>
          <FilterChips
            options={paymentFilterOptions}
            selectedValues={selectedPaymentFilters}
            onToggle={onTogglePaymentFilter}
          />
        </section>

        <section className={styles.drawerSection}>
          <h4 className={styles.drawerSectionTitle}>Origen de la venta</h4>
          <FilterChips
            options={saleOriginOptions}
            selectedValues={selectedSaleOrigins}
            onToggle={onToggleSaleOrigin}
          />
        </section>

        <button
          className={styles.selectorRow}
          type="button"
          onClick={() => onOpenSelector("employees")}
        >
          <span className={styles.selectorIcon}>
            <AppIcon name="employees" />
          </span>
          <span>
            <strong>Empleados</strong>
            <small>{formatSelectedCount(selectedEmployees.length, "Todos los empleados")}</small>
          </span>
          <span className={styles.selectorChevron}>›</span>
        </button>

        <button
          className={styles.selectorRow}
          type="button"
          onClick={() => onOpenSelector("customers")}
        >
          <span className={styles.selectorIcon}>
            <AppIcon name="customers" />
          </span>
          <span>
            <strong>Clientes</strong>
            <small>{formatSelectedCount(selectedCustomers.length, "Todos los clientes")}</small>
          </span>
          <span className={styles.selectorChevron}>›</span>
        </button>

        <button
          className={styles.selectorRow}
          type="button"
          onClick={() => onOpenSelector("suppliers")}
        >
          <span className={styles.selectorIcon}>
            <AppIcon name="suppliers" />
          </span>
          <span>
            <strong>Proveedores</strong>
            <small>{formatSelectedCount(selectedSuppliers.length, "Todos los proveedores")}</small>
          </span>
          <span className={styles.selectorChevron}>›</span>
        </button>
      </div>
    </CashRegisterRetailDrawer>
  );
}

function SelectionDrawer({
  isOpen,
  title,
  searchPlaceholder,
  items,
  selectedIds,
  onBack,
  onConfirm,
  onToggle,
}: {
  isOpen: boolean;
  title: string;
  searchPlaceholder: string;
  items: SelectorItem[];
  selectedIds: string[];
  onBack: () => void;
  onConfirm: () => void;
  onToggle: (itemId: string) => void;
}) {
  const [searchValue, setSearchValue] = useState("");
  const filteredItems = useMemo(() => {
    const normalizedSearchValue = searchValue.trim().toLowerCase();

    if (!normalizedSearchValue) {
      return items;
    }

    return items.filter((item) =>
      [item.title, item.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearchValue),
    );
  }, [items, searchValue]);

  useEffect(() => {
    if (isOpen) {
      setSearchValue("");
    }
  }, [isOpen]);

  return (
    <CashRegisterRetailDrawer
      isOpen={isOpen}
      title={title}
      onClose={onBack}
      footer={
        <button className={styles.drawerPrimaryButton} type="button" onClick={onConfirm}>
          Confirmar
        </button>
      }
    >
      <div className={styles.drawerStack}>
        <button className={styles.backButton} type="button" onClick={onBack}>
          ← Volver a filtros
        </button>

        <label className={styles.drawerSearch}>
          <span>Buscar</span>
          <input
            placeholder={searchPlaceholder}
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
          />
        </label>

        <div className={styles.selectionList}>
          {filteredItems.map((item) => (
            <label className={styles.selectionItem} key={item.id}>
              <input
                checked={selectedIds.includes(item.id)}
                type="checkbox"
                onChange={() => onToggle(item.id)}
              />
              <span>
                <strong>{item.title}</strong>
                {item.description ? <small>{item.description}</small> : null}
              </span>
            </label>
          ))}
        </div>
      </div>
    </CashRegisterRetailDrawer>
  );
}

function ReportsDrawer({
  isOpen,
  reportStep,
  isSubmitting,
  onClose,
  onDownloadBalance,
  onDownloadDebts,
  onPrintReport,
  onSelectStep,
}: {
  isOpen: boolean;
  reportStep: ReportStep;
  isSubmitting: boolean;
  onClose: () => void;
  onDownloadBalance: () => Promise<void>;
  onDownloadDebts: () => Promise<void>;
  onPrintReport: () => void;
  onSelectStep: (step: ReportStep) => void;
}) {
  return (
    <CashRegisterRetailDrawer
      isOpen={isOpen}
      title={reportStep === "menu" ? "Descargar reporte" : reportStep === "balance" ? "Reporte de balance" : "Reporte de deudas"}
      description={
        reportStep === "menu"
          ? "Elige el tipo de reporte que quieres descargar."
          : undefined
      }
      onClose={onClose}
    >
      {reportStep === "menu" ? (
        <div className={styles.reportOptions}>
          <button className={styles.reportOption} type="button" onClick={() => onSelectStep("balance")}>
            <span className={styles.reportIcon}>▤</span>
            <span>
              <strong>Reporte de balance</strong>
              <small>Ingresos y egresos</small>
            </span>
            <span>›</span>
          </button>
          <button className={styles.reportOption} type="button" onClick={() => onSelectStep("debts")}>
            <span className={styles.reportIcon}>%</span>
            <span>
              <strong>Reporte de deudas</strong>
              <small>Por cobrar y por pagar</small>
            </span>
            <span>›</span>
          </button>
          <button className={styles.reportOptionMuted} disabled type="button">
            <span className={styles.reportIcon}>▦</span>
            <span>
              <strong>Reporte de datáfono Treinta</strong>
              <small>Disponible cuando integres datáfono</small>
            </span>
            <span>›</span>
          </button>
        </div>
      ) : (
        <div className={styles.reportOptions}>
          <button className={styles.backButton} type="button" onClick={() => onSelectStep("menu")}>
            ← Volver
          </button>
          <div className={styles.infoBox}>
            Los filtros que tengas aplicados afectarán tu reporte.
          </div>
          <button
            className={styles.reportOption}
            disabled={isSubmitting}
            type="button"
            onClick={() =>
              void (reportStep === "balance" ? onDownloadBalance() : onDownloadDebts())
            }
          >
            <span className={styles.pdfIcon}>XLS</span>
            <span>
              <strong>
                {reportStep === "balance"
                  ? "Descargar balance en Excel"
                  : "Descargar deudas en Excel"}
              </strong>
              <small>{isSubmitting ? "Preparando archivo..." : "Archivo CSV compatible con Excel"}</small>
            </span>
            <span>›</span>
          </button>
          <button className={styles.reportOption} type="button" onClick={onPrintReport}>
            <span className={styles.pdfIcon}>PDF</span>
            <span>
              <strong>
                {reportStep === "balance"
                  ? "Imprimir balance en PDF"
                  : "Imprimir deudas en PDF"}
              </strong>
              <small>Usa la opción Guardar como PDF del navegador</small>
            </span>
            <span>›</span>
          </button>
        </div>
      )}
    </CashRegisterRetailDrawer>
  );
}

export function CashRegisterPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<CashRegisterTab>("transactions");
  const [activeLedgerTab, setActiveLedgerTab] = useState<LedgerTab>("income");
  const [periodOption, setPeriodOption] = useState<PeriodOption>("daily");
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));
  const [searchValue, setSearchValue] = useState("");
  const [isSessionDrawerOpen, setSessionDrawerOpen] = useState(false);
  const [isFilterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [selectionDrawerType, setSelectionDrawerType] =
    useState<SelectionDrawerType | null>(null);
  const [isReportDrawerOpen, setReportDrawerOpen] = useState(false);
  const [reportStep, setReportStep] = useState<ReportStep>("menu");
  const [selectedPaymentFilters, setSelectedPaymentFilters] = useState<string[]>([]);
  const [selectedSaleOrigins, setSelectedSaleOrigins] = useState<string[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const deferredSearchValue = useDeferredValue(searchValue.trim().toLowerCase());
  const dateRange = useMemo(
    () => getPeriodRange(selectedDate, periodOption),
    [periodOption, selectedDate],
  );
  const selectedType = getServerType(activeLedgerTab);
  const currentSessionQuery = useCurrentCashRegisterQuery();
  const historyQuery = useCashRegisterHistoryQuery();
  const assigneesQuery = useCashRegisterAssigneesQuery();
  const employeesQuery = useEmployeesQuery();
  const customersQuery = useCustomersQuery();
  const suppliersQuery = useSuppliersQuery();
  const movementsOverviewQuery = useMovementsOverviewQuery({
    from: dateRange.from,
    to: dateRange.to,
    search: deferredSearchValue || undefined,
    type: selectedType,
  });
  const openMutation = useOpenCashRegisterMutation();
  const closeMutation = useCloseCashRegisterMutation();
  const manualEntryMutation = useCreateCashRegisterManualEntryMutation();
  const downloadReportMutation = useDownloadCashRegisterReportMutation();
  const downloadMovementsReportMutation = useDownloadMovementsReportMutation();
  const currentSession = currentSessionQuery.data ?? null;
  const history = historyQuery.data;
  const movementsOverview = movementsOverviewQuery.data ?? null;
  const closedSessions = useMemo(
    () =>
      (history ?? []).filter((session) => {
        if (session.status !== "CLOSED") {
          return false;
        }

        const referenceDate = session.closedAt ?? session.openedAt;
        const sessionDate = toDateInputValue(new Date(referenceDate));

        return sessionDate >= dateRange.from && sessionDate <= dateRange.to;
      }),
    [dateRange.from, dateRange.to, history],
  );
  const activeFiltersCount =
    selectedPaymentFilters.length +
    selectedSaleOrigins.length +
    selectedEmployees.length +
    selectedCustomers.length +
    selectedSuppliers.length;
  const employeeItems = useMemo<SelectorItem[]>(() => {
    const employeesById = new Map<string, SelectorItem>();

    for (const assignee of assigneesQuery.data ?? []) {
      employeesById.set(assignee.id, {
        id: assignee.id,
        title: assignee.name,
        description: assignee.role,
      });
    }

    for (const employee of employeesQuery.data ?? []) {
      employeesById.set(employee.id, {
        id: employee.id,
        title: employee.name,
        description: employee.role,
      });
    }

    return [...employeesById.values()];
  }, [assigneesQuery.data, employeesQuery.data]);
  const customerItems = useMemo<SelectorItem[]>(
    () =>
      (customersQuery.data ?? []).map((customer) => ({
        id: customer.id,
        title: customer.name,
        description: customer.phone ?? customer.email ?? "Cliente",
      })),
    [customersQuery.data],
  );
  const supplierItems = useMemo<SelectorItem[]>(
    () =>
      (suppliersQuery.data ?? []).map((supplier) => ({
        id: supplier.id,
        title: supplier.name,
        description: supplier.phone ?? supplier.email ?? "Proveedor",
      })),
    [suppliersQuery.data],
  );
  const selectedEmployeeNames = useMemo(
    () =>
      new Set(
        employeeItems
          .filter((employee) => selectedEmployees.includes(employee.id))
          .map((employee) => employee.title.toLowerCase()),
      ),
    [employeeItems, selectedEmployees],
  );
  const selectedCustomerNames = useMemo(
    () =>
      new Set(
        customerItems
          .filter((customer) => selectedCustomers.includes(customer.id))
          .map((customer) => customer.title.toLowerCase()),
      ),
    [customerItems, selectedCustomers],
  );
  const selectedSupplierNames = useMemo(
    () =>
      new Set(
        supplierItems
          .filter((supplier) => selectedSuppliers.includes(supplier.id))
          .map((supplier) => supplier.title.toLowerCase()),
      ),
    [supplierItems, selectedSuppliers],
  );
  const visibleTransactions = useMemo(() => {
    return (movementsOverview?.transactions ?? []).filter((transaction) => {
      if (!matchesLedgerTab(transaction, activeLedgerTab)) {
        return false;
      }

      if (!matchesPaymentFilter(transaction, selectedPaymentFilters)) {
        return false;
      }

      if (
        selectedSaleOrigins.length > 0 &&
        !selectedSaleOrigins.some((originId) => matchesSaleOrigin(transaction, originId))
      ) {
        return false;
      }

      const text = getTransactionText(transaction);

      if (
        selectedEmployeeNames.size > 0 &&
        ![...selectedEmployeeNames].some((employeeName) => text.includes(employeeName))
      ) {
        return false;
      }

      if (
        selectedCustomerNames.size > 0 &&
        ![...selectedCustomerNames].some((customerName) => text.includes(customerName))
      ) {
        return false;
      }

      if (
        selectedSupplierNames.size > 0 &&
        ![...selectedSupplierNames].some((supplierName) => text.includes(supplierName))
      ) {
        return false;
      }

      return true;
    });
  }, [
    activeLedgerTab,
    movementsOverview?.transactions,
    selectedCustomerNames,
    selectedEmployeeNames,
    selectedPaymentFilters,
    selectedSaleOrigins,
    selectedSupplierNames,
  ]);
  const isSubmitting =
    openMutation.isPending ||
    closeMutation.isPending ||
    manualEntryMutation.isPending;
  const isLoading =
    currentSessionQuery.isLoading ||
    assigneesQuery.isLoading ||
    movementsOverviewQuery.isLoading;
  const hasError =
    currentSessionQuery.isError ||
    assigneesQuery.isError ||
    movementsOverviewQuery.isError;
  const error =
    currentSessionQuery.error ??
    assigneesQuery.error ??
    movementsOverviewQuery.error;
  const hasClosuresError = historyQuery.isError;
  const closuresError = historyQuery.error;
  const isClosuresLoading = historyQuery.isLoading;
  const selectedDrawerItems =
    selectionDrawerType === "employees"
      ? employeeItems
      : selectionDrawerType === "customers"
        ? customerItems
        : supplierItems;
  const selectedDrawerIds =
    selectionDrawerType === "employees"
      ? selectedEmployees
      : selectionDrawerType === "customers"
        ? selectedCustomers
        : selectedSuppliers;
  const selectedDrawerTitle =
    selectionDrawerType === "employees"
      ? "Seleccionar empleados"
      : selectionDrawerType === "customers"
        ? "Seleccionar clientes"
        : "Seleccionar proveedores";

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

  function clearFilters() {
    setSelectedPaymentFilters([]);
    setSelectedSaleOrigins([]);
    setSelectedEmployees([]);
    setSelectedCustomers([]);
    setSelectedSuppliers([]);
  }

  function toggleSelectionDrawerItem(itemId: string) {
    if (selectionDrawerType === "employees") {
      setSelectedEmployees((currentValues) => toggleArrayValue(currentValues, itemId));
      return;
    }

    if (selectionDrawerType === "customers") {
      setSelectedCustomers((currentValues) => toggleArrayValue(currentValues, itemId));
      return;
    }

    setSelectedSuppliers((currentValues) => toggleArrayValue(currentValues, itemId));
  }

  function openReportsDrawer() {
    setReportStep("menu");
    setReportDrawerOpen(true);
  }

  return (
    <>
      <RetailPageLayout
        accent="success"
        bodyVariant="flush"
        title="Movimientos"
        actions={
          <>
          <button
            className={joinClassNames(
              styles.cashButton,
              currentSession && styles.cashButtonOpen,
            )}
            type="button"
            onClick={() => setSessionDrawerOpen(true)}
          >
            <Crown />
            {currentSession ? "Caja abierta" : "Abrir caja"}
          </button>

          <button
            className={styles.topReportButton}
            type="button"
            onClick={openReportsDrawer}
          >
            <Crown />
            Descargar reporte
          </button>
          </>
        }
      >

      <section className={styles.workspace}>
        <div className={styles.segmentedTabs}>
          <button
            className={activeTab === "transactions" ? styles.segmentActive : styles.segment}
            type="button"
            onClick={() => setActiveTab("transactions")}
          >
            Transacciones
          </button>
          <button
            className={activeTab === "closures" ? styles.segmentActive : styles.segment}
            type="button"
            onClick={() => setActiveTab("closures")}
          >
            Cierres de caja
          </button>
        </div>

        <div
          className={joinClassNames(
            styles.filtersBar,
            activeTab === "closures" && styles.filtersBarClosures,
          )}
        >
          {activeTab === "transactions" ? (
            <button
              className={styles.filterButton}
              type="button"
              onClick={() => setFilterDrawerOpen(true)}
            >
              <SlidersHorizontal />
              Filtrar
              {activeFiltersCount > 0 ? (
                <strong className={styles.filterCount}>{activeFiltersCount}</strong>
              ) : null}
            </button>
          ) : null}

          <label className={styles.selectShell}>
            <select
              aria-label="Periodo"
              value={periodOption}
              onChange={(event) => setPeriodOption(event.target.value as PeriodOption)}
            >
              <option value="daily">Diario</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
            </select>
          </label>

          <label className={styles.dateShell}>
            <input
              aria-label={formatPeriodLabel(dateRange.from, dateRange.to, periodOption)}
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
            <Calendar />
          </label>

          {activeTab === "transactions" ? (
            <label className={styles.searchShell}>
              <Search />
              <input
                aria-label="Buscar concepto"
                placeholder="Buscar concepto..."
                type="search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
              />
            </label>
          ) : null}
        </div>

        {activeTab === "transactions" ? (
          <>
            <div className={styles.summaryGrid}>
              <SummaryCard
                label="Balance"
                tone="balance"
                value={formatCashRegisterCurrency(movementsOverview?.balance ?? 0)}
              />
              <SummaryCard
                label="Ventas totales"
                tone="sales"
                value={formatCashRegisterCurrency(movementsOverview?.salesTotal ?? 0)}
              />
              <SummaryCard
                label="Gastos totales"
                tone="expenses"
                value={formatCashRegisterCurrency(movementsOverview?.expensesTotal ?? 0)}
              />
            </div>

            <div className={styles.ledgerTabs}>
              {ledgerTabs.map((tab) => (
                <button
                  className={activeLedgerTab === tab.id ? styles.ledgerTabActive : styles.ledgerTab}
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveLedgerTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {hasError ? (
              <div className={styles.feedbackPanel}>
                <RetailEmptyState
                  title="No pudimos cargar los movimientos"
                  description={getErrorMessage(
                    error,
                    "Intenta actualizar la pantalla o revisar que el backend siga respondiendo.",
                  )}
                />
                <button className={styles.drawerPrimaryButton} type="button" onClick={() => void handleRefresh()}>
                  Reintentar
                </button>
              </div>
            ) : isLoading ? (
              <div className={styles.feedbackPanel}>
                <RetailEmptyState
                  title="Preparando movimientos..."
                  description="Estamos consolidando ventas, gastos, deudas e inventario del negocio."
                />
              </div>
            ) : activeLedgerTab === "receivables" || activeLedgerTab === "payables" ? (
              <div className={styles.debtPanel}>
                <SummaryCard
                  label={activeLedgerTab === "receivables" ? "Total por cobrar" : "Total por pagar"}
                  value={formatCashRegisterCurrency(
                    activeLedgerTab === "receivables"
                      ? movementsOverview?.receivablesTotal ?? 0
                      : movementsOverview?.payablesTotal ?? 0,
                  )}
                />
                <CashRegisterRetailTransactionsTable
                  emptyActionLabel="Crear un movimiento"
                  transactions={visibleTransactions}
                  onEmptyAction={() => setSessionDrawerOpen(true)}
                />
              </div>
            ) : (
              <CashRegisterRetailTransactionsTable
                emptyActionLabel="Crear un movimiento"
                transactions={visibleTransactions}
                onEmptyAction={() => setSessionDrawerOpen(true)}
              />
            )}
          </>
        ) : (
          <>
            {hasClosuresError ? (
              <div className={styles.feedbackPanel}>
                <RetailEmptyState
                  title="No pudimos cargar los cierres de caja"
                  description={getErrorMessage(
                    closuresError,
                    "Intenta actualizar la pantalla o revisar que el backend siga respondiendo.",
                  )}
                />
                <button className={styles.drawerPrimaryButton} type="button" onClick={() => void handleRefresh()}>
                  Reintentar
                </button>
              </div>
            ) : isClosuresLoading ? (
              <div className={styles.feedbackPanel}>
                <RetailEmptyState
                  title="Preparando cierres de caja..."
                  description="Estamos consultando el historial de cierres del negocio."
                />
              </div>
            ) : (
              <CashRegisterHistoryList sessions={closedSessions} />
            )}
          </>
        )}
      </section>
      </RetailPageLayout>

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

      <MovementFiltersDrawer
        isOpen={isFilterDrawerOpen && selectionDrawerType === null}
        selectedCustomers={selectedCustomers}
        selectedEmployees={selectedEmployees}
        selectedPaymentFilters={selectedPaymentFilters}
        selectedSaleOrigins={selectedSaleOrigins}
        selectedSuppliers={selectedSuppliers}
        onClear={clearFilters}
        onClose={() => setFilterDrawerOpen(false)}
        onConfirm={() => setFilterDrawerOpen(false)}
        onOpenSelector={setSelectionDrawerType}
        onTogglePaymentFilter={(value) =>
          setSelectedPaymentFilters((currentValues) => toggleArrayValue(currentValues, value))
        }
        onToggleSaleOrigin={(value) =>
          setSelectedSaleOrigins((currentValues) => toggleArrayValue(currentValues, value))
        }
      />

      <SelectionDrawer
        isOpen={selectionDrawerType !== null}
        items={selectedDrawerItems}
        searchPlaceholder={
          selectionDrawerType === "employees"
            ? "Buscar empleado..."
            : selectionDrawerType === "customers"
              ? "Buscar cliente..."
              : "Buscar proveedor..."
        }
        selectedIds={selectedDrawerIds}
        title={selectedDrawerTitle}
        onBack={() => setSelectionDrawerType(null)}
        onConfirm={() => setSelectionDrawerType(null)}
        onToggle={toggleSelectionDrawerItem}
      />

      <ReportsDrawer
        isOpen={isReportDrawerOpen}
        isSubmitting={
          downloadReportMutation.isPending || downloadMovementsReportMutation.isPending
        }
        reportStep={reportStep}
        onClose={() => setReportDrawerOpen(false)}
        onDownloadBalance={() =>
          handleDownloadReport({
            view: "transactions",
            from: dateRange.from,
            to: dateRange.to,
            search: searchValue.trim() || undefined,
            type: selectedType,
          })
        }
        onDownloadDebts={() =>
          handleDownloadReport({
            view: "transactions",
            from: dateRange.from,
            to: dateRange.to,
            search: searchValue.trim() || undefined,
            type: "ALL",
          })
        }
        onPrintReport={() => window.print()}
        onSelectStep={setReportStep}
      />
    </>
  );
}
