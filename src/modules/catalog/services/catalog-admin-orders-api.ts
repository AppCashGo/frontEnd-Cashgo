import { getJson, patchJson } from "@/shared/services/api-client";
import type { CatalogOrder, CatalogOrderStatus } from "../types/catalog-order";

export function getBusinessCatalogOrders() {
  return getJson<CatalogOrder[]>("/catalog-orders");
}

export type BusinessCatalogReview = {
  id: number;
  rating: number;
  comment: string | null;
  updatedAt: string;
  customer: {
    id: number;
    name: string;
    avatarUrl: string | null;
  };
  order: {
    id: number;
    orderNumber: string;
    productReviews: Array<{
      id: number;
      rating: number;
      comment: string | null;
      product: { id: number; name: string };
    }>;
  };
};

export function getBusinessCatalogReviews() {
  return getJson<BusinessCatalogReview[]>("/catalog-orders/reviews");
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

export function reviewBusinessCatalogManualPayment(
  orderId: number,
  approved: boolean,
  note?: string,
) {
  return patchJson<CatalogOrder, { approved: boolean; note?: string }>(
    `/catalog-orders/${orderId}/manual-payment`,
    { approved, note },
  );
}
