import {
  CalendarDays,
  CircleDollarSign,
  Download,
  FileText,
  Package,
  Percent,
  Printer,
  ReceiptText,
  UserRound,
  UsersRound,
} from "lucide-react";
import { CashRegisterRetailDrawer } from "@/modules/cash-register/components/CashRegisterRetailDrawer";
import { getQuotesCopy } from "@/modules/quotes/i18n/quotes-copy";
import type { QuotationDetail } from "@/modules/quotes/types/quotation";
import {
  formatQuotationCurrency,
  formatQuotationDate,
} from "@/modules/quotes/utils/quotation-utils";
import type { AppLanguageCode } from "@/shared/i18n/app-dictionary";
import styles from "./QuotationDetailDrawer.module.css";

type QuotationDetailDrawerProps = {
  languageCode: AppLanguageCode;
  quotation: QuotationDetail | null;
  isOpen: boolean;
  isLoading: boolean;
  isWorking: boolean;
  onClose: () => void;
  onDelete: () => Promise<void>;
  onConvert: () => void;
  onDownload: () => Promise<void>;
  onPrint: () => Promise<void>;
};

function getDiscountPercentage(quotation: QuotationDetail) {
  const baseTotal = quotation.subtotal + quotation.discountTotal;

  if (baseTotal <= 0) {
    return 0;
  }

  return Math.round((quotation.discountTotal / baseTotal) * 100);
}

function formatDrawerDateTime(value: string, languageCode: AppLanguageCode) {
  const date = new Date(value);
  const locale = languageCode === "en" ? "en-US" : "es-CO";
  const time = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  const day = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);

  return `${time} | ${day}`;
}

function formatUnits(quantity: number, languageCode: AppLanguageCode) {
  const normalizedQuantity = Number(quantity) || 0;

  if (languageCode === "en") {
    return `${normalizedQuantity} ${
      normalizedQuantity === 1 ? "unit" : "units"
    }`;
  }

  return `${normalizedQuantity} ${
    normalizedQuantity === 1 ? "Unidad" : "Unidades"
  }`;
}

export function QuotationDetailDrawer({
  languageCode,
  quotation,
  isOpen,
  isLoading,
  isWorking,
  onClose,
  onDelete,
  onConvert,
  onDownload,
  onPrint,
}: QuotationDetailDrawerProps) {
  const copy = getQuotesCopy(languageCode);
  const canDelete =
    quotation &&
    (quotation.status === "DRAFT" || quotation.status === "REJECTED");
  const discountPercentage = quotation ? getDiscountPercentage(quotation) : 0;

  return (
    <CashRegisterRetailDrawer
      bodyClassName={styles.body}
      footer={
        quotation ? (
          <div className={styles.footerActions}>
            <div className={styles.documentActions}>
              <button disabled={isWorking} type="button" onClick={() => void onPrint()}>
                <Printer size={18} strokeWidth={2.4} />
                {copy.detailPrint}
              </button>
              <button
                disabled={isWorking}
                type="button"
                onClick={() => void onDownload()}
              >
                <Download size={18} strokeWidth={2.4} />
                {copy.detailDownload}
              </button>
            </div>

            {quotation.canConvert ? (
              <button
                className={styles.convertButton}
                disabled={isWorking}
                type="button"
                onClick={onConvert}
              >
                <ReceiptText size={17} strokeWidth={2.4} />
                {copy.detailConvert}
              </button>
            ) : null}

            {canDelete ? (
              <button
                className={styles.deleteButton}
                disabled={isWorking}
                type="button"
                onClick={() => void onDelete()}
              >
                {copy.detailDelete}
              </button>
            ) : null}
          </div>
        ) : undefined
      }
      footerClassName={styles.drawerFooter}
      isOpen={isOpen}
      title={copy.detailTitle}
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
          <section className={styles.headerBlock}>
            <div className={styles.infoBlock}>
              <strong>{copy.detailValidity}</strong>
              <span className={styles.iconLine}>
                <CalendarDays size={17} strokeWidth={2.3} />
                {formatQuotationDate(quotation.validUntil, languageCode)}
              </span>
            </div>

            <div className={styles.infoBlock}>
              <strong>{copy.conceptLabel}</strong>
              <span>{quotation.concept ?? copy.noConcept}</span>
            </div>

            <div className={styles.totalBlock}>
              <strong>{copy.grandTotal}</strong>
              <span>{formatQuotationCurrency(quotation.total, languageCode)}</span>
            </div>
          </section>

          <section className={styles.metricsBlock}>
            <div className={styles.metricRow}>
              <span>
                <Percent size={17} strokeWidth={2.3} />
                {copy.detailDiscountPercent.replace(
                  "{percent}",
                  discountPercentage.toString(),
                )}
              </span>
              <strong>
                {formatQuotationCurrency(quotation.discountTotal, languageCode)}
              </strong>
            </div>
            <div className={styles.metricRow}>
              <span>
                <CircleDollarSign size={17} strokeWidth={2.3} />
                {copy.grandTotal}
              </span>
              <strong className={styles.greenValue}>
                {formatQuotationCurrency(quotation.total, languageCode)}
              </strong>
            </div>
          </section>

          <section className={styles.metaBlock}>
            <div className={styles.metaRow}>
              <span>
                <CalendarDays size={17} strokeWidth={2.3} />
                {copy.detailCreatedAt}
              </span>
              <strong>
                {formatDrawerDateTime(quotation.createdAt, languageCode)}
              </strong>
            </div>
            <div className={styles.metaRow}>
              <span>
                <UserRound size={17} strokeWidth={2.3} />
                {copy.detailCustomer}
              </span>
              <strong>{quotation.customer?.name ?? copy.noCustomer}</strong>
            </div>
            <div className={styles.metaRow}>
              <span>
                <UsersRound size={17} strokeWidth={2.3} />
                {copy.detailCreator}
              </span>
              <strong>{quotation.creatorName ?? "—"}</strong>
            </div>
            <div className={styles.metaRow}>
              <span>
                <FileText size={17} strokeWidth={2.3} />
                {copy.detailReferences}
              </span>
              <strong>{quotation.itemCount.toString()}</strong>
            </div>
          </section>

          <section className={styles.itemsBlock}>
            <h4>{copy.detailItems}</h4>
            <div className={styles.itemsList}>
              {quotation.items.map((item) => (
                <article className={styles.itemRow} key={item.id}>
                  <span className={styles.itemThumb} aria-hidden="true">
                    <Package size={20} strokeWidth={2.2} />
                  </span>
                  <div className={styles.itemCopy}>
                    <strong>{item.name}</strong>
                    <span>
                      {formatUnits(item.quantity, languageCode)}
                      {item.productCode ? ` · ${item.productCode}` : ""}
                    </span>
                  </div>
                  <div className={styles.itemTotals}>
                    <strong>
                      {formatQuotationCurrency(item.total, languageCode)}
                    </strong>
                    <span>
                      {formatQuotationCurrency(item.unitPrice, languageCode)}
                      {" x "}
                      {formatUnits(item.quantity, languageCode)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </CashRegisterRetailDrawer>
  );
}
