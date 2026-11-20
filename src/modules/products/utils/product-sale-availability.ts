import type { Product } from "@/modules/products/types/product";

export function getProductSaleAvailability(product: Product): number | null {
  if (product.inventoryBehavior !== "MADE_TO_ORDER") return product.stock;

  if (!product.recipeAvailability?.configured) return null;

  return product.recipeAvailability.availableQuantity;
}

export function getProductAvailabilityLabel(product: Product) {
  if (product.inventoryBehavior !== "MADE_TO_ORDER") {
    return `${product.stock.toString()} disponibles`;
  }

  const availability = getProductSaleAvailability(product);

  if (availability === null) return "Preparado al pedir";
  if (availability === 0) {
    return product.recipeAvailability?.limitingIngredientName
      ? `Falta ${product.recipeAvailability.limitingIngredientName}`
      : "Sin insumos";
  }

  return `${availability.toString()} por preparar`;
}

export function canSellProductQuantity(
  product: Product,
  quantity: number,
  allowSaleWithoutStock: boolean,
) {
  if (allowSaleWithoutStock) return true;

  const availability = getProductSaleAvailability(product);
  return availability === null || quantity <= availability;
}
