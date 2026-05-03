import { useDeferredValue, useMemo, useState } from "react";
import { BillingConfigurationDrawer } from "@/modules/billing/components/BillingConfigurationDrawer";
import { BillingDocumentDrawer } from "@/modules/billing/components/BillingDocumentDrawer";
import { CreateBillingInvoiceDrawer } from "@/modules/billing/components/CreateBillingInvoiceDrawer";
import {
  getBillingCopy,
  getBillingInvoiceStatusLabel,
  getBillingInvoiceTypeLabel,
  getBillingStatusLabel,
} from "@/modules/billing/i18n/billing-copy";
import {
  useBillingConfigurationQuery,
  useBillingDocumentDetailQuery,
  useBillingDocumentsQuery,
  useCollectBillingDocumentMutation,
  useCreateBillingInvoiceMutation,
  useDownloadBillingReceiptMutation,
  useDownloadBillingReportMutation,
  useUpdateBillingConfigurationMutation,
} from "@/modules/billing/hooks/use-billing-query";
import type {
  BillingCollectionInput,
  BillingConfigurationInput,
  BillingDocumentStatus,
  BillingDocumentStatusFilter,
  CreateBillingInvoiceInput,
} from "@/modules/billing/types/billing";
import {
  formatBillingCurrency,
  formatBillingDateTime,
} from "@/modules/billing/utils/format-billing";
import { useCurrentCashRegisterQuery } from "@/modules/cash-register/hooks/use-cash-register-query";
import { useCustomersQuery } from "@/modules/customers/hooks/use-customers-query";
import { MetricCard } from "@/shared/components/ui/MetricCard";
import { RetailEmptyState } from "@/shared/components/retail/RetailEmptyState";
import retailStyles from "@/shared/components/retail/RetailUI.module.css";
import { useAppTranslation } from "@/shared/i18n/use-app-translation";
import styles from "./BillingPage.module.css";

function getPaymentStatusClassName(status: BillingDocumentStatus) {
  if (status === "PAID") {
    return styles.statusPaid;
  }

  if (status === "PARTIAL") {
    return styles.statusPartial;
  }

  if (status === "PENDING") {
    return styles.statusPending;
  }

  if (status === "OVERDUE") {
    return styles.statusOverdue;
  }

  return styles.statusCancelled;
}

function getInvoiceStatusClassName(
  status:
    | "DRAFT"
    | "PENDING"
    | "SENT"
    | "APPROVED"
    | "REJECTED"
    | "CANCELLED",
) {
  if (status === "APPROVED") {
    return styles.statusApproved;
  }

  if (status === "PENDING" || status === "SENT") {
    return styles.statusPending;
  }

  if (status === "REJECTED") {
    return styles.statusRejected;
  }

  if (status === "CANCELLED") {
    return styles.statusCancelled;
  }

  return styles.statusDraft;
}

export function BillingPage() {
  const { languageCode } = useAppTranslation();
  const copy = getBillingCopy(languageCode);
  const [searchValue, setSearchValue] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedStatus, setSelectedStatus] =
    useState<BillingDocumentStatusFilter>("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [isConfigurationOpen, setIsConfigurationOpen] = useState(false);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const deferredSearchValue = useDeferredValue(searchValue.trim());
  const filters = useMemo(
    () => ({
      search: deferredSearchValue || undefined,
      customerId: selectedCustomerId || undefined,
      status: selectedStatus,
      from: fromDate || undefined,
      to: toDate || undefined,
    }),
    [deferredSearchValue, selectedCustomerId, selectedStatus, fromDate, toDate],
  );
  const billingQuery = useBillingDocumentsQuery(filters);
  const billingConfigurationQuery = useBillingConfigurationQuery();
  const detailQuery = useBillingDocumentDetailQuery(selectedDocumentId);
  const customersQuery = useCustomersQuery();
  const currentCashRegisterQuery = useCurrentCashRegisterQuery();
  const collectMutation = useCollectBillingDocumentMutation();
  const updateConfigurationMutation = useUpdateBillingConfigurationMutation();
  const createInvoiceMutation = useCreateBillingInvoiceMutation();
  const receiptMutation = useDownloadBillingReceiptMutation();
  const reportMutation = useDownloadBillingReportMutation();
  const documents = billingQuery.data ?? [];
  const customers = customersQuery.data ?? [];
  const configuration = billingConfigurationQuery.data ?? null;
  const currentCashRegister = currentCashRegisterQuery.data ?? null;
  const totalBilled = documents.reduce(
    (accumulator, document) => accumulator + document.total,
    0,
  );
  const totalPaid = documents.reduce(
    (accumulator, document) => accumulator + document.paidAmount,
    0,
  );
  const totalPending = documents.reduce(
    (accumulator, document) => accumulator + document.balance,
    0,
  );
  const approvedCount = documents.filter(
    (document) => document.invoiceStatus === "APPROVED",
  ).length;
  const hasError =
    billingQuery.isError ||
    billingConfigurationQuery.isError ||
    customersQuery.isError ||
    currentCashRegisterQuery.isError;
  const error =
    billingQuery.error ??
    billingConfigurationQuery.error ??
    customersQuery.error ??
    currentCashRegisterQuery.error;

  async function handleDownloadReport() {
    const { blob, filename } = await reportMutation.mutateAsync(filters);
    const downloadUrl = URL.createObjectURL(blob);
    const linkElement = document.createElement("a");

    linkElement.href = downloadUrl;
    linkElement.download = filename ?? "billing-report.csv";
    linkElement.click();
    URL.revokeObjectURL(downloadUrl);
  }

  async function handleDownloadReceipt(documentId: string) {
    const { blob, filename } = await receiptMutation.mutateAsync(documentId);
    const downloadUrl = URL.createObjectURL(blob);
    const linkElement = document.createElement("a");

    linkElement.href = downloadUrl;
    linkElement.download = filename ?? `${documentId}-receipt.html`;
    linkElement.click();
    URL.revokeObjectURL(downloadUrl);
  }

  async function handlePrintReceipt(documentId: string) {
    const { blob } = await receiptMutation.mutateAsync(documentId);
    const receiptUrl = URL.createObjectURL(blob);
    const printWindow = window.open(receiptUrl, "_blank", "noopener,noreferrer");

    if (!printWindow) {
      URL.revokeObjectURL(receiptUrl);
      return;
    }

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };

    setTimeout(() => {
      URL.revokeObjectURL(receiptUrl);
    }, 60000);
  }

  async function handleCollectPayment(input: BillingCollectionInput) {
    if (!selectedDocumentId) {
      return;
    }

    await collectMutation.mutateAsync({
      documentId: selectedDocumentId,
      input,
    });
  }

  async function handleSaveConfiguration(input: BillingConfigurationInput) {
    await updateConfigurationMutation.mutateAsync(input);
    setIsConfigurationOpen(false);
  }

  async function handleCreateInvoice(input: CreateBillingInvoiceInput) {
    const createdDocument = await createInvoiceMutation.mutateAsync(input);

    setIsCreateInvoiceOpen(false);
    setSelectedDocumentId(createdDocument.id);
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <h2 className={styles.title}>{copy.pageTitle}</h2>
          <p className={styles.description}>{copy.pageDescription}</p>
        </div>

        <div className={styles.heroActions}>
          <button
            className={retailStyles.buttonOutline}
            type="button"
            onClick={() => setIsConfigurationOpen(true)}
          >
            {copy.configureButton}
          </button>
          <button
            className={retailStyles.buttonOutline}
            type="button"
            onClick={() => void handleDownloadReport()}
          >
            {copy.exportButton}
          </button>
          <button
            className={retailStyles.buttonDark}
            type="button"
            onClick={() => setIsCreateInvoiceOpen(true)}
          >
            {copy.createButton}
          </button>
        </div>
      </section>

      <section className={styles.configurationStrip}>
        <div className={styles.configurationCard}>
          <p className={styles.configurationLabel}>{copy.summaryTaxId}</p>
          <p className={styles.configurationValue}>
            {configuration?.taxId ?? "—"}
          </p>
        </div>
        <div className={styles.configurationCard}>
          <p className={styles.configurationLabel}>{copy.summaryResolution}</p>
          <p className={styles.configurationValue}>
            {configuration?.resolution?.resolution ?? copy.summaryMissingResolution}
          </p>
        </div>
        <div className={styles.configurationCard}>
          <p className={styles.configurationLabel}>{copy.summaryPrefix}</p>
          <p className={styles.configurationValue}>
            {configuration?.resolution?.prefix ?? "—"}
          </p>
        </div>
        <div className={styles.configurationCard}>
          <p className={styles.configurationLabel}>{copy.summaryCurrentNumber}</p>
          <p className={styles.configurationValue}>
            {configuration?.resolution?.currentNumber ?? "—"}
          </p>
        </div>
      </section>

      <div className={styles.metricsGrid}>
        <MetricCard
          hint={copy.totalBilledHint}
          label={copy.totalBilled}
          value={formatBillingCurrency(totalBilled, languageCode)}
        />
        <MetricCard
          hint={copy.totalPaidHint}
          label={copy.totalPaid}
          tone="success"
          value={formatBillingCurrency(totalPaid, languageCode)}
        />
        <MetricCard
          hint={copy.totalPendingHint}
          label={copy.totalPending}
          tone={totalPending > 0 ? "accent" : "default"}
          value={formatBillingCurrency(totalPending, languageCode)}
        />
        <MetricCard
          hint={copy.overdueCountHint}
          label={copy.overdueCount}
          tone={approvedCount > 0 ? "success" : "default"}
          value={approvedCount.toString()}
        />
      </div>

      <div className={`${retailStyles.filtersRow} ${styles.filtersRow}`}>
        <label className={`${retailStyles.searchField} ${styles.searchField}`}>
          <input
            className={retailStyles.input}
            placeholder={copy.searchPlaceholder}
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
          />
        </label>

        <label className={`${retailStyles.selectField} ${styles.selectField}`}>
          <select
            className={retailStyles.select}
            value={selectedCustomerId}
            onChange={(event) => setSelectedCustomerId(event.target.value)}
          >
            <option value="">{copy.allCustomers}</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </label>

        <label className={`${retailStyles.selectField} ${styles.selectField}`}>
          <select
            className={retailStyles.select}
            value={selectedStatus}
            onChange={(event) =>
              setSelectedStatus(event.target.value as BillingDocumentStatusFilter)
            }
          >
            <option value="ALL">{copy.allStatuses}</option>
            <option value="PAID">
              {getBillingStatusLabel("PAID", languageCode)}
            </option>
            <option value="PARTIAL">
              {getBillingStatusLabel("PARTIAL", languageCode)}
            </option>
            <option value="PENDING">
              {getBillingStatusLabel("PENDING", languageCode)}
            </option>
            <option value="OVERDUE">
              {getBillingStatusLabel("OVERDUE", languageCode)}
            </option>
            <option value="CANCELLED">
              {getBillingStatusLabel("CANCELLED", languageCode)}
            </option>
          </select>
        </label>

        <label className={`${retailStyles.dateField} ${styles.dateField}`}>
          <input
            className={retailStyles.input}
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
        </label>

        <label className={`${retailStyles.dateField} ${styles.dateField}`}>
          <input
            className={retailStyles.input}
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
          />
        </label>
      </div>

      {hasError && error ? (
        <div className={styles.errorBanner}>
          {error instanceof Error && error.message ? error.message : copy.loadError}
        </div>
      ) : null}

      <section className={styles.tableSection}>
        <div className={retailStyles.tableCard}>
          <div className={retailStyles.tableHeader}>
            <h3 className={retailStyles.tableTitle}>{copy.tableTitle}</h3>
          </div>

          <div className={retailStyles.tableScroller}>
            <table className={retailStyles.table}>
              <thead>
                <tr>
                  <th>{copy.columns.document}</th>
                  <th>{copy.columns.invoiceType}</th>
                  <th>{copy.columns.invoiceStatus}</th>
                  <th>{copy.columns.customer}</th>
                  <th>{copy.columns.total}</th>
                  <th>{copy.columns.balance}</th>
                  <th>{copy.columns.status}</th>
                  <th>{copy.columns.createdAt}</th>
                  <th>{copy.columns.actions}</th>
                </tr>
              </thead>
              <tbody>
                {documents.length > 0 ? (
                  documents.map((document) => (
                    <tr key={document.id}>
                      <td>
                        <div className={styles.documentCell}>
                          <span className={styles.documentNumber}>
                            {document.documentNumber}
                          </span>
                          <span className={styles.documentMeta}>
                            {document.saleNumber ?? copy.manualSale}
                          </span>
                        </div>
                      </td>
                      <td>
                        {getBillingInvoiceTypeLabel(document.type, languageCode)}
                      </td>
                      <td>
                        <span
                          className={`${styles.statusPill} ${getInvoiceStatusClassName(
                            document.invoiceStatus,
                          )}`}
                        >
                          {getBillingInvoiceStatusLabel(
                            document.invoiceStatus,
                            languageCode,
                          )}
                        </span>
                      </td>
                      <td>{document.customer?.name ?? copy.noCustomer}</td>
                      <td>
                        {formatBillingCurrency(document.total, languageCode)}
                      </td>
                      <td>
                        {formatBillingCurrency(document.balance, languageCode)}
                      </td>
                      <td>
                        <span
                          className={`${styles.statusPill} ${getPaymentStatusClassName(
                            document.paymentStatus,
                          )}`}
                        >
                          {getBillingStatusLabel(
                            document.paymentStatus,
                            languageCode,
                          )}
                        </span>
                      </td>
                      <td>
                        {formatBillingDateTime(
                          document.issuedAt ?? document.createdAt,
                          languageCode,
                        )}
                      </td>
                      <td>
                        <button
                          className={styles.actionButton}
                          type="button"
                          onClick={() => setSelectedDocumentId(document.id)}
                        >
                          {copy.viewDetail}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9}>
                      <RetailEmptyState
                        description={copy.emptyDescription}
                        title={copy.emptyTitle}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <BillingConfigurationDrawer
        configuration={configuration}
        isLoading={billingConfigurationQuery.isLoading}
        isOpen={isConfigurationOpen}
        isSubmitting={updateConfigurationMutation.isPending}
        languageCode={languageCode}
        onClose={() => setIsConfigurationOpen(false)}
        onSubmit={handleSaveConfiguration}
      />

      <CreateBillingInvoiceDrawer
        isOpen={isCreateInvoiceOpen}
        isSubmitting={createInvoiceMutation.isPending}
        languageCode={languageCode}
        onClose={() => setIsCreateInvoiceOpen(false)}
        onSubmit={handleCreateInvoice}
      />

      <BillingDocumentDrawer
        activeCashRegisterId={currentCashRegister?.id}
        document={detailQuery.data ?? null}
        isLoading={detailQuery.isLoading}
        isOpen={selectedDocumentId !== null}
        isSubmitting={collectMutation.isPending || receiptMutation.isPending}
        languageCode={languageCode}
        onClose={() => setSelectedDocumentId(null)}
        onCollectPayment={handleCollectPayment}
        onDownloadReceipt={() =>
          selectedDocumentId
            ? handleDownloadReceipt(selectedDocumentId)
            : Promise.resolve()
        }
        onPrintReceipt={() =>
          selectedDocumentId
            ? handlePrintReceipt(selectedDocumentId)
            : Promise.resolve()
        }
      />
    </div>
  );
}
