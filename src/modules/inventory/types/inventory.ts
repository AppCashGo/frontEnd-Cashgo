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
  performedByUser: {
    id: string;
    name: string;
    email: string;
  } | null;
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
  targetDate: string;
  method: 'WEEKDAY_WEIGHTED';
  generatedAt: string;
  products: Array<{
    productId: string;
    name: string;
    stock: number;
    soldUnits: number;
    averageDailySales: number;
    generalAverageDailySales: number;
    weekdayAverageDailySales: number;
    forecastDemand: number;
    comparableDays: number;
    historicalWasteUnits: number;
    wasteRatePercent: number;
    wasteBuffer: number;
    safetyStock: number;
    pendingDemand: number;
    targetStock: number;
    suggestedProduction: number;
    hasRecipe: boolean;
    confidence: 'LOW' | 'MEDIUM' | 'HIGH';
    strategy: 'WEEKDAY_WEIGHTED' | 'GENERAL_AVERAGE';
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

export type BakeryDailyProductStatus =
  | 'NO_ACTIVITY'
  | 'BALANCED'
  | 'SELLING_WELL'
  | 'OVERPRODUCTION'
  | 'WASTE_ALERT'
  | 'SOLD_FROM_STOCK';

export type BakeryDailySummary = {
  date: string;
  generatedAt: string;
  totals: {
    produced: number;
    sold: number;
    returned: number;
    waste: number;
    netDailyFlow: number;
    wasteRate: number;
  };
  products: Array<{
    productId: string;
    name: string;
    produced: number;
    sold: number;
    returned: number;
    waste: number;
    stock: number;
    netDailyFlow: number;
    wasteRate: number;
    salesVsProductionRate: number | null;
    status: BakeryDailyProductStatus;
  }>;
};

export type BakeryCostStatus =
  | 'NO_RECIPE'
  | 'NO_COST'
  | 'BELOW_COST'
  | 'LOW_MARGIN'
  | 'HEALTHY';

export type BakeryCostAnalysis = {
  historyDays: number;
  generatedAt: string;
  totals: {
    estimatedRevenue: number;
    estimatedGrossProfit: number;
    estimatedWasteCost: number;
    soldUnits: number;
    averageMarginPercent: number;
  };
  products: Array<{
    productId: string;
    name: string;
    inventoryBehavior: Product['inventoryBehavior'];
    hasRecipe: boolean;
    price: number;
    registeredUnitCost: number;
    recipeUnitCost: number | null;
    unitCost: number;
    marginValue: number;
    marginPercent: number;
    soldUnits: number;
    estimatedRevenue: number;
    estimatedGrossProfit: number;
    wasteUnits: number;
    estimatedWasteCost: number;
    costHistory: Array<{
      ingredientId: string;
      ingredientName: string;
      supplierId: string;
      supplierName: string;
      purchaseDate: string;
      unitCost: number;
      previousUnitCost: number | null;
      changePercent: number | null;
    }>;
    supplierCosts: Array<{
      ingredientId: string;
      ingredientName: string;
      supplierId: string;
      supplierName: string;
      latestUnitCost: number;
      averageUnitCost: number;
      purchaseCount: number;
    }>;
    yieldPerformance: {
      expectedYield: number | null;
      actualAverageYield: number | null;
      variancePercent: number | null;
      batches: number;
    };
    status: BakeryCostStatus;
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
  reason: 'LOW_STOCK' | 'PRODUCTION_PLAN' | 'SALES_VELOCITY';
  historyDays: number;
  coverageDays: number;
  averageDailyUsage: number;
  daysOfStock: number | null;
  targetStock: number;
  safetyStock: number;
  pendingPurchaseQuantity: number;
  estimatedCost: number;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  coverageStatus: 'ORDER_REQUIRED' | 'COVERED_BY_ORDER';
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
