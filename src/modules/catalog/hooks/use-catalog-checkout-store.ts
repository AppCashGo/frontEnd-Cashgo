import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FulfillmentMethod = "pickup" | "delivery";
export type CatalogCheckoutPaymentMethod =
  | "MANUAL_TRANSFER"
  | "PAY_ON_FULFILLMENT";

export type CatalogCheckoutDetails = {
  method: FulfillmentMethod | null;
  paymentMethod: CatalogCheckoutPaymentMethod;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  instructions: string;
  saveAddress: boolean;
  addressLabel: string;
};

const emptyCheckout: CatalogCheckoutDetails = {
  address: "",
  contactName: "",
  email: "",
  instructions: "",
  saveAddress: false,
  addressLabel: "Casa",
  method: null,
  paymentMethod: "PAY_ON_FULFILLMENT",
  phone: "",
};

type CatalogCheckoutState = {
  checkouts: Record<string, CatalogCheckoutDetails>;
  initializeContact: (
    catalogSlug: string,
    contact: { name: string; email: string },
  ) => void;
  updateCheckout: (
    catalogSlug: string,
    patch: Partial<CatalogCheckoutDetails>,
  ) => void;
};

export const useCatalogCheckoutStore = create<CatalogCheckoutState>()(
  persist(
    (set) => ({
      checkouts: {},
      initializeContact: (catalogSlug, contact) =>
        set((state) => {
          const checkout = state.checkouts[catalogSlug] ?? emptyCheckout;
          return {
            checkouts: {
              ...state.checkouts,
              [catalogSlug]: {
                ...checkout,
                contactName: checkout.contactName || contact.name,
                email: checkout.email || contact.email,
              },
            },
          };
        }),
      updateCheckout: (catalogSlug, patch) =>
        set((state) => ({
          checkouts: {
            ...state.checkouts,
            [catalogSlug]: {
              ...(state.checkouts[catalogSlug] ?? emptyCheckout),
              ...patch,
            },
          },
        })),
    }),
    {
      name: "cashgo-catalog-checkouts",
      partialize: (state) => ({ checkouts: state.checkouts }),
      version: 1,
    },
  ),
);

export const emptyCatalogCheckout = emptyCheckout;
