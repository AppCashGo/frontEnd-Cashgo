import { useEffect, useMemo, useState } from "react";
import {
  businessCategoryOptions,
  type BusinessCategoryOption,
} from "@/shared/constants/business-categories";
import { useAppTranslation } from "@/shared/i18n/use-app-translation";
import { joinClassNames } from "@/shared/utils/join-class-names";
import { BusinessCategoryIcon } from "./business-category-icons";
import styles from "./BusinessCategoryPickerModal.module.css";

type BusinessCategoryPickerModalProps = {
  isOpen: boolean;
  selectedCategory?: string | null;
  variant?: "default" | "auth";
  showSearch?: boolean;
  showDescription?: boolean;
  requireConfirmation?: boolean;
  onClose: () => void;
  onSelectCategory: (category: BusinessCategoryOption) => void;
};

export function BusinessCategoryPickerModal({
  isOpen,
  selectedCategory,
  variant = "default",
  showSearch = true,
  showDescription = true,
  requireConfirmation = false,
  onClose,
  onSelectCategory,
}: BusinessCategoryPickerModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingCategory, setPendingCategory] = useState<string | null>(
    selectedCategory ?? null,
  );
  const { dictionary } = useAppTranslation();

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
    }
  }, [isOpen]);

  useEffect(() => {
    setPendingCategory(selectedCategory ?? null);
  }, [selectedCategory, isOpen]);

  const visibleCategories = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (normalizedSearch.length === 0) {
      return businessCategoryOptions;
    }

    return businessCategoryOptions.filter((category) =>
      dictionary.categories[category].toLowerCase().includes(normalizedSearch),
    );
  }, [dictionary.categories, searchTerm]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.modalBackdrop} role="presentation" onClick={onClose}>
      <div
        aria-modal="true"
        className={
          variant === "auth"
            ? `${styles.modal} ${styles.modalAuth}`
            : styles.modal
        }
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div className={styles.modalCopy}>
            <h3 className={styles.modalTitle}>
              {dictionary.auth.categories.title}
            </h3>
            {showDescription ? (
              <p className={styles.modalDescription}>
                {dictionary.auth.categories.description}
              </p>
            ) : null}
          </div>

          <button
            aria-label={dictionary.common.close}
            className={
              variant === "auth"
                ? `${styles.modalClose} ${styles.modalCloseIconOnly}`
                : styles.modalClose
            }
            type="button"
            onClick={onClose}
          >
            {variant === "auth" ? "×" : dictionary.common.close}
          </button>
        </div>

        {showSearch ? (
          <label className={styles.searchField}>
            <span className={styles.searchLabel}>{dictionary.common.search}</span>
            <div className={styles.searchInputWrap}>
              <svg
                aria-hidden="true"
                className={styles.searchIcon}
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.9"
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4 4" />
              </svg>
              <input
                autoFocus
                className={styles.searchInput}
                placeholder={dictionary.auth.categories.searchPlaceholder}
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </label>
        ) : null}

        <div
          className={
            variant === "auth"
              ? `${styles.categoryList} ${styles.categoryListAuth}`
              : styles.categoryList
          }
          role="listbox"
        >
          {visibleCategories.map((category) => (
            <button
              aria-selected={
                requireConfirmation
                  ? pendingCategory === category
                  : selectedCategory === category
              }
              key={category}
              className={joinClassNames(
                styles.categoryItem,
                variant === "auth" && styles.categoryItemAuth,
                (requireConfirmation
                  ? pendingCategory === category
                  : selectedCategory === category) && styles.categoryItemSelected,
              )}
              role="option"
              type="button"
              onClick={() => {
                if (requireConfirmation) {
                  setPendingCategory(category);
                  return;
                }

                onSelectCategory(category);
              }}
            >
              <span className={styles.categoryIconWrap}>
                <BusinessCategoryIcon
                  category={category}
                  className={styles.categoryIcon}
                />
              </span>
              <span className={styles.categoryLabel}>
                {dictionary.categories[category]}
              </span>
              <span className={styles.categoryRadio}>
                {(requireConfirmation
                  ? pendingCategory === category
                  : selectedCategory === category) ? (
                  <svg
                    aria-hidden="true"
                    className={styles.categoryCheck}
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.2"
                    viewBox="0 0 24 24"
                  >
                    <path d="m7 12 3 3 7-7" />
                  </svg>
                ) : null}
              </span>
            </button>
          ))}

          {visibleCategories.length === 0 ? (
            <div className={styles.emptyState}>
              {dictionary.common.noResults}
            </div>
          ) : null}
        </div>

        {requireConfirmation ? (
          <div className={styles.confirmFooter}>
            <button
              className={styles.confirmButton}
              disabled={!pendingCategory}
              type="button"
              onClick={() => {
                if (pendingCategory) {
                  onSelectCategory(pendingCategory as BusinessCategoryOption);
                }
              }}
            >
              {dictionary.common.confirm}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
