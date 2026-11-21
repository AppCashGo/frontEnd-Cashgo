import { CheckCircle2, Download, Printer, Share2 } from "lucide-react";
import { CashRegisterRetailDrawer } from "@/modules/cash-register/components/CashRegisterRetailDrawer";
import { getQuotesCopy } from "@/modules/quotes/i18n/quotes-copy";
import type { QuotationDetail } from "@/modules/quotes/types/quotation";
import type { AppLanguageCode } from "@/shared/i18n/app-dictionary";
import { AppButton } from "@/shared/components/ui/AppButton";
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
              <AppButton
                disabled={isActionDisabled}
                startIcon={<Printer size={18} strokeWidth={2.4} />}
                type="button"
                variant="outline"
                onClick={onPrint}
              >
                {copy.printReceipt}
              </AppButton>
              <AppButton
                disabled={isActionDisabled}
                startIcon={<Download size={18} strokeWidth={2.4} />}
                type="button"
                variant="secondary"
                onClick={onDownload}
              >
                {copy.downloadReceipt}
              </AppButton>
              <AppButton
                disabled={isActionDisabled}
                startIcon={<Share2 size={18} strokeWidth={2.4} />}
                type="button"
                variant="success"
                onClick={onShare}
              >
                {copy.shareReceipt}
              </AppButton>
            </div>
          </section>
        </>
      )}
    </CashRegisterRetailDrawer>
  );
}
