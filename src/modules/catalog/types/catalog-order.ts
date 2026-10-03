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
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
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
  contactName: string;
  email: string;
  phone: string;
  address?: string;
  instructions?: string;
  items: Array<{ productId: number; quantity: number }>;
};
