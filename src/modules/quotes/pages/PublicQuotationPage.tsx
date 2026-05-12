import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  getQuotesCopy,
  getQuotationStatusLabel,
} from "@/modules/quotes/i18n/quotes-copy";
import {
  useAcceptPublicQuotationMutation,
  useDownloadPublicQuotationDocumentMutation,
  usePublicQuotationQuery,
  useRejectPublicQuotationMutation,
} from "@/modules/quotes/hooks/use-quotations-query";
import {
  formatQuotationCurrency,
  formatQuotationDate,
  formatQuotationDateTime,
} from "@/modules/quotes/utils/quotation-utils";
import { useAppTranslation } from "@/shared/i18n/use-app-translation";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import styles from "./PublicQuotationPage.module.css";

function downloadBlobFile(blob: Blob, filename: string) {
  const downloadUrl = URL.createObjectURL(blob);
  const linkElement = document.createElement("a");

  linkElement.href = downloadUrl;
  linkElement.download = filename;
  linkElement.click();
  URL.revokeObjectURL(downloadUrl);
}

export function PublicQuotationPage() {
  const { token } = useParams<{ token: string }>();
  const { languageCode } = useAppTranslation();
  const copy = getQuotesCopy(languageCode);
  const [actionError, setActionError] = useState<string | null>(null);
  const quotationQuery = usePublicQuotationQuery(token ?? null);
  const acceptMutation = useAcceptPublicQuotationMutation();
  const rejectMutation = useRejectPublicQuotationMutation();
  const downloadMutation = useDownloadPublicQuotationDocumentMutation();
  const quotation = quotationQuery.data ?? null;
  const isWorking =
    acceptMutation.isPending ||
    rejectMutation.isPending ||
    downloadMutation.isPending;

  async function handleAccept() {
    if (!token) {
      return;
    }

    try {
      setActionError(null);
      await acceptMutation.mutateAsync(token);
    } catch (error) {
      setActionError(getErrorMessage(error, copy.publicResponseError));
    }
  }

  async function handleReject() {
    if (!token) {
      return;
    }

    try {
      setActionError(null);
      await rejectMutation.mutateAsync(token);
    } catch (error) {
      setActionError(getErrorMessage(error, copy.publicResponseError));
    }
  }

  async function handleDownload() {
    if (!token || !quotation) {
      return;
    }

    try {
      setActionError(null);
      const { blob, filename } = await downloadMutation.mutateAsync(token);

      downloadBlobFile(
        blob,
        filename ?? `${quotation.fullNumber.toLowerCase()}.pdf`,
      );
    } catch (error) {
      setActionError(getErrorMessage(error, copy.publicResponseError));
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        {quotationQuery.isPending ? (
          <div className={styles.emptyState}>{copy.publicLoading}</div>
        ) : !quotation ? (
          <div className={styles.emptyState}>
            {actionError ?? copy.publicMissing}
          </div>
        ) : (
          <>
            <header className={styles.header}>
              <div>
                <span className={styles.eyebrow}>{copy.publicTitle}</span>
                <h1 className={styles.title}>{quotation.fullNumber}</h1>
                <p className={styles.subtitle}>{copy.publicSubtitle}</p>
              </div>
              <span className={styles.statusPill}>
                {getQuotationStatusLabel(quotation.status, languageCode)}
              </span>
            </header>

            {actionError ? (
              <div className={styles.errorBanner}>{actionError}</div>
            ) : null}

            {quotation.status === "ACCEPTED" ? (
              <div className={styles.successBanner}>
                {copy.publicAcceptedMessage}
              </div>
            ) : null}
            {quotation.status === "REJECTED" ? (
              <div className={styles.mutedBanner}>
                {copy.publicRejectedMessage}
              </div>
            ) : null}
            {quotation.isExpired ? (
              <div className={styles.warningBanner}>
                {copy.publicExpiredMessage}
              </div>
            ) : null}

            <section className={styles.metaGrid}>
              <div className={styles.metaCard}>
                <span>{copy.publicBusiness}</span>
                <strong>{quotation.business.businessName}</strong>
                <small>
                  {quotation.business.email ?? quotation.business.phone ?? "—"}
                </small>
              </div>
              <div className={styles.metaCard}>
                <span>{copy.publicCustomer}</span>
                <strong>{quotation.customer?.name ?? copy.noCustomer}</strong>
                <small>
                  {quotation.customer?.email ??
                    quotation.customer?.phone ??
                    "—"}
                </small>
              </div>
              <div className={styles.metaCard}>
                <span>{copy.publicCreatedAt}</span>
                <strong>
                  {formatQuotationDateTime(quotation.createdAt, languageCode)}
                </strong>
              </div>
              <div className={styles.metaCard}>
                <span>{copy.publicValidity}</span>
                <strong>
                  {formatQuotationDate(quotation.validUntil, languageCode)}
                </strong>
              </div>
            </section>

            <section className={styles.tableSection}>
              <h2 className={styles.sectionTitle}>{copy.publicItems}</h2>
              <div className={styles.tableScroller}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{copy.itemName}</th>
                      <th>{copy.itemQuantity}</th>
                      <th>{copy.itemUnitPrice}</th>
                      <th>{copy.itemDiscount}</th>
                      <th>{copy.itemTotal}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotation.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className={styles.itemCell}>
                            <strong>{item.name}</strong>
                            {item.description ? (
                              <span>{item.description}</span>
                            ) : null}
                          </div>
                        </td>
                        <td>{item.quantity}</td>
                        <td>
                          {formatQuotationCurrency(
                            item.unitPrice,
                            languageCode,
                          )}
                        </td>
                        <td>
                          {formatQuotationCurrency(item.discount, languageCode)}
                        </td>
                        <td>
                          {formatQuotationCurrency(item.total, languageCode)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={styles.summaryPanel}>
              <div>
                <span>{copy.subtotal}</span>
                <strong>
                  {formatQuotationCurrency(quotation.subtotal, languageCode)}
                </strong>
              </div>
              <div>
                <span>{copy.discountTotal}</span>
                <strong>
                  {formatQuotationCurrency(
                    quotation.discountTotal,
                    languageCode,
                  )}
                </strong>
              </div>
              <div>
                <span>{copy.taxesTotal}</span>
                <strong>
                  {formatQuotationCurrency(quotation.taxTotal, languageCode)}
                </strong>
              </div>
              <div className={styles.totalBlock}>
                <span>{copy.grandTotal}</span>
                <strong>
                  {formatQuotationCurrency(quotation.total, languageCode)}
                </strong>
              </div>
            </section>

            {(quotation.notes || quotation.terms) && (
              <section className={styles.notesGrid}>
                {quotation.notes ? (
                  <article className={styles.noteCard}>
                    <h3>{copy.detailNotes}</h3>
                    <p>{quotation.notes}</p>
                  </article>
                ) : null}
                {quotation.terms ? (
                  <article className={styles.noteCard}>
                    <h3>{copy.detailTerms}</h3>
                    <p>{quotation.terms}</p>
                  </article>
                ) : null}
              </section>
            )}

            <footer className={styles.footer}>
              <button
                className={styles.buttonSecondary}
                disabled={isWorking}
                type="button"
                onClick={() => void handleDownload()}
              >
                {copy.publicDownload}
              </button>
              {quotation.canRespond ? (
                <div className={styles.footerActions}>
                  <button
                    className={styles.buttonDanger}
                    disabled={isWorking}
                    type="button"
                    onClick={() => void handleReject()}
                  >
                    {copy.publicReject}
                  </button>
                  <button
                    className={styles.buttonPrimary}
                    disabled={isWorking}
                    type="button"
                    onClick={() => void handleAccept()}
                  >
                    {copy.publicAccept}
                  </button>
                </div>
              ) : null}
            </footer>
          </>
        )}
      </section>
    </main>
  );
}
