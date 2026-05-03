import type { CashRegisterPaymentMethod } from "@/modules/cash-register/types/cash-register";

export type BillingDocumentStatus =
  | "PAID"
  | "PARTIAL"
  | "PENDING"
  | "OVERDUE"
  | "CANCELLED";

export type BillingDocumentStatusFilter = "ALL" | BillingDocumentStatus;

export type BillingInvoiceStatus =
  | "DRAFT"
  | "PENDING"
  | "SENT"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export type BillingInvoiceType =
  | "SIMPLE_RECEIPT"
  | "POS_DOCUMENT"
  | "ELECTRONIC_INVOICE";

export type BillingDocumentCustomer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  documentType: string | null;
  documentNumber: string | null;
};

export type BillingResolution = {
  id: string;
  prefix: string;
  resolution: string;
  startNumber: number;
  endNumber: number;
  currentNumber: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

export type BillingBusinessSummary = {
  businessName: string;
  legalName: string | null;
  taxId: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxResponsibility: string | null;
  taxRegime: string | null;
  invoiceNote: string | null;
  currency: string;
};

export type BillingDocumentSummary = {
  id: string;
  documentNumber: string;
  saleId: string | null;
  saleNumber: string | null;
  type: BillingInvoiceType;
  invoiceStatus: BillingInvoiceStatus;
  paymentStatus: BillingDocumentStatus;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  paidAmount: number;
  balance: number;
  dueDate: string | null;
  note: string | null;
  createdAt: string;
  issuedAt: string | null;
  itemCount: number;
  paymentMethods: CashRegisterPaymentMethod[];
  customer: BillingDocumentCustomer | null;
  dianStatus: string | null;
};

export type BillingDocumentPayment = {
  id: string;
  source: "SALE" | "COLLECTION";
  method: CashRegisterPaymentMethod;
  amount: number;
  reference: string | null;
  notes: string | null;
  createdAt: string;
};

export type BillingDocumentItem = {
  id: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  total: number;
};

export type BillingDocumentDetail = BillingDocumentSummary & {
  sellerName: string | null;
  items: BillingDocumentItem[];
  payments: BillingDocumentPayment[];
  isManualSale: boolean;
  resolution: BillingResolution | null;
  business: BillingBusinessSummary;
};

export type BillingDocumentsFilters = {
  search?: string;
  customerId?: string;
  status?: BillingDocumentStatusFilter;
  from?: string;
  to?: string;
};

export type BillingCollectionInput = {
  amount: number;
  method: CashRegisterPaymentMethod;
  cashRegisterId?: string;
  reference?: string;
  notes?: string;
};

export type BillingConfiguration = BillingBusinessSummary & {
  businessId: string;
  resolution: BillingResolution | null;
};

export type BillingConfigurationInput = {
  legalName?: string | null;
  taxId?: string | null;
  city?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  taxResponsibility?: string | null;
  taxRegime?: string | null;
  invoiceNote?: string | null;
  resolutionPrefix?: string | null;
  resolutionNumber?: string | null;
  resolutionStartNumber?: number | null;
  resolutionEndNumber?: number | null;
  resolutionCurrentNumber?: number | null;
  resolutionStartDate?: string | null;
  resolutionEndDate?: string | null;
  resolutionActive?: boolean;
};

export type BillingAvailableSale = {
  id: string;
  saleNumber: string;
  createdAt: string;
  total: number;
  balance: number;
  customerName: string | null;
  status: string;
};

export type CreateBillingInvoiceInput = {
  saleId: string;
  type: BillingInvoiceType;
  note?: string | null;
};
