import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  CatalogCustomer,
  CustomerAuthResponse,
} from "../types/customer-session";

export type CatalogCustomerSession = {
  accessToken: string;
  customer: CatalogCustomer;
};

type CustomerSessionState = {
  sessions: Record<string, CatalogCustomerSession>;
  clearSession: (catalogSlug: string) => void;
  setSession: (catalogSlug: string, response: CustomerAuthResponse) => void;
};

export const useCustomerSessionStore = create<CustomerSessionState>()(
  persist(
    (set) => ({
      sessions: {},
      clearSession: (catalogSlug) =>
        set((state) => {
          const nextSessions = { ...state.sessions };
          delete nextSessions[catalogSlug];
          return { sessions: nextSessions };
        }),
      setSession: (catalogSlug, response) =>
        set((state) => ({
          sessions: {
            ...state.sessions,
            [catalogSlug]: {
              accessToken: response.accessToken,
              customer: response.customer,
            },
          },
        })),
    }),
    {
      name: "cashgo-customer-sessions",
      partialize: (state) => ({ sessions: state.sessions }),
      version: 1,
    },
  ),
);
