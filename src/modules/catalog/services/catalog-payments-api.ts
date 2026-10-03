import { getJson, postJson } from "@/shared/services/api-client";

export type CatalogPaymentConfiguration = {
  provider: string;
  enabled: boolean;
};

export type CatalogPaymentCheckout = {
  provider: string;
  checkoutUrl: string;
  attemptId: number;
  reference: string;
};

export function getCatalogPaymentConfiguration() {
  return getJson<CatalogPaymentConfiguration>("/catalog-payments/configuration", {
    accessToken: "",
    businessId: "",
    handleGlobalAuthFailure: false,
  });
}

export function createCatalogPaymentCheckout(
  slug: string,
  orderId: number,
  accessToken: string,
) {
  return postJson<CatalogPaymentCheckout, Record<string, never>>(
    `/catalog-payments/customer/${encodeURIComponent(slug)}/orders/${orderId}/checkout`,
    {},
    { accessToken, businessId: "", handleGlobalAuthFailure: false },
  );
}
