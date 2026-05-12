export const productUnits = [
  "UNIT",
  "KG",
  "GRAM",
  "LITER",
  "MILLILITER",
  "METER",
  "BOX",
  "PACK",
  "SERVICE",
] as const;

export type ProductUnit = (typeof productUnits)[number];

export type ProductType = "BASIC" | "VARIANT_PARENT" | "VARIANT";

export type ProductVariantInput = {
  name: string;
  sku?: string;
  barcode?: string;
  cost: number;
  price: number;
  stock: number;
  minStock?: number;
};

export type Product = {
  id: string;
  categoryId: string | null;
  parentProductId: string | null;
  productType: ProductType;
  variantName: string | null;
  name: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  taxLabel: string | null;
  taxRate: number;
  cost: number;
  price: number;
  stock: number;
  minStock: number;
  unit: ProductUnit;
  isActive: boolean;
  isVisibleInCatalog: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductMutationInput = {
  name: string;
  categoryId?: string | null;
  description?: string;
  sku?: string;
  barcode?: string;
  taxLabel?: string;
  taxRate?: number;
  cost?: number;
  price: number;
  stock: number;
  minStock?: number;
  unit?: ProductUnit;
  isActive?: boolean;
  isVisibleInCatalog?: boolean;
  variants?: ProductVariantInput[];
};

export type ProductImportRowInput = ProductMutationInput & {
  rowNumber: number;
};

export type ProductImportMutationInput = {
  rows: ProductImportRowInput[];
};

export type ProductImportLineResult = {
  rowNumber: number;
  productId: string;
  productName: string;
  status: "CREATED" | "UPDATED";
  inventoryAdjusted: boolean;
  message: string;
};

export type ProductImportResult = {
  rowsReceived: number;
  createdCount: number;
  updatedCount: number;
  stockAdjustedCount: number;
  results: ProductImportLineResult[];
};
