import type { Product } from "@/modules/products/types/product";
import type {
  ExpensePaymentMethod,
  ExpenseStatus,
} from "@/modules/expenses/types/expense";
import type { PaymentFundSource } from "@/modules/cash-register/types/cash-register";

export const inventoryMovementTypes = [
  "INITIAL_STOCK",
  "IN",
  "OUT",
  "ADJUSTMENT",
  "PRODUCTION_IN",
  "WASTE_OUT",
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

export type InventoryOperationInput = {
  items: Array<{ productId: string; quantity: number }>;
  reason?: string;
};

export type InventoryOperationResult = {
  affectedProducts: number;
  totalUnits: number;
  ingredientsConsumed?: number;
  ingredientUnitsConsumed?: number;
};

export type ProductRecipeIngredient = {
  id: string;
  productId: string;
  quantity: number;
  product: Product;
};

export type ProductRecipe = {
  id: string;
  productId: string;
  yieldQuantity: number;
  product: Product;
  ingredients: ProductRecipeIngredient[];
  createdAt: string;
  updatedAt: string;
};

export type ProductRecipeInput = {
  yieldQuantity: number;
  ingredients: Array<{ productId: string; quantity: number }>;
};

export type ProductionPlan = {
  historyDays: number;
  coverageDays: number;
  generatedAt: string;
  products: Array<{
    productId: string;
    name: string;
    stock: number;
    soldUnits: number;
    averageDailySales: number;
    targetStock: number;
    suggestedProduction: number;
    hasRecipe: boolean;
  }>;
  ingredients: Array<{
    productId: string;
    name: string;
    unit: Product['unit'];
    stock: number;
    required: number;
    missing: number;
  }>;
};

export type InventoryCountInput = {
  items: Array<{
    productId: string;
    countedStock: number;
  }>;
  reason?: string;
};

export type InventoryCountResult = {
  countedCount: number;
  adjustedCount: number;
  unchangedCount: number;
  totalDifference: number;
  adjustments: Array<{
    productId: string;
    productName: string;
    previousStock: number;
    countedStock: number;
    difference: number;
  }>;
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
  purchaseOrderId?: string;
  productId?: string;
  supplierId: string;
  quantity?: number;
  unitCost?: number;
  items?: Array<{
    productId: string;
    quantity: number;
    unitCost: number;
  }>;
  reference?: string;
  paymentMethod?: ExpensePaymentMethod;
  fundSource?: PaymentFundSource;
  status?: Exclude<ExpenseStatus, "CANCELLED">;
  amountPaid?: number;
  purchaseDate?: string;
  dueDate?: string;
  reason?: string;
};

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'ORDERED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED';

export type PurchaseOrder = {
  id: string;
  supplierId: string;
  status: PurchaseOrderStatus;
  reference: string | null;
  expectedDate: string | null;
  orderedAt: string | null;
  receivedAt: string | null;
  cancelledAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  supplier: { id: string; name: string };
  items: Array<{
    id: string;
    productId: string;
    orderedQuantity: number;
    receivedQuantity: number;
    unitCost: number;
    product: Product;
  }>;
  purchases: Array<{
    id: string;
    total: number;
    purchaseDate: string;
    status: ExpenseStatus;
  }>;
};

export type PurchaseOrderInput = {
  supplierId: string;
  reference?: string;
  expectedDate?: string;
  notes?: string;
  items: Array<{ productId: string; quantity: number; unitCost: number }>;
};

export type ReplenishmentSuggestion = {
  productId: string;
  name: string;
  unit: Product['unit'];
  stock: number;
  unitCost: number;
  suggestedQuantity: number;
  reason: 'LOW_STOCK' | 'PRODUCTION_PLAN';
};

export type InventoryPurchaseResult = {
  id: string;
  supplierId: string;
  total: number | string;
  paidAmount: number | string;
  balance: number | string;
  status: ExpenseStatus;
  invoiceImageUrl?: string | null;
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
