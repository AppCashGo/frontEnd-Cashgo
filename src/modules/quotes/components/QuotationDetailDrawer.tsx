import { getQuotesCopy, getQuotationStatusLabel } from "@/modules/quotes/i18n/quotes-copy";
import type { QuotationDetail } from "@/modules/quotes/types/quotation";
import {
  formatQuotationCurrency,
  formatQuotationDate,
  formatQuotationDateTime,
} from "@/modules/quotes/utils/quotation-utils";
import { CashRegisterRetailDrawer } from "@/modules/cash-register/components/CashRegisterRetailDrawer";
import retailStyles from "@/shared/components/retail/RetailUI.module.css";
import type { AppLanguageCode } from "@/shared/i18n/app-dictionary";
import styles from "./QuotationDetailDrawer.module.css";

type QuotationDetailDrawerProps = {
  languageCode: AppLanguageCode;
  quotation: QuotationDetail | null;
  isOpen: boolean;
  isLoading: boolean;
  isWorking: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onSend: () => Promise<void>;
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
  onCancel: () => Promise<void>;
  onConvert: () => void;
  onDownload: () => Promise<void>;
  onShare: () => void;
};

function getStatusClassName(status: QuotationDetail["status"]) {
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

export function QuotationDetailDrawer({
  languageCode,
  quotation,
  isOpen,
  isLoading,
  isWorking,
  onClose,
  onEdit,
  onDelete,
  onSend,
  onAccept,
  onReject,
  onCancel,
  onConvert,
  onDownload,
  onShare,
}: QuotationDetailDrawerProps) {
  const copy = getQuotesCopy(languageCode);
  const canEdit =
    quotation &&
    quotation.status !== "CONVERTED" &&
    quotation.status !== "CANCELLED";
  const canDelete =
    quotation &&
    (quotation.status === "DRAFT" || quotation.status === "REJECTED");

  return (
    <CashRegisterRetailDrawer
      description={copy.detailDescription}
      footer={
        quotation ? (
          <div className={styles.footerActions}>
            <button
              className={retailStyles.buttonOutline}
              disabled={isWorking}
              type="button"
              onClick={onClose}
            >
              {copy.cancelAction}
            </button>
            {quotation.canConvert ? (
              <button
                className={retailStyles.buttonDark}
                disabled={isWorking}
                type="button"
                onClick={onConvert}
              >
                {copy.detailConvert}
              </button>
            ) : null}
          </div>
        ) : undefined
      }
      isOpen={isOpen}
      title={quotation?.fullNumber ?? copy.detailTitle}
      onClose={onClose}
    >
      {isLoading ? (
        <p className={styles.emptyText}>
          {languageCode === "en" ? "Loading quote..." : "Cargando cotización..."}
        </p>
      ) : !quotation ? (
        <p className={styles.emptyText}>{copy.detailMissing}</p>
      ) : (
        <div className={styles.layout}>
          <section className={styles.actions}>
            <button
              className={retailStyles.buttonOutline}
              disabled={isWorking}
              type="button"
              onClick={() => void onDownload()}
            >
              {copy.detailDownload}
            </button>
            <button
              className={retailStyles.buttonOutline}
              disabled={isWorking}
              type="button"
              onClick={onShare}
            >
              {copy.detailShare}
            </button>
            {canEdit ? (
              <button
                className={retailStyles.buttonOutline}
                disabled={isWorking}
                type="button"
                onClick={onEdit}
              >
                {copy.detailEdit}
              </button>
            ) : null}
            {quotation.status === "DRAFT" ? (
              <button
                className={retailStyles.buttonDark}
                disabled={isWorking}
                type="button"
                onClick={() => void onSend()}
              >
                {copy.detailSend}
              </button>
            ) : null}
            {quotation.status === "SENT" ? (
              <>
                <button
                  className={retailStyles.buttonSuccess}
                  disabled={isWorking}
                  type="button"
                  onClick={() => void onAccept()}
                >
                  {copy.detailAccept}
                </button>
                <button
                  className={retailStyles.buttonDanger}
                  disabled={isWorking}
                  type="button"
                  onClick={() => void onReject()}
                >
                  {copy.detailReject}
                </button>
              </>
            ) : null}
            {quotation.status !== "CONVERTED" && quotation.status !== "CANCELLED" ? (
              <button
                className={retailStyles.buttonDanger}
                disabled={isWorking}
                type="button"
                onClick={() => void onCancel()}
              >
                {copy.detailCancel}
              </button>
            ) : null}
            {canDelete ? (
              <button
                className={retailStyles.buttonDanger}
                disabled={isWorking}
                type="button"
                onClick={() => void onDelete()}
              >
                {copy.detailDelete}
              </button>
            ) : null}
          </section>

          <section className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>{copy.columns.status}</span>
              <span
                className={`${styles.statusPill} ${getStatusClassName(
                  quotation.status,
                )}`}
              >
                {getQuotationStatusLabel(quotation.status, languageCode)}
              </span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>{copy.detailCustomer}</span>
              <strong>{quotation.customer?.name ?? copy.noCustomer}</strong>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>{copy.detailCreator}</span>
              <strong>{quotation.creatorName ?? "—"}</strong>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>{copy.detailValidity}</span>
              <strong>{formatQuotationDate(quotation.validUntil, languageCode)}</strong>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>{copy.detailCreatedAt}</span>
              <strong>{formatQuotationDateTime(quotation.createdAt, languageCode)}</strong>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>{copy.detailConvertedSale}</span>
              <strong>{quotation.convertedSaleNumber ?? "—"}</strong>
            </div>
          </section>

          <section className={styles.tableSection}>
            <h4 className={styles.sectionTitle}>{copy.detailItems}</h4>
            <div className={styles.tableScroller}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{copy.itemName}</th>
                    <th>{copy.itemQuantity}</th>
                    <th>{copy.itemUnitPrice}</th>
                    <th>{copy.itemDiscount}</th>
                    <th>{copy.taxesTotal}</th>
                    <th>{copy.itemTotal}</th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className={styles.itemCell}>
                          <strong>{item.name}</strong>
                          {item.description ? <span>{item.description}</span> : null}
                        </div>
                      </td>
                      <td>{item.quantity}</td>
                      <td>{formatQuotationCurrency(item.unitPrice, languageCode)}</td>
                      <td>{formatQuotationCurrency(item.discount, languageCode)}</td>
                      <td>{formatQuotationCurrency(item.taxAmount, languageCode)}</td>
                      <td>{formatQuotationCurrency(item.total, languageCode)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={styles.totalsCard}>
            <div>
              <span>{copy.subtotal}</span>
              <strong>{formatQuotationCurrency(quotation.subtotal, languageCode)}</strong>
            </div>
            <div>
              <span>{copy.discountTotal}</span>
              <strong>
                {formatQuotationCurrency(quotation.discountTotal, languageCode)}
              </strong>
            </div>
            <div>
              <span>{copy.taxesTotal}</span>
              <strong>{formatQuotationCurrency(quotation.taxTotal, languageCode)}</strong>
            </div>
            <div>
              <span>{copy.grandTotal}</span>
              <strong>{formatQuotationCurrency(quotation.total, languageCode)}</strong>
            </div>
          </section>

          <section className={styles.notesGrid}>
            <div className={styles.noteCard}>
              <h4 className={styles.sectionTitle}>{copy.detailNotes}</h4>
              <p>{quotation.notes ?? copy.noNotes}</p>
            </div>
            <div className={styles.noteCard}>
              <h4 className={styles.sectionTitle}>{copy.detailTerms}</h4>
              <p>{quotation.terms ?? copy.noTerms}</p>
            </div>
          </section>
        </div>
      )}
    </CashRegisterRetailDrawer>
  );
}
