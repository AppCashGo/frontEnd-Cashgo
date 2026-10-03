import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PublicCatalogProduct } from "../types/public-catalog";

export type PublicCartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
  unit: string;
  imageUrl: string | null;
};

type PublicCartState = {
  carts: Record<string, PublicCartItem[]>;
  addItem: (
    catalogKey: string,
    product: PublicCatalogProduct,
    imageUrl: string | null,
  ) => void;
  clearCart: (catalogKey: string) => void;
  reconcileCart: (
    catalogKey: string,
    products: PublicCatalogProduct[],
  ) => void;
  removeItem: (catalogKey: string, productId: string) => void;
  setQuantity: (
    catalogKey: string,
    productId: string,
    quantity: number,
  ) => void;
  replaceFromOrder: (
    catalogKey: string,
    entries: Array<{ productId: number | null; quantity: number }>,
    products: PublicCatalogProduct[],
  ) => void;
};

export const usePublicCartStore = create<PublicCartState>()(
  persist(
    (set) => ({
      carts: {},
      addItem: (catalogKey, product, imageUrl) =>
        set((state) => {
          if (!product.isAvailable || product.stock <= 0) {
            return state;
          }

          const items = state.carts[catalogKey] ?? [];
          const existingItem = items.find(
            (item) => item.productId === product.id,
          );
          const nextItems = existingItem
            ? items.map((item) =>
                item.productId === product.id
                  ? {
                      ...item,
                      imageUrl,
                      name: product.name,
                      price: product.price,
                      quantity: Math.min(item.quantity + 1, product.stock),
                      stock: product.stock,
                      unit: product.unit,
                    }
                  : item,
              )
            : [
                ...items,
                {
                  imageUrl,
                  name: product.name,
                  price: product.price,
                  productId: product.id,
                  quantity: 1,
                  stock: product.stock,
                  unit: product.unit,
                },
              ];

          return { carts: { ...state.carts, [catalogKey]: nextItems } };
        }),
      clearCart: (catalogKey) =>
        set((state) => ({
          carts: { ...state.carts, [catalogKey]: [] },
        })),
      reconcileCart: (catalogKey, products) =>
        set((state) => {
          const currentItems = state.carts[catalogKey] ?? [];
          const productsById = new Map(
            products.map((product) => [product.id, product]),
          );
          const nextItems = currentItems.flatMap((item) => {
            const product = productsById.get(item.productId);
            if (!product?.isAvailable || product.stock <= 0) {
              return [];
            }

            return [
              {
                ...item,
                name: product.name,
                price: product.price,
                quantity: Math.min(Math.max(item.quantity, 1), product.stock),
                stock: product.stock,
                unit: product.unit,
              },
            ];
          });

          if (JSON.stringify(currentItems) === JSON.stringify(nextItems)) {
            return state;
          }

          return { carts: { ...state.carts, [catalogKey]: nextItems } };
        }),
      removeItem: (catalogKey, productId) =>
        set((state) => ({
          carts: {
            ...state.carts,
            [catalogKey]: (state.carts[catalogKey] ?? []).filter(
              (item) => item.productId !== productId,
            ),
          },
        })),
      replaceFromOrder: (catalogKey, entries, products) =>
        set((state) => {
          const productsById = new Map(products.map((product) => [Number(product.id), product]));
          const items = entries.flatMap((entry) => {
            const product = entry.productId ? productsById.get(entry.productId) : null;
            if (!product?.isAvailable || product.stock <= 0) return [];
            return [{
              imageUrl: Array.isArray(product.imageUrls) && typeof product.imageUrls[0] === "string" ? product.imageUrls[0] : null,
              name: product.name,
              price: product.price,
              productId: product.id,
              quantity: Math.min(Math.max(entry.quantity, 1), product.stock),
              stock: product.stock,
              unit: product.unit,
            }];
          });
          return { carts: { ...state.carts, [catalogKey]: items } };
        }),
      setQuantity: (catalogKey, productId, quantity) =>
        set((state) => ({
          carts: {
            ...state.carts,
            [catalogKey]: (state.carts[catalogKey] ?? [])
              .map((item) =>
                item.productId === productId
                  ? {
                      ...item,
                      quantity: Math.min(Math.max(quantity, 0), item.stock),
                    }
                  : item,
              )
              .filter((item) => item.quantity > 0),
          },
        })),
    }),
    {
      name: "cashgo-public-carts",
      partialize: (state) => ({ carts: state.carts }),
      version: 1,
    },
  ),
);
