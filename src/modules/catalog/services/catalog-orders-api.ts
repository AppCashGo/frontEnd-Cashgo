import { getJson, postFormData, postJson } from "@/shared/services/api-client";
import type {
  CatalogOrder,
  CreateCatalogOrderPayload,
  ReviewCatalogOrderPayload,
} from "../types/catalog-order";
import { notifyCustomerSessionExpired } from "./customer-session-expiration";

function customerOptions(slug: string, accessToken: string) {
  return {
    accessToken,
    businessId: "",
    handleGlobalAuthFailure: false,
    onUnauthorized: () => notifyCustomerSessionExpired(slug),
  };
}

export function reportCatalogManualPayment(
  slug: string,
  orderId: number,
  file: File,
  accessToken: string,
) {
  const formData = new FormData();
  formData.append("file", file);
  return postFormData<CatalogOrder>(
    `/catalog-orders/customer/${encodeURIComponent(slug)}/${orderId}/manual-payment`,
    formData,
    customerOptions(slug, accessToken),
  );
}

export function createCatalogOrder(
  slug: string,
  accessToken: string,
  payload: CreateCatalogOrderPayload,
) {
  return postJson<CatalogOrder, CreateCatalogOrderPayload>(
    `/catalog-orders/customer/${encodeURIComponent(slug)}`,
    payload,
    customerOptions(slug, accessToken),
  );
}

export function getCustomerCatalogOrders(slug: string, accessToken: string) {
  return getJson<CatalogOrder[]>(
    `/catalog-orders/customer/${encodeURIComponent(slug)}`,
    customerOptions(slug, accessToken),
  );
}

export function reviewCatalogOrder(
  slug: string,
  orderId: number,
  input: ReviewCatalogOrderPayload,
  accessToken: string,
) {
  return postJson<CatalogOrder, ReviewCatalogOrderPayload>(
    `/catalog-orders/customer/${encodeURIComponent(slug)}/${orderId}/review`,
    input,
    customerOptions(slug, accessToken),
  );
}
