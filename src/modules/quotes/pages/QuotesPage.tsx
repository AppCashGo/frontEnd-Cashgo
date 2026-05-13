import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ConvertQuotationDrawer } from "@/modules/quotes/components/ConvertQuotationDrawer";
import { QuotationCreatedDrawer } from "@/modules/quotes/components/QuotationCreatedDrawer";
import { QuotationDetailDrawer } from "@/modules/quotes/components/QuotationDetailDrawer";
import {
  getQuotesCopy,
  getQuotationStatusLabel,
} from "@/modules/quotes/i18n/quotes-copy";
import {
  useConvertQuotationMutation,
  useDeleteQuotationMutation,
  useDownloadQuotationDocumentMutation,
  useQuotationDetailQuery,
  useQuotationsQuery,
  useSendQuotationMutation,
} from "@/modules/quotes/hooks/use-quotations-query";
import type {
  ConvertQuotationToSaleInput,
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
import { routePaths } from "@/routes/route-paths";
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

type QuotesLocationState = {
  createdQuotationId?: string;
};

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
  const navigate = useNavigate();
  const location = useLocation();
  const copy = getQuotesCopy(languageCode);
  const [searchValue, setSearchValue] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedStatus, setSelectedStatus] =
    useState<QuotationStatusFilter>("ALL");
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(
    null,
  );
  const [createdQuotationId, setCreatedQuotationId] = useState<string | null>(
    null,
  );
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
  const createdDetailQuery = useQuotationDetailQuery(createdQuotationId);
  const customersQuery = useCustomersQuery();
  const currentCashRegisterQuery = useCurrentCashRegisterQuery();
  const deleteMutation = useDeleteQuotationMutation();
  const sendMutation = useSendQuotationMutation();
  const convertMutation = useConvertQuotationMutation();
  const downloadMutation = useDownloadQuotationDocumentMutation();
  const quotations = quotationsQuery.data ?? [];
  const customers = customersQuery.data ?? [];
  const selectedQuotation = detailQuery.data ?? null;
  const createdQuotation = createdDetailQuery.data ?? null;
  const currentCashRegister = currentCashRegisterQuery.data ?? null;
  const isWorking =
    deleteMutation.isPending ||
    sendMutation.isPending ||
    convertMutation.isPending ||
    downloadMutation.isPending;
  const hasLoadError =
    quotationsQuery.isError ||
    customersQuery.isError ||
    currentCashRegisterQuery.isError;
  const loadError =
    quotationsQuery.error ??
    customersQuery.error ??
    currentCashRegisterQuery.error;

  useEffect(() => {
    const locationState = location.state as QuotesLocationState | null;

    if (!locationState?.createdQuotationId) {
      return;
    }

    setActionError(null);
    setSelectedQuotationId(null);
    setIsConvertOpen(false);
    setCreatedQuotationId(locationState.createdQuotationId);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  function clearActionError() {
    setActionError(null);
  }

  function openCreatePage() {
    clearActionError();
    navigate(routePaths.quoteNew);
  }

  function closeCreatedDrawer() {
    setCreatedQuotationId(null);
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
        filename ?? `${selectedQuotation.fullNumber.toLowerCase()}.pdf`,
      );
    } catch (error) {
      setActionError(getErrorMessage(error, copy.actionError));
    }
  }

  async function shareQuotation(quotation: QuotationDetail) {
    try {
      clearActionError();
      const quotationForShare =
        quotation.status === "DRAFT" || !quotation.publicToken
          ? await sendMutation.mutateAsync(quotation.id)
          : quotation;
      const publicUrl = quotationForShare.publicToken
        ? buildPublicQuotationUrl(quotationForShare.publicToken)
        : null;
      const text = buildQuotationWhatsappMessage(
        quotationForShare,
        languageCode,
        publicUrl,
      );
      const customerPhone = quotationForShare.customer?.phone?.replace(/\D/g, "");
      const whatsappUrl = customerPhone
        ? `https://wa.me/${customerPhone}?text=${encodeURIComponent(text)}`
        : `https://wa.me/?text=${encodeURIComponent(text)}`;

      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setActionError(getErrorMessage(error, copy.actionError));
    }
  }

  async function printQuotationDocument(quotation: QuotationDetail) {
    try {
      clearActionError();
      const { blob } = await downloadMutation.mutateAsync(quotation.id);
      const printableUrl = URL.createObjectURL(blob);
      const printWindow = window.open(
        printableUrl,
        "_blank",
        "width=840,height=960",
      );

      if (printWindow) {
        printWindow.addEventListener(
          "load",
          () => {
            printWindow.focus();
            printWindow.print();
          },
          { once: true },
        );
      }

      window.setTimeout(() => URL.revokeObjectURL(printableUrl), 60_000);
    } catch (error) {
      setActionError(getErrorMessage(error, copy.actionError));
    }
  }

  async function handlePrintQuotation() {
    if (!selectedQuotation) {
      return;
    }

    await printQuotationDocument(selectedQuotation);
  }

  async function handlePrintCreatedQuotation() {
    if (!createdQuotation) {
      return;
    }

    await printQuotationDocument(createdQuotation);
  }

  async function handleDownloadCreatedQuotation() {
    if (!createdQuotation) {
      return;
    }

    try {
      clearActionError();
      const { blob, filename } = await downloadMutation.mutateAsync(
        createdQuotation.id,
      );

      downloadBlobFile(
        blob,
        filename ?? `${createdQuotation.fullNumber.toLowerCase()}.pdf`,
      );
    } catch (error) {
      setActionError(getErrorMessage(error, copy.actionError));
    }
  }

  async function handleShareCreatedQuotation() {
    if (!createdQuotation) {
      return;
    }

    await shareQuotation(createdQuotation);
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
            onClick={openCreatePage}
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

      <QuotationCreatedDrawer
        isLoading={createdDetailQuery.isPending}
        isOpen={createdQuotationId !== null}
        isWorking={isWorking}
        languageCode={languageCode}
        quotation={createdQuotation}
        onClose={closeCreatedDrawer}
        onDownload={() => void handleDownloadCreatedQuotation()}
        onPrint={() => void handlePrintCreatedQuotation()}
        onShare={() => void handleShareCreatedQuotation()}
      />

      <QuotationDetailDrawer
        isLoading={detailQuery.isPending}
        isOpen={selectedQuotationId !== null}
        isWorking={isWorking}
        languageCode={languageCode}
        quotation={selectedQuotation}
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
        onPrint={handlePrintQuotation}
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
