import type { CashRegisterPaymentMethod } from "@/modules/cash-register/types/cash-register";

export type QuotationStatus =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CONVERTED"
  | "CANCELLED";

export type QuotationStatusFilter = "ALL" | QuotationStatus;

export type QuotationCustomer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  documentType: string | null;
  documentNumber: string | null;
};

export type QuotationItem = {
  id: string;
  productId: string | null;
  name: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  total: number;
};

export type QuotationSummary = {
  id: string;
  quotationNumber: number;
  prefix: string;
  fullNumber: string;
  concept: string | null;
  status: QuotationStatus;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  validUntil: string | null;
  publicToken: string | null;
  sentAt: string | null;
  createdAt: string;
  notes: string | null;
  terms: string | null;
  itemCount: number;
  isExpired: boolean;
  customer: QuotationCustomer | null;
  convertedSaleId: string | null;
  convertedSaleNumber: string | null;
};

export type QuotationDetail = QuotationSummary & {
  creatorName: string | null;
  canConvert: boolean;
  items: QuotationItem[];
  business: {
    businessName: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
  };
};

export type PublicQuotationDetail = {
  id: string;
  fullNumber: string;
  status: QuotationStatus;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  validUntil: string | null;
  sentAt: string | null;
  createdAt: string;
  notes: string | null;
  terms: string | null;
  itemCount: number;
  isExpired: boolean;
  canRespond: boolean;
  customer: {
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
  items: QuotationItem[];
  business: {
    businessName: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
  };
};

export type QuotationFilters = {
  search?: string;
  customerId?: string;
  status?: QuotationStatusFilter;
  from?: string;
  to?: string;
};

export type QuotationItemInput = {
  productId?: string | null;
  name?: string;
  description?: string;
  quantity: number;
  unitPrice?: number;
  discount?: number;
  taxRate?: number;
};

export type CreateQuotationInput = {
  customerId?: string | null;
  items: QuotationItemInput[];
  validUntil?: string;
  notes?: string;
  terms?: string;
};

export type UpdateQuotationInput = Partial<CreateQuotationInput>;

export type QuotationConversionPaymentStatus = "PAID" | "CREDIT";

export type ConvertQuotationToSaleInput = {
  paymentStatus: QuotationConversionPaymentStatus;
  customerId?: string;
  cashRegisterId?: string;
  dueDate?: string;
  notes?: string;
  payments?: Array<{
    method: CashRegisterPaymentMethod;
    amount: number;
    reference?: string;
    notes?: string;
  }>;
};
