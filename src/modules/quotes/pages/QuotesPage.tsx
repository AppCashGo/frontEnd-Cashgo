import { useDeferredValue, useMemo, useState } from "react";
import { ConvertQuotationDrawer } from "@/modules/quotes/components/ConvertQuotationDrawer";
import { CreateQuotationDrawer } from "@/modules/quotes/components/CreateQuotationDrawer";
import { QuotationDetailDrawer } from "@/modules/quotes/components/QuotationDetailDrawer";
import {
  getQuotesCopy,
  getQuotationStatusLabel,
} from "@/modules/quotes/i18n/quotes-copy";
import {
  useAcceptQuotationMutation,
  useCancelQuotationMutation,
  useConvertQuotationMutation,
  useCreateQuotationMutation,
  useDeleteQuotationMutation,
  useDownloadQuotationDocumentMutation,
  useQuotationDetailQuery,
  useQuotationsQuery,
  useRejectQuotationMutation,
  useSendQuotationMutation,
  useUpdateQuotationMutation,
} from "@/modules/quotes/hooks/use-quotations-query";
import type {
  ConvertQuotationToSaleInput,
  CreateQuotationInput,
  QuotationDetail,
  QuotationStatusFilter,
} from "@/modules/quotes/types/quotation";
import {
  buildPublicQuotationUrl,
  buildQuotationWhatsappMessage,
  formatQuotationCurrency,
  formatQuotationDateTime,
  getQuotationConceptLabel,
} from "@/modules/quotes/utils/quotation-utils";
import { useCurrentCashRegisterQuery } from "@/modules/cash-register/hooks/use-cash-register-query";
import { useCustomersQuery } from "@/modules/customers/hooks/use-customers-query";
import { useProductsQuery } from "@/modules/products/hooks/use-products-query";
import { RetailEmptyState } from "@/shared/components/retail/RetailEmptyState";
import { RetailPremiumBanner } from "@/shared/components/retail/RetailPremiumBanner";
import retailStyles from "@/shared/components/retail/RetailUI.module.css";
import { useAppTranslation } from "@/shared/i18n/use-app-translation";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import styles from "./QuotesPage.module.css";

const statusFilters: QuotationStatusFilter[] = [
  "ALL",
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "CONVERTED",
  "CANCELLED",
];

function getStatusClassName(status: QuotationStatusFilter) {
  if (status === "ACCEPTED" || status === "CONVERTED") {
    return styles.statusSuccess;
  }

  if (status === "SENT") {
    return styles.statusInfo;
  }

  if (status === "REJECTED" || status === "CANCELLED") {
    return styles.statusDanger;
  }

  if (status === "EXPIRED") {
    return styles.statusMuted;
  }

  return styles.statusDraft;
}

function downloadBlobFile(blob: Blob, filename: string) {
  const downloadUrl = URL.createObjectURL(blob);
  const linkElement = document.createElement("a");

  linkElement.href = downloadUrl;
  linkElement.download = filename;
  linkElement.click();
  URL.revokeObjectURL(downloadUrl);
}

export function QuotesPage() {
  const { languageCode } = useAppTranslation();
  const copy = getQuotesCopy(languageCode);
  const [searchValue, setSearchValue] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedStatus, setSelectedStatus] =
    useState<QuotationStatusFilter>("ALL");
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(
    null,
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] =
    useState<QuotationDetail | null>(null);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const deferredSearchValue = useDeferredValue(searchValue.trim());
  const filters = useMemo(
    () => ({
      search: deferredSearchValue || undefined,
      customerId: selectedCustomerId || undefined,
      status: selectedStatus,
    }),
    [deferredSearchValue, selectedCustomerId, selectedStatus],
  );
  const quotationsQuery = useQuotationsQuery(filters);
  const detailQuery = useQuotationDetailQuery(selectedQuotationId);
  const customersQuery = useCustomersQuery();
  const productsQuery = useProductsQuery();
  const currentCashRegisterQuery = useCurrentCashRegisterQuery();
  const createMutation = useCreateQuotationMutation();
  const updateMutation = useUpdateQuotationMutation();
  const deleteMutation = useDeleteQuotationMutation();
  const sendMutation = useSendQuotationMutation();
  const acceptMutation = useAcceptQuotationMutation();
  const rejectMutation = useRejectQuotationMutation();
  const cancelMutation = useCancelQuotationMutation();
  const convertMutation = useConvertQuotationMutation();
  const downloadMutation = useDownloadQuotationDocumentMutation();
  const quotations = quotationsQuery.data ?? [];
  const customers = customersQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const selectedQuotation = detailQuery.data ?? null;
  const currentCashRegister = currentCashRegisterQuery.data ?? null;
  const isWorking =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    sendMutation.isPending ||
    acceptMutation.isPending ||
    rejectMutation.isPending ||
    cancelMutation.isPending ||
    convertMutation.isPending ||
    downloadMutation.isPending;
  const hasLoadError =
    quotationsQuery.isError ||
    customersQuery.isError ||
    productsQuery.isError ||
    currentCashRegisterQuery.isError;
  const loadError =
    quotationsQuery.error ??
    customersQuery.error ??
    productsQuery.error ??
    currentCashRegisterQuery.error;

  function clearActionError() {
    setActionError(null);
  }

  function openCreateDrawer() {
    clearActionError();
    setEditingQuotation(null);
    setIsFormOpen(true);
  }

  function openEditDrawer() {
    if (!selectedQuotation) {
      return;
    }

    clearActionError();
    setEditingQuotation(selectedQuotation);
    setIsFormOpen(true);
  }

  function closeCreateDrawer() {
    setIsFormOpen(false);
    setEditingQuotation(null);
  }

  async function handleCreateOrUpdateQuotation(input: CreateQuotationInput) {
    clearActionError();

    if (editingQuotation) {
      const updatedQuotation = await updateMutation.mutateAsync({
        quotationId: editingQuotation.id,
        input,
      });

      setSelectedQuotationId(updatedQuotation.id);
      closeCreateDrawer();
      return updatedQuotation;
    }

    const createdQuotation = await createMutation.mutateAsync(input);

    setSelectedQuotationId(createdQuotation.id);
    closeCreateDrawer();
    return createdQuotation;
  }

  async function handleDeleteQuotation() {
    if (!selectedQuotation) {
      return;
    }

    const confirmed = window.confirm(
      languageCode === "en"
        ? "Delete this quote permanently?"
        : "¿Eliminar esta cotización de forma permanente?",
    );

    if (!confirmed) {
      return;
    }

    try {
      clearActionError();
      await deleteMutation.mutateAsync(selectedQuotation.id);
      setSelectedQuotationId(null);
    } catch (error) {
      setActionError(getErrorMessage(error, copy.actionError));
    }
  }

  async function handleChangeStatus(
    action: () => Promise<unknown>,
    fallbackMessage: string,
  ) {
    try {
      clearActionError();
      await action();
    } catch (error) {
      setActionError(getErrorMessage(error, fallbackMessage));
    }
  }

  async function handleSendQuotation() {
    if (!selectedQuotation) {
      return;
    }

    await handleChangeStatus(
      () => sendMutation.mutateAsync(selectedQuotation.id),
      copy.actionError,
    );
  }

  async function handleAcceptQuotation() {
    if (!selectedQuotation) {
      return;
    }

    await handleChangeStatus(
      () => acceptMutation.mutateAsync(selectedQuotation.id),
      copy.actionError,
    );
  }

  async function handleRejectQuotation() {
    if (!selectedQuotation) {
      return;
    }

    await handleChangeStatus(
      () => rejectMutation.mutateAsync(selectedQuotation.id),
      copy.actionError,
    );
  }

  async function handleCancelQuotation() {
    if (!selectedQuotation) {
      return;
    }

    const confirmed = window.confirm(
      languageCode === "en"
        ? "Cancel this quote?"
        : "¿Cancelar esta cotización?",
    );

    if (!confirmed) {
      return;
    }

    await handleChangeStatus(
      () => cancelMutation.mutateAsync(selectedQuotation.id),
      copy.actionError,
    );
  }

  async function handleDownloadQuotation() {
    if (!selectedQuotation) {
      return;
    }

    try {
      clearActionError();
      const { blob, filename } = await downloadMutation.mutateAsync(
        selectedQuotation.id,
      );

      downloadBlobFile(
        blob,
        filename ?? `${selectedQuotation.fullNumber.toLowerCase()}.html`,
      );
    } catch (error) {
      setActionError(getErrorMessage(error, copy.actionError));
    }
  }

  async function handleShareQuotation() {
    if (!selectedQuotation) {
      return;
    }

    try {
      clearActionError();
      const quotationForShare =
        selectedQuotation.status === "DRAFT" || !selectedQuotation.publicToken
          ? await sendMutation.mutateAsync(selectedQuotation.id)
          : selectedQuotation;
      const publicUrl = quotationForShare.publicToken
        ? buildPublicQuotationUrl(quotationForShare.publicToken)
        : null;
      const text = buildQuotationWhatsappMessage(
        quotationForShare,
        languageCode,
        publicUrl,
      );
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setActionError(getErrorMessage(error, copy.actionError));
    }
  }

  async function handleConvertQuotation(input: ConvertQuotationToSaleInput) {
    if (!selectedQuotation) {
      return;
    }

    try {
      clearActionError();
      const convertedQuotation = await convertMutation.mutateAsync({
        quotationId: selectedQuotation.id,
        input,
      });

      setSelectedQuotationId(convertedQuotation.id);
      setIsConvertOpen(false);
    } catch (error) {
      setActionError(getErrorMessage(error, copy.actionError));
      throw error;
    }
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
            className={retailStyles.buttonDark}
            type="button"
            onClick={openCreateDrawer}
          >
            {copy.createButton}
          </button>
        </div>
      </section>

      <RetailPremiumBanner
        description={copy.premiumDescription}
        linkLabel={languageCode === "en" ? "View benefits" : "Ver beneficios"}
        title={copy.premiumTitle}
      />

      {hasLoadError ? (
        <div className={styles.errorBanner}>
          {getErrorMessage(loadError, copy.actionError)}
        </div>
      ) : null}

      {actionError ? (
        <div className={styles.errorBanner}>{actionError}</div>
      ) : null}

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
              setSelectedStatus(event.target.value as QuotationStatusFilter)
            }
          >
            {statusFilters.map((status) => (
              <option key={status} value={status}>
                {status === "ALL"
                  ? copy.allStatuses
                  : getQuotationStatusLabel(status, languageCode)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section className={retailStyles.tableCard}>
        <div className={retailStyles.tableScroller}>
          <table className={retailStyles.table}>
            <thead>
              <tr>
                <th>{copy.columns.customer}</th>
                <th>{copy.columns.phone}</th>
                <th>{copy.columns.concept}</th>
                <th>{copy.columns.status}</th>
                <th>{copy.columns.total}</th>
                <th>{copy.columns.actions}</th>
              </tr>
            </thead>
            <tbody>
              {quotationsQuery.isPending ? (
                <tr>
                  <td className={styles.loadingCell} colSpan={6}>
                    {copy.loadingList}
                  </td>
                </tr>
              ) : quotations.length > 0 ? (
                quotations.map((quotation) => (
                  <tr key={quotation.id}>
                    <td>
                      <div className={styles.customerCell}>
                        <strong>
                          {quotation.customer?.name ?? copy.noCustomer}
                        </strong>
                        <span>{quotation.fullNumber}</span>
                      </div>
                    </td>
                    <td>{quotation.customer?.phone ?? copy.noPhone}</td>
                    <td>
                      {getQuotationConceptLabel(quotation, languageCode) ??
                        copy.conceptFallback}
                    </td>
                    <td>
                      <span
                        className={`${styles.statusPill} ${getStatusClassName(
                          quotation.status,
                        )}`}
                      >
                        {getQuotationStatusLabel(
                          quotation.status,
                          languageCode,
                        )}
                      </span>
                    </td>
                    <td>
                      <div className={styles.totalCell}>
                        <strong>
                          {formatQuotationCurrency(
                            quotation.total,
                            languageCode,
                          )}
                        </strong>
                        <span>
                          {formatQuotationDateTime(
                            quotation.createdAt,
                            languageCode,
                          )}
                        </span>
                      </div>
                    </td>
                    <td>
                      <button
                        className={styles.actionButton}
                        type="button"
                        onClick={() => {
                          clearActionError();
                          setSelectedQuotationId(quotation.id);
                        }}
                      >
                        {copy.view}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
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
      </section>

      <CreateQuotationDrawer
        customers={customers}
        isOpen={isFormOpen}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        languageCode={languageCode}
        products={products}
        quotation={editingQuotation}
        onClose={closeCreateDrawer}
        onSubmit={handleCreateOrUpdateQuotation}
      />

      <QuotationDetailDrawer
        isLoading={detailQuery.isPending}
        isOpen={selectedQuotationId !== null}
        isWorking={isWorking}
        languageCode={languageCode}
        quotation={selectedQuotation}
        onAccept={handleAcceptQuotation}
        onCancel={handleCancelQuotation}
        onClose={() => {
          clearActionError();
          setSelectedQuotationId(null);
          setIsConvertOpen(false);
        }}
        onConvert={() => {
          clearActionError();
          setIsConvertOpen(true);
        }}
        onDelete={handleDeleteQuotation}
        onDownload={handleDownloadQuotation}
        onEdit={openEditDrawer}
        onReject={handleRejectQuotation}
        onSend={handleSendQuotation}
        onShare={() => void handleShareQuotation()}
      />

      <ConvertQuotationDrawer
        activeCashRegisterId={currentCashRegister?.id}
        customers={customers}
        isOpen={isConvertOpen}
        isSubmitting={convertMutation.isPending}
        languageCode={languageCode}
        quotation={selectedQuotation}
        onClose={() => {
          clearActionError();
          setIsConvertOpen(false);
        }}
        onSubmit={handleConvertQuotation}
      />
    </div>
  );
}
