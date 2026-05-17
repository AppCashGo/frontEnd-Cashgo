import type { AuthUser } from "@/modules/auth/types/auth-session";
import type { BusinessCategoryOption } from "@/shared/constants/business-categories";
import { assignableUserRoles } from "@/shared/constants/user-roles";

export const supportedCurrencies = ["COP", "USD", "EUR", "MXN"] as const;
export const settingsUserRoles = assignableUserRoles;

export type SupportedCurrency = (typeof supportedCurrencies)[number];
export type SettingsUserRole = AuthUser["role"];

export type BusinessSettings = {
  id: string;
  businessName: string;
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

export type BusinessSettingsCreateInput = BusinessProfileInput &
  BusinessTaxSettingsInput &
  Partial<BusinessOperationalSettingsInput>;

export type BusinessSettingsUpdateInput = Partial<
  BusinessSettingsCreateInput & BusinessOperationalSettingsInput
>;

export type SettingsUser = {
  id: string;
  email: string;
  name: string;
  role: SettingsUserRole;
  createdAt: string;
  updatedAt: string;
};

export type SettingsUserCreateInput = {
  email: string;
  name: string;
  password: string;
  role: SettingsUserRole;
};

export type SettingsUserUpdateInput = {
  email?: string;
  name?: string;
  password?: string;
  role?: SettingsUserRole;
};

export type ManagedBusinessSummary = {
  id: string;
  businessName: string;
  businessCategory: string | null;
  role: SettingsUserRole;
  isDefault: boolean;
};
