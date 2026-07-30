import {
  getJson,
  resolveApiAssetUrl,
} from "@/shared/services/api-client";
import { normalizeId, normalizeOptionalId } from "@/shared/utils/normalize-id";
import { normalizeNumber } from "@/shared/utils/normalize-number";
import type {
  PublicCatalogApiDetail,
  PublicCatalogDetail,
} from "../types/public-catalog";

const publicRequestOptions = {
  accessToken: "",
  businessId: "",
};

export async function getPublicCatalog(slug: string) {
  const catalog = await getJson<PublicCatalogApiDetail>(
    `/catalogs/${encodeURIComponent(slug)}`,
    publicRequestOptions,
  );

  return normalizePublicCatalog(catalog);
}

function normalizePublicCatalog(
  catalog: PublicCatalogApiDetail,
): PublicCatalogDetail {
  return {
    ...catalog,
    business: {
      ...catalog.business,
      id: normalizeId(catalog.business.id),
      logoUrl: resolveApiAssetUrl(catalog.business.logoUrl),
    },
    categories: catalog.categories.map((category) => ({
      ...category,
      id: normalizeId(category.id),
    })),
    products: catalog.products.map((product) => ({
      ...product,
      categoryId: normalizeOptionalId(product.categoryId),
      id: normalizeId(product.id),
      imageUrls: product.imageUrls
        .map((imageUrl) => resolveApiAssetUrl(imageUrl))
        .filter((imageUrl): imageUrl is string => Boolean(imageUrl)),
      price: normalizeNumber(product.price),
      stock: normalizeNumber(product.stock),
    })),
  };
}
