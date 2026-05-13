import { CheckCircle2, Download, Printer, Share2 } from "lucide-react";
import { CashRegisterRetailDrawer } from "@/modules/cash-register/components/CashRegisterRetailDrawer";
import { getQuotesCopy } from "@/modules/quotes/i18n/quotes-copy";
import type { QuotationDetail } from "@/modules/quotes/types/quotation";
import type { AppLanguageCode } from "@/shared/i18n/app-dictionary";
import styles from "./QuotationCreatedDrawer.module.css";

type QuotationCreatedDrawerProps = {
  isOpen: boolean;
  isLoading: boolean;
  isWorking: boolean;
  languageCode: AppLanguageCode;
  quotation: QuotationDetail | null;
  onClose: () => void;
  onDownload: () => void;
  onPrint: () => void;
  onShare: () => void;
};

export function QuotationCreatedDrawer({
  isOpen,
  isLoading,
  isWorking,
  languageCode,
  quotation,
  onClose,
  onDownload,
  onPrint,
  onShare,
}: QuotationCreatedDrawerProps) {
  const copy = getQuotesCopy(languageCode);
  const isActionDisabled = isWorking || !quotation;

  return (
    <CashRegisterRetailDrawer
      bodyClassName={styles.body}
      isOpen={isOpen}
      title=""
      onClose={onClose}
    >
      {isLoading || !quotation ? (
        <div className={styles.loadingPanel}>{copy.loadingCreate}</div>
      ) : (
        <>
          <section className={styles.successPanel}>
            <CheckCircle2
              aria-hidden="true"
              className={styles.successIcon}
              size={64}
              strokeWidth={2.4}
            />
            <h3>{copy.successTitle}</h3>
            <p>{copy.successDescription}</p>
          </section>

          <section className={styles.receiptCard}>
            <strong>{copy.receiptTitle}</strong>
            <span>{copy.receiptDescription}</span>

            <div className={styles.receiptActions}>
              <button
                disabled={isActionDisabled}
                type="button"
                onClick={onPrint}
              >
                <Printer size={18} strokeWidth={2.4} />
                {copy.printReceipt}
              </button>
              <button
                disabled={isActionDisabled}
                type="button"
                onClick={onDownload}
              >
                <Download size={18} strokeWidth={2.4} />
                {copy.downloadReceipt}
              </button>
              <button
                disabled={isActionDisabled}
                type="button"
                onClick={onShare}
              >
                <Share2 size={18} strokeWidth={2.4} />
                {copy.shareReceipt}
              </button>
            </div>
          </section>
        </>
      )}
    </CashRegisterRetailDrawer>
  );
}
