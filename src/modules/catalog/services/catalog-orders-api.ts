import { getJson, postJson } from "@/shared/services/api-client";
import type {
  CatalogOrder,
  CreateCatalogOrderPayload,
} from "../types/catalog-order";

function customerOptions(accessToken: string) {
  return {
    accessToken,
    businessId: "",
    handleGlobalAuthFailure: false,
  };
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
