import { getJson, postFormData, postJson } from "@/shared/services/api-client";
import type {
  CatalogOrder,
  CreateCatalogOrderPayload,
  ReviewCatalogOrderPayload,
} from "../types/catalog-order";

function customerOptions(accessToken: string) {
  return {
    accessToken,
    businessId: "",
    handleGlobalAuthFailure: false,
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
    { accessToken, businessId: "", handleGlobalAuthFailure: false },
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
    customerOptions(accessToken),
  );
}

export function getCustomerCatalogOrders(slug: string, accessToken: string) {
  return getJson<CatalogOrder[]>(
    `/catalog-orders/customer/${encodeURIComponent(slug)}`,
    customerOptions(accessToken),
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
    customerOptions(accessToken),
  );
}
