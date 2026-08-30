import type { AuthUser } from "@/modules/auth/types/auth-session";
import type { BusinessCategoryOption } from "@/shared/constants/business-categories";

export const supportedCurrencies = ["COP", "USD", "EUR", "MXN"] as const;
export const catalogWeekdayIds = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
export const catalogOutOfStockBehaviors = [
  "SHOW_NORMALLY",
  "HIDE_FROM_CATALOG",
  "SHOW_UNAVAILABLE",
] as const;
export const printTicketWidths = ["58mm", "80mm"] as const;

export type SupportedCurrency = (typeof supportedCurrencies)[number];
export type ManagedBusinessRole = AuthUser["role"];
export type CatalogWeekdayId = (typeof catalogWeekdayIds)[number];
export type CatalogOutOfStockBehavior =
  (typeof catalogOutOfStockBehaviors)[number];
export type PrintTicketWidth = (typeof printTicketWidths)[number];

export type CatalogBusinessHour = {
  day: CatalogWeekdayId;
  enabled: boolean;
  opensAt: string;
  closesAt: string;
};

export type BusinessSettings = {
  id: string;
  businessName: string;
  logoUrl: string | null;
  businessCategory: string | null;
  legalName: string | null;
  taxId: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  currency: SupportedCurrency;
  taxRate: number;
  taxLabel: string | null;
  allowSaleWithoutStock: boolean;
  lowStockAlertsEnabled: boolean;
  defaultLowStockThreshold: number;
  useWeightedAverageCost: boolean;
  cashRegisterOpeningReminderEnabled: boolean;
  saleCompletionSoundEnabled: boolean;
  printTicketWidth: PrintTicketWidth;
  printShowLogo: boolean;
  printShowTaxDetail: boolean;
  printFooterMessage: string;
  catalogBusinessHours: CatalogBusinessHour[] | null;
  catalogOutOfStockBehavior: CatalogOutOfStockBehavior;
  catalogPickupEnabled: boolean;
  catalogDeliveryEnabled: boolean;
  catalogSlug: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BusinessProfileInput = {
  businessName: string;
  businessCategory?: BusinessCategoryOption | null;
  legalName?: string | null;
  taxId?: string | null;
  city?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

export type BusinessTaxSettingsInput = {
  currency: SupportedCurrency;
  taxRate: number;
  taxLabel?: string | null;
};

export type BusinessOperationalSettingsInput = {
  allowSaleWithoutStock: boolean;
  lowStockAlertsEnabled: boolean;
  defaultLowStockThreshold: number;
  useWeightedAverageCost: boolean;
};

export type BusinessVirtualCatalogSettingsInput = {
  catalogBusinessHours?: CatalogBusinessHour[];
  catalogOutOfStockBehavior?: CatalogOutOfStockBehavior;
  catalogPickupEnabled?: boolean;
  catalogDeliveryEnabled?: boolean;
  catalogSlug?: string | null;
};

export type BusinessReminderSettingsInput = {
  cashRegisterOpeningReminderEnabled: boolean;
};

export type BusinessAdditionalSettingsInput = {
  saleCompletionSoundEnabled?: boolean;
};

export type BusinessPrintSettingsInput = {
  printTicketWidth: PrintTicketWidth;
  printShowLogo: boolean;
  printShowTaxDetail: boolean;
  printFooterMessage: string;
};

export type BusinessSettingsCreateInput = BusinessProfileInput &
  BusinessTaxSettingsInput &
  Partial<
    BusinessOperationalSettingsInput &
      BusinessVirtualCatalogSettingsInput &
      BusinessReminderSettingsInput &
      BusinessAdditionalSettingsInput &
      BusinessPrintSettingsInput
  >;

export type BusinessSettingsUpdateInput = Partial<
  BusinessSettingsCreateInput &
    BusinessOperationalSettingsInput &
    BusinessVirtualCatalogSettingsInput &
    BusinessReminderSettingsInput &
    BusinessAdditionalSettingsInput &
    BusinessPrintSettingsInput
>;

export type ManagedBusinessSummary = {
  id: string;
  businessName: string;
  businessCategory: string | null;
  logoUrl: string | null;
  role: ManagedBusinessRole;
  isDefault: boolean;
};
