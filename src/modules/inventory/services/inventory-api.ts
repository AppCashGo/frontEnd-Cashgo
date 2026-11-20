import {
  normalizeProductRecord,
  type ProductApiRecord,
} from "@/modules/products/utils/normalize-product-record";
import type {
  InventoryAdjustmentInput,
  InventoryCountInput,
  InventoryCountResult,
  InventoryExportFilters,
  InventoryLowStockAlert,
  InventoryMovement,
  InventoryMovementType,
  InventoryProductCategory,
  InventoryProductCategoryInput,
  InventoryProductTaxesInput,
  InventoryProductTaxesResult,
  InventoryPurchaseInput,
  InventoryPurchaseResult,
  InventoryReferenceType,
  InventoryOperationInput,
  InventoryOperationResult,
  ProductRecipe,
  ProductRecipeInput,
  ProductionPlan,
  PurchaseOrder,
  PurchaseOrderInput,
  ReplenishmentSuggestion,
  BakeryDailySummary,
  BakeryCostAnalysis,
} from "@/modules/inventory/types/inventory";
import {
  deleteJson,
  getBlob,
  getJson,
  patchFormData,
  patchJson,
  postJson,
  putJson,
} from "@/shared/services/api-client";
import { getAuthAccessToken } from "@/shared/services/auth-session";
import { normalizeId, normalizeOptionalId } from "@/shared/utils/normalize-id";
import { normalizeNumber } from "@/shared/utils/normalize-number";

type InventoryMovementApiRecord = Omit<
  InventoryMovement,
  | "id"
  | "productId"
  | "referenceId"
  | "performedByUserId"
  | "quantity"
  | "previousStock"
  | "newStock"
  | "unitCost"
  | "product"
  | "performedByUser"
  | "type"
  | "referenceType"
> & {
  id: number | string;
  productId: number | string;
  referenceId: number | string | null;
  performedByUserId: number | string | null;
  quantity: number | string;
  previousStock: number | string;
  newStock: number | string;
  unitCost: number | string | null;
  product: ProductApiRecord;
  performedByUser: {
    id: number | string;
    name: string;
    email: string;
  } | null;
  type: InventoryMovementType;
  referenceType: InventoryReferenceType | null;
};

type InventoryLowStockAlertApiRecord = Omit<
  InventoryLowStockAlert,
  "stock" | "threshold"
> & {
  stock: number | string;
  threshold: number | string;
};

type InventoryProductCategoryApiRecord = Omit<
  InventoryProductCategory,
  "id" | "businessId"
> & {
  id: number | string;
  businessId: number | string;
};

function buildInventoryExportQuery(filters: InventoryExportFilters) {
  const searchParams = new URLSearchParams();

  if (filters.search?.trim()) {
    searchParams.set("search", filters.search.trim());
  }

  if (filters.categoryId?.trim()) {
    searchParams.set("categoryId", filters.categoryId.trim());
  }

  if (filters.lowStockOnly) {
    searchParams.set("lowStockOnly", "true");
  }

  const queryString = searchParams.toString();

  return queryString.length > 0 ? `?${queryString}` : "";
}

function normalizeInventoryMovement(
  record: InventoryMovementApiRecord,
): InventoryMovement {
  return {
    ...record,
    id: normalizeId(record.id),
    productId: normalizeId(record.productId),
    quantity: normalizeNumber(record.quantity),
    previousStock: normalizeNumber(record.previousStock),
    newStock: normalizeNumber(record.newStock),
    unitCost:
      record.unitCost === null ? null : normalizeNumber(record.unitCost),
    referenceType: record.referenceType ?? null,
    referenceId: normalizeOptionalId(record.referenceId),
    performedByUserId: normalizeOptionalId(record.performedByUserId),
    performedByUser: record.performedByUser
      ? {
          ...record.performedByUser,
          id: normalizeId(record.performedByUser.id),
        }
      : null,
    reason: record.reason ?? null,
    notes: record.notes ?? null,
    product: normalizeProductRecord(record.product),
  };
}

function normalizeInventoryProductCategory(
  record: InventoryProductCategoryApiRecord,
): InventoryProductCategory {
  return {
    ...record,
    id: normalizeId(record.id),
    businessId: normalizeId(record.businessId),
  };
}

function normalizeInventoryLowStockAlert(
  record: InventoryLowStockAlertApiRecord,
): InventoryLowStockAlert {
  return {
    ...record,
    stock: normalizeNumber(record.stock),
    threshold: normalizeNumber(record.threshold),
  };
}

export async function getInventoryMovements() {
  const movements = await getJson<InventoryMovementApiRecord[]>(
    "/inventory/movements",
    {
      accessToken: getAuthAccessToken(),
    },
  );

  return movements.map(normalizeInventoryMovement);
}

export async function getInventoryLowStockAlerts() {
  const alerts = await getJson<InventoryLowStockAlertApiRecord[]>(
    "/inventory/low-stock",
    {
      accessToken: getAuthAccessToken(),
    },
  );

  return alerts.map(normalizeInventoryLowStockAlert);
}

export async function createInventoryAdjustment(
  input: InventoryAdjustmentInput,
) {
  const movement = await postJson<
    InventoryMovementApiRecord,
    InventoryAdjustmentInput
  >("/inventory/adjustment", input, {
    accessToken: getAuthAccessToken(),
  });

  return normalizeInventoryMovement(movement);
}

export function registerInventoryProduction(input: InventoryOperationInput) {
  return postJson<InventoryOperationResult, InventoryOperationInput>(
    "/inventory/production",
    input,
    { accessToken: getAuthAccessToken() },
  );
}

export function registerInventoryWaste(input: InventoryOperationInput) {
  return postJson<InventoryOperationResult, InventoryOperationInput>(
    "/inventory/waste",
    input,
    { accessToken: getAuthAccessToken() },
  );
}

type ProductRecipeApiRecord = Omit<
  ProductRecipe,
  "id" | "productId" | "yieldQuantity" | "product" | "ingredients"
> & {
  id: number | string;
  productId: number | string;
  yieldQuantity: number | string;
  product: ProductApiRecord;
  ingredients: Array<{
    id: number | string;
    productId: number | string;
    quantity: number | string;
    product: ProductApiRecord;
  }>;
};

function normalizeProductRecipe(record: ProductRecipeApiRecord): ProductRecipe {
  return {
    ...record,
    id: normalizeId(record.id),
    productId: normalizeId(record.productId),
    yieldQuantity: normalizeNumber(record.yieldQuantity),
    product: normalizeProductRecord(record.product),
    ingredients: record.ingredients.map((ingredient) => ({
      ...ingredient,
      id: normalizeId(ingredient.id),
      productId: normalizeId(ingredient.productId),
      quantity: normalizeNumber(ingredient.quantity),
      product: normalizeProductRecord(ingredient.product),
    })),
  };
}

export async function getProductRecipes() {
  const recipes = await getJson<ProductRecipeApiRecord[]>("/inventory/recipes", {
    accessToken: getAuthAccessToken(),
  });
  return recipes.map(normalizeProductRecipe);
}

export async function upsertProductRecipe(
  productId: string,
  input: ProductRecipeInput,
) {
  const recipe = await putJson<ProductRecipeApiRecord, ProductRecipeInput>(
    `/inventory/recipes/${productId}`,
    input,
    { accessToken: getAuthAccessToken() },
  );
  return normalizeProductRecipe(recipe);
}

export function deleteProductRecipe(productId: string) {
  return deleteJson<{ productId: number | string; deleted: boolean }>(
    `/inventory/recipes/${productId}`,
    { accessToken: getAuthAccessToken() },
  );
}

export async function getProductionPlan(coverageDays = 1) {
  const plan = await getJson<ProductionPlan>(
    `/inventory/production-plan?coverageDays=${coverageDays}`,
    { accessToken: getAuthAccessToken() },
  );
  return {
    ...plan,
    products: plan.products.map((product) => ({
      ...product,
      productId: normalizeId(product.productId),
      stock: normalizeNumber(product.stock),
      soldUnits: normalizeNumber(product.soldUnits),
      averageDailySales: normalizeNumber(product.averageDailySales),
      generalAverageDailySales: normalizeNumber(product.generalAverageDailySales),
      weekdayAverageDailySales: normalizeNumber(product.weekdayAverageDailySales),
      forecastDemand: normalizeNumber(product.forecastDemand),
      comparableDays: normalizeNumber(product.comparableDays),
      historicalWasteUnits: normalizeNumber(product.historicalWasteUnits),
      wasteRatePercent: normalizeNumber(product.wasteRatePercent),
      wasteBuffer: normalizeNumber(product.wasteBuffer),
      safetyStock: normalizeNumber(product.safetyStock),
      pendingDemand: normalizeNumber(product.pendingDemand),
      targetStock: normalizeNumber(product.targetStock),
      suggestedProduction: normalizeNumber(product.suggestedProduction),
    })),
    ingredients: plan.ingredients.map((ingredient) => ({
      ...ingredient,
      productId: normalizeId(ingredient.productId),
      stock: normalizeNumber(ingredient.stock),
      required: normalizeNumber(ingredient.required),
      missing: normalizeNumber(ingredient.missing),
    })),
  };
}

export async function getBakeryDailySummary(date: string) {
  const summary = await getJson<BakeryDailySummary>(
    `/inventory/bakery-daily-summary?date=${encodeURIComponent(date)}`,
    { accessToken: getAuthAccessToken() },
  );
  return {
    ...summary,
    totals: {
      produced: normalizeNumber(summary.totals.produced),
      sold: normalizeNumber(summary.totals.sold),
      returned: normalizeNumber(summary.totals.returned),
      waste: normalizeNumber(summary.totals.waste),
      netDailyFlow: normalizeNumber(summary.totals.netDailyFlow),
      wasteRate: normalizeNumber(summary.totals.wasteRate),
    },
    products: summary.products.map((product) => ({
      ...product,
      productId: normalizeId(product.productId),
      produced: normalizeNumber(product.produced),
      sold: normalizeNumber(product.sold),
      returned: normalizeNumber(product.returned),
      waste: normalizeNumber(product.waste),
      stock: normalizeNumber(product.stock),
      netDailyFlow: normalizeNumber(product.netDailyFlow),
      wasteRate: normalizeNumber(product.wasteRate),
      salesVsProductionRate:
        product.salesVsProductionRate === null
          ? null
          : normalizeNumber(product.salesVsProductionRate),
    })),
  };
}

export async function getBakeryCostAnalysis(historyDays = 7) {
  const analysis = await getJson<BakeryCostAnalysis>(
    `/inventory/bakery-cost-analysis?historyDays=${historyDays}`,
    { accessToken: getAuthAccessToken() },
  );
  return {
    ...analysis,
    historyDays: normalizeNumber(analysis.historyDays),
    totals: Object.fromEntries(
      Object.entries(analysis.totals).map(([key, value]) => [
        key,
        normalizeNumber(value),
      ]),
    ) as BakeryCostAnalysis['totals'],
    products: analysis.products.map((product) => ({
      ...product,
      productId: normalizeId(product.productId),
      price: normalizeNumber(product.price),
      registeredUnitCost: normalizeNumber(product.registeredUnitCost),
      recipeUnitCost:
        product.recipeUnitCost === null
          ? null
          : normalizeNumber(product.recipeUnitCost),
      unitCost: normalizeNumber(product.unitCost),
      marginValue: normalizeNumber(product.marginValue),
      marginPercent: normalizeNumber(product.marginPercent),
      soldUnits: normalizeNumber(product.soldUnits),
      estimatedRevenue: normalizeNumber(product.estimatedRevenue),
      estimatedGrossProfit: normalizeNumber(product.estimatedGrossProfit),
      wasteUnits: normalizeNumber(product.wasteUnits),
      estimatedWasteCost: normalizeNumber(product.estimatedWasteCost),
      costHistory: (product.costHistory ?? []).map((entry) => ({
        ...entry,
        ingredientId: normalizeId(entry.ingredientId),
        supplierId: normalizeId(entry.supplierId),
        unitCost: normalizeNumber(entry.unitCost),
        previousUnitCost:
          entry.previousUnitCost === null
            ? null
            : normalizeNumber(entry.previousUnitCost),
        changePercent:
          entry.changePercent === null
            ? null
            : normalizeNumber(entry.changePercent),
      })),
      supplierCosts: (product.supplierCosts ?? []).map((entry) => ({
        ...entry,
        ingredientId: normalizeId(entry.ingredientId),
        supplierId: normalizeId(entry.supplierId),
        latestUnitCost: normalizeNumber(entry.latestUnitCost),
        averageUnitCost: normalizeNumber(entry.averageUnitCost),
        purchaseCount: normalizeNumber(entry.purchaseCount),
      })),
      yieldPerformance: {
        expectedYield:
          product.yieldPerformance?.expectedYield === null ||
          product.yieldPerformance?.expectedYield === undefined
            ? null
            : normalizeNumber(product.yieldPerformance.expectedYield),
        actualAverageYield:
          product.yieldPerformance?.actualAverageYield === null ||
          product.yieldPerformance?.actualAverageYield === undefined
            ? null
            : normalizeNumber(product.yieldPerformance.actualAverageYield),
        variancePercent:
          product.yieldPerformance?.variancePercent === null ||
          product.yieldPerformance?.variancePercent === undefined
            ? null
            : normalizeNumber(product.yieldPerformance.variancePercent),
        batches: normalizeNumber(product.yieldPerformance?.batches),
      },
    })),
  };
}

type PurchaseOrderApiRecord = Omit<
  PurchaseOrder,
  'id' | 'supplierId' | 'supplier' | 'items' | 'purchases'
> & {
  id: number | string;
  supplierId: number | string;
  supplier: { id: number | string; name: string };
  items: Array<{
    id: number | string;
    productId: number | string;
    orderedQuantity: number | string;
    receivedQuantity: number | string;
    unitCost: number | string;
    product: ProductApiRecord;
  }>;
  purchases: Array<{
    id: number | string;
    total: number | string;
    purchaseDate: string;
    status: PurchaseOrder['purchases'][number]['status'];
  }>;
};

function normalizePurchaseOrder(record: PurchaseOrderApiRecord): PurchaseOrder {
  return {
    ...record,
    id: normalizeId(record.id),
    supplierId: normalizeId(record.supplierId),
    supplier: { ...record.supplier, id: normalizeId(record.supplier.id) },
    items: record.items.map((item) => ({
      ...item,
      id: normalizeId(item.id),
      productId: normalizeId(item.productId),
      orderedQuantity: normalizeNumber(item.orderedQuantity),
      receivedQuantity: normalizeNumber(item.receivedQuantity),
      unitCost: normalizeNumber(item.unitCost),
      product: normalizeProductRecord(item.product),
    })),
    purchases: record.purchases.map((purchase) => ({
      ...purchase,
      id: normalizeId(purchase.id),
      total: normalizeNumber(purchase.total),
    })),
  };
}

export async function getPurchaseOrders() {
  const records = await getJson<PurchaseOrderApiRecord[]>('/inventory/purchase-orders', {
    accessToken: getAuthAccessToken(),
  });
  return records.map(normalizePurchaseOrder);
}

export async function createPurchaseOrder(input: PurchaseOrderInput) {
  const record = await postJson<PurchaseOrderApiRecord, PurchaseOrderInput>(
    '/inventory/purchase-orders',
    input,
    { accessToken: getAuthAccessToken() },
  );
  return normalizePurchaseOrder(record);
}

export async function sendPurchaseOrder(orderId: string) {
  const record = await patchJson<PurchaseOrderApiRecord, Record<string, never>>(
    `/inventory/purchase-orders/${orderId}/send`,
    {},
    { accessToken: getAuthAccessToken() },
  );
  return normalizePurchaseOrder(record);
}

export async function cancelPurchaseOrder(orderId: string) {
  const record = await patchJson<PurchaseOrderApiRecord, Record<string, never>>(
    `/inventory/purchase-orders/${orderId}/cancel`,
    {},
    { accessToken: getAuthAccessToken() },
  );
  return normalizePurchaseOrder(record);
}

export async function getReplenishmentSuggestions() {
  const suggestions = await getJson<Array<Omit<ReplenishmentSuggestion, 'productId'> & { productId: string | number }>>(
    '/inventory/replenishment-suggestions',
    { accessToken: getAuthAccessToken() },
  );
  return suggestions.map((suggestion) => ({
    ...suggestion,
    productId: normalizeId(suggestion.productId),
    stock: normalizeNumber(suggestion.stock),
    unitCost: normalizeNumber(suggestion.unitCost),
    suggestedQuantity: normalizeNumber(suggestion.suggestedQuantity),
    historyDays: normalizeNumber(suggestion.historyDays),
    coverageDays: normalizeNumber(suggestion.coverageDays),
    averageDailyUsage: normalizeNumber(suggestion.averageDailyUsage),
    daysOfStock: suggestion.daysOfStock === null ? null : normalizeNumber(suggestion.daysOfStock),
    targetStock: normalizeNumber(suggestion.targetStock),
    safetyStock: normalizeNumber(suggestion.safetyStock),
    pendingPurchaseQuantity: normalizeNumber(suggestion.pendingPurchaseQuantity),
    estimatedCost: normalizeNumber(suggestion.estimatedCost),
  }));
}

export async function applyInventoryCount(input: InventoryCountInput) {
  const result = await postJson<InventoryCountResult, InventoryCountInput>(
    "/inventory/count",
    input,
    { accessToken: getAuthAccessToken() },
  );

  return {
    ...result,
    countedCount: normalizeNumber(result.countedCount),
    adjustedCount: normalizeNumber(result.adjustedCount),
    unchangedCount: normalizeNumber(result.unchangedCount),
    totalDifference: normalizeNumber(result.totalDifference),
    adjustments: result.adjustments.map((adjustment) => ({
      ...adjustment,
      productId: normalizeId(adjustment.productId),
      previousStock: normalizeNumber(adjustment.previousStock),
      countedStock: normalizeNumber(adjustment.countedStock),
      difference: normalizeNumber(adjustment.difference),
    })),
  };
}

export async function getInventoryCategories() {
  const categories = await getJson<InventoryProductCategoryApiRecord[]>(
    "/inventory/categories",
    {
      accessToken: getAuthAccessToken(),
    },
  );

  return categories.map(normalizeInventoryProductCategory);
}

export async function createInventoryCategory(
  input: InventoryProductCategoryInput,
) {
  const category = await postJson<
    InventoryProductCategoryApiRecord,
    InventoryProductCategoryInput
  >("/inventory/categories", input, {
    accessToken: getAuthAccessToken(),
  });

  return normalizeInventoryProductCategory(category);
}

export async function updateInventoryCategory(
  categoryId: string,
  input: Partial<InventoryProductCategoryInput>,
) {
  const category = await patchJson<
    InventoryProductCategoryApiRecord,
    Partial<InventoryProductCategoryInput>
  >(`/inventory/categories/${categoryId}`, input, {
    accessToken: getAuthAccessToken(),
  });

  return normalizeInventoryProductCategory(category);
}

export async function deleteInventoryCategory(categoryId: string) {
  const category = await deleteJson<InventoryProductCategoryApiRecord>(
    `/inventory/categories/${categoryId}`,
    {
      accessToken: getAuthAccessToken(),
    },
  );

  return normalizeInventoryProductCategory(category);
}

export async function updateInventoryProductTaxes(
  input: InventoryProductTaxesInput,
) {
  return postJson<InventoryProductTaxesResult, InventoryProductTaxesInput>(
    "/inventory/taxes",
    input,
    {
      accessToken: getAuthAccessToken(),
    },
  );
}

export async function registerInventoryPurchase(input: InventoryPurchaseInput) {
  const purchase = await postJson<
    InventoryPurchaseResult,
    InventoryPurchaseInput
  >("/inventory/purchase", input, {
    accessToken: getAuthAccessToken(),
  });

  return {
    ...purchase,
    id: String(purchase.id),
    supplierId: String(purchase.supplierId),
  };
}

export async function uploadInventoryPurchaseInvoice(input: {
  supplierId: string;
  purchaseId: string;
  file: File;
}) {
  const formData = new FormData();
  formData.append("file", input.file);

  return patchFormData(
    `/suppliers/${input.supplierId}/purchases/${input.purchaseId}/invoice-image`,
    formData,
    { accessToken: getAuthAccessToken() },
  );
}

export async function exportInventoryReport(filters: InventoryExportFilters) {
  return getBlob(`/inventory/export${buildInventoryExportQuery(filters)}`, {
    accessToken: getAuthAccessToken(),
    accept: "text/csv",
  });
}
