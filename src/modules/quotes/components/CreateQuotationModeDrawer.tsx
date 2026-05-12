import { ChevronRight, ListChecks, ShoppingCart } from "lucide-react";
import { CashRegisterRetailDrawer } from "@/modules/cash-register/components/CashRegisterRetailDrawer";
import { getQuotesCopy } from "@/modules/quotes/i18n/quotes-copy";
import type { QuotationCreationMode } from "@/modules/quotes/components/CreateQuotationDrawer";
import type { AppLanguageCode } from "@/shared/i18n/app-dictionary";
import styles from "./CreateQuotationModeDrawer.module.css";

type CreateQuotationModeDrawerProps = {
  isOpen: boolean;
  languageCode: AppLanguageCode;
  onClose: () => void;
  onSelectMode: (mode: QuotationCreationMode) => void;
};

export function CreateQuotationModeDrawer({
  isOpen,
  languageCode,
  onClose,
  onSelectMode,
}: CreateQuotationModeDrawerProps) {
  const copy = getQuotesCopy(languageCode);

  return (
    <CashRegisterRetailDrawer
      bodyClassName={styles.body}
      isOpen={isOpen}
      title={copy.createTitle}
      onClose={onClose}
    >
      <div className={styles.options} role="list">
        <button
          className={styles.optionButton}
          type="button"
          onClick={() => onSelectMode("products")}
        >
          <span className={styles.optionIcon} aria-hidden="true">
            <ShoppingCart size={20} strokeWidth={2.4} />
          </span>
          <span className={styles.optionCopy}>
            <strong>{copy.createWithProductsTitle}</strong>
            <small>{copy.createWithProductsDescription}</small>
          </span>
          <ChevronRight size={20} strokeWidth={2.4} aria-hidden="true" />
        </button>

        <button
          className={styles.optionButton}
          type="button"
          onClick={() => onSelectMode("free")}
        >
          <span className={styles.optionIcon} aria-hidden="true">
            <ListChecks size={20} strokeWidth={2.4} />
          </span>
          <span className={styles.optionCopy}>
            <strong>{copy.createFreeTitle}</strong>
            <small>{copy.createFreeDescription}</small>
          </span>
          <ChevronRight size={20} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>
    </CashRegisterRetailDrawer>
  );
}
