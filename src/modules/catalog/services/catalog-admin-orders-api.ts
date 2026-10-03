import { getJson, patchJson } from "@/shared/services/api-client";
import type { CatalogOrder, CatalogOrderStatus } from "../types/catalog-order";

export function getBusinessCatalogOrders() {
  return getJson<CatalogOrder[]>("/catalog-orders");
}

export function updateBusinessCatalogOrderStatus(
  orderId: number,
  status: CatalogOrderStatus,
) {
  return patchJson<CatalogOrder, { status: CatalogOrderStatus }>(
    `/catalog-orders/${orderId}/status`,
    { status },
  );
}
