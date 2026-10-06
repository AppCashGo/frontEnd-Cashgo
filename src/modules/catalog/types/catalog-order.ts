export type CatalogOrderStatus =
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export type CatalogOrder = {
  id: number;
  orderNumber: string;
  status: CatalogOrderStatus;
  fulfillmentMethod: "PICKUP" | "DELIVERY";
  paymentStatus: "PENDING" | "REPORTED" | "PAID" | "FAILED" | "REFUNDED";
  paymentMethod:
    | "MANUAL_TRANSFER"
    | "PAY_ON_FULFILLMENT"
    | "ONLINE_GATEWAY";
  saleId: number | null;
  manualPaymentProofUrl: string | null;
  manualPaymentReportedAt: string | null;
  manualPaymentReviewedAt: string | null;
  manualPaymentReviewNote: string | null;
  contactName: string;
  email: string;
  phone: string;
  address: string | null;
  instructions: string;
  subtotal: number | string;
  deliveryFee: number | string;
  total: number | string;
  statusUpdatedAt: string;
  createdAt: string;
  items: CatalogOrderItem[];
  productReviews: CatalogProductReview[];
  serviceReview: CatalogServiceReview | null;
};

export type CatalogProductReview = {
  id: number;
  productId: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CatalogServiceReview = {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReviewCatalogOrderPayload = {
  serviceRating: number;
  serviceComment?: string;
  products: Array<{
    productId: number;
    rating: number;
    comment?: string;
  }>;
};

export type CatalogOrderItem = {
  id: number;
  productId: number | null;
  productName: string;
  unitPrice: number | string;
  quantity: number;
  lineTotal: number | string;
  imageUrl: string | null;
};

export type CreateCatalogOrderPayload = {
  fulfillmentMethod: "PICKUP" | "DELIVERY";
  paymentMethod: "MANUAL_TRANSFER" | "PAY_ON_FULFILLMENT";
  contactName: string;
  email: string;
  phone: string;
  address?: string;
  instructions?: string;
  items: Array<{ productId: number; quantity: number }>;
};
