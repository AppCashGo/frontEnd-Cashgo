import type {
  CatalogBusinessHour,
  CatalogOutOfStockBehavior,
} from "@/modules/settings/types/settings";

export type PublicCatalogBusiness = {
  id: string;
  businessName: string;
  businessCategory: string | null;
  logoUrl: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
};

export type PublicCatalogCategory = {
  id: string;
  name: string;
};

export type PublicCatalogProduct = {
  id: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  price: number;
  stock: number;
  unit: string;
  imageUrls: string[];
  isAvailable: boolean;
};

export type PublicCatalogDetail = {
  slug: string;
  business: PublicCatalogBusiness;
  settings: {
    businessHours: CatalogBusinessHour[] | null;
    outOfStockBehavior: CatalogOutOfStockBehavior;
    pickupEnabled: boolean;
    deliveryEnabled: boolean;
  };
  categories: PublicCatalogCategory[];
  products: PublicCatalogProduct[];
};

export type PublicCatalogApiProduct = Omit<
  PublicCatalogProduct,
  "id" | "categoryId"
> & {
  id: number | string;
  categoryId: number | string | null;
};

export type PublicCatalogApiCategory = Omit<PublicCatalogCategory, "id"> & {
  id: number | string;
};

export type PublicCatalogApiDetail = Omit<
  PublicCatalogDetail,
  "business" | "categories" | "products"
> & {
  business: Omit<PublicCatalogBusiness, "id"> & {
    id: number | string;
  };
  categories: PublicCatalogApiCategory[];
  products: PublicCatalogApiProduct[];
};
