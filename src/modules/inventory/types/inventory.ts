import type { Product } from "@/modules/products/types/product";

export const inventoryMovementTypes = [
  "INITIAL_STOCK",
  "IN",
  "OUT",
  "ADJUSTMENT",
  "SALE_OUT",
  "SALE_CANCELLED_IN",
  "RETURN_IN",
  "DAMAGED_OUT",
] as const;

export type InventoryMovementType = (typeof inventoryMovementTypes)[number];
export type InventoryMovementFilterType = "ALL" | InventoryMovementType;
export type InventoryReferenceType = "MANUAL" | "SALE" | "PURCHASE" | "RETURN";
export const manualInventoryAdjustmentTypes = [
  "IN",
  "OUT",
  "ADJUSTMENT",
] as const;
export type ManualInventoryAdjustmentType =
  (typeof manualInventoryAdjustmentTypes)[number];

export type InventoryMovement = {
  id: string;
  productId: string;
  type: InventoryMovementType;
  referenceType: InventoryReferenceType | null;
  referenceId: string | null;
  performedByUserId: string | null;
  quantity: number;
  previousStock: number;
  newStock: number;
  unitCost: number | null;
  reason: string | null;
  notes: string | null;
  createdAt: string;
  product: Product;
};

export type InventoryAdjustmentInput = {
  productId: string;
  type: ManualInventoryAdjustmentType;
  quantity: number;
  reason?: string;
};

export type InventoryProductCategory = {
  id: string;
  businessId: string;
  name: string;
  isVisibleInCatalog: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type InventoryProductCategoryInput = {
  name: string;
  isVisibleInCatalog: boolean;
  productIds: string[];
};

export type InventoryProductTaxesInput = {
  productIds: string[];
  taxLabel?: string;
  taxRate: number;
};

export type InventoryProductTaxesResult = {
  updatedCount: number;
};

export type InventoryPurchaseInput = {
  productId: string;
  quantity: number;
  unitCost: number;
  reason?: string;
};

export type InventoryExportFilters = {
  search?: string;
  categoryId?: string;
  lowStockOnly?: boolean;
};

export type InventoryLowStockAlert = {
  productId: string;
  name: string;
  stock: number;
  threshold: number;
};

export type InventoryMovementFilters = {
  type: InventoryMovementFilterType;
  startDate: string;
  endDate: string;
};
