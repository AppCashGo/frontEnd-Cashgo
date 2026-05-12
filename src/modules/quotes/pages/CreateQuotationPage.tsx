import { ArrowLeft, ChevronRight, ListChecks, ShoppingCart } from "lucide-react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useCustomersQuery } from "@/modules/customers/hooks/use-customers-query";
import { useProductsQuery } from "@/modules/products/hooks/use-products-query";
import { QuotationFormWorkspace } from "@/modules/quotes/components/QuotationFormWorkspace";
import { getQuotesCopy } from "@/modules/quotes/i18n/quotes-copy";
import { useCreateQuotationMutation } from "@/modules/quotes/hooks/use-quotations-query";
import type { QuotationCreationMode } from "@/modules/quotes/components/QuotationFormWorkspace";
import type { CreateQuotationInput } from "@/modules/quotes/types/quotation";
import { routePaths } from "@/routes/route-paths";
import { useAppTranslation } from "@/shared/i18n/use-app-translation";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import styles from "./CreateQuotationPage.module.css";

function isQuotationCreationMode(
  mode: string | undefined,
): mode is QuotationCreationMode {
  return mode === "products" || mode === "free";
}

export function CreateQuotationPage() {
  const { mode } = useParams<{ mode?: string }>();
  const navigate = useNavigate();
  const { languageCode } = useAppTranslation();
  const copy = getQuotesCopy(languageCode);
  const selectedMode = isQuotationCreationMode(mode) ? mode : null;
  const customersQuery = useCustomersQuery();
  const productsQuery = useProductsQuery();
  const createMutation = useCreateQuotationMutation();
  const customers = customersQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const hasLoadError = customersQuery.isError || productsQuery.isError;
  const loadError = customersQuery.error ?? productsQuery.error;

  async function handleCreateQuotation(input: CreateQuotationInput) {
    return createMutation.mutateAsync(input);
  }

  if (mode && !selectedMode) {
    return <Navigate replace to={routePaths.quoteNew} />;
  }

  if (!selectedMode) {
    return (
      <div className={styles.page}>
        <div className={styles.topbar}>
          <Link className={styles.backButton} to={routePaths.quotes}>
            <ArrowLeft size={18} strokeWidth={2.6} />
            {copy.backToQuotes}
          </Link>
        </div>

        <section className={styles.modeHero}>
          <h2>{copy.createTitle}</h2>
          <p>{copy.drawerDescription}</p>
        </section>

        <section className={styles.modeGrid} aria-label={copy.createTitle}>
          <Link className={styles.modeCard} to={routePaths.quoteNewProducts}>
            <span className={styles.modeIcon} aria-hidden="true">
              <ShoppingCart size={22} strokeWidth={2.4} />
            </span>
            <span className={styles.modeCopy}>
              <strong>{copy.createWithProductsTitle}</strong>
              <span>{copy.createWithProductsDescription}</span>
            </span>
            <ChevronRight size={20} strokeWidth={2.4} aria-hidden="true" />
          </Link>

          <Link className={styles.modeCard} to={routePaths.quoteNewFree}>
            <span className={styles.modeIcon} aria-hidden="true">
              <ListChecks size={22} strokeWidth={2.4} />
            </span>
            <span className={styles.modeCopy}>
              <strong>{copy.createFreeTitle}</strong>
              <span>{copy.createFreeDescription}</span>
            </span>
            <ChevronRight size={20} strokeWidth={2.4} aria-hidden="true" />
          </Link>
        </section>
      </div>
    );
  }

  if (customersQuery.isPending || productsQuery.isPending) {
    return (
      <section className={styles.feedbackPanel}>
        <strong>{copy.createTitle}</strong>
        <span>{copy.loadingCreate}</span>
      </section>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <Link className={styles.backButton} to={routePaths.quoteNew}>
          <ArrowLeft size={18} strokeWidth={2.6} />
          {copy.createTitle}
        </Link>
      </div>

      {hasLoadError ? (
        <div className={styles.errorBanner}>
          {getErrorMessage(loadError, copy.actionError)}
        </div>
      ) : null}

      <QuotationFormWorkspace
        customers={customers}
        initialMode={selectedMode}
        isSubmitting={createMutation.isPending}
        languageCode={languageCode}
        presentation="page"
        products={products}
        quotation={null}
        onClose={() => navigate(routePaths.quotes)}
        onSubmit={handleCreateQuotation}
      />
    </div>
  );
}
