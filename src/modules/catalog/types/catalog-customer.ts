export type CatalogSavedAddress = {
  id: number;
  label: string;
  address: string;
  instructions: string;
  isDefault: boolean;
};

export type CatalogCustomerNotification = {
  id: number;
  orderId: number | null;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
};

export type CatalogCustomerProfile = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  documentType: string | null;
  documentNumber: string | null;
  address: string | null;
  avatarUrl: string | null;
  emailVerifiedAt: string;
  createdAt: string;
};

export type CatalogCustomerFavorite = {
  createdAt: string;
  product: {
    id: number;
    name: string;
    description: string | null;
    price: number;
    stock: number;
    imageUrls: string[] | null;
    isAvailable: boolean;
  };
};

export type CatalogReceivablePaymentReport = {
  id: number;
  amount: number;
  method: "DIGITAL_WALLET" | "TRANSFER" | "BANK_DEPOSIT";
  reference: string | null;
  notes: string | null;
  proofUrl: string;
  status: "PENDING" | "REVIEWING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  createdAt: string;
};

export type CatalogCustomerReceivable = {
  id: number;
  saleNumber: string;
  saleDate: string;
  amount: number;
  paidAmount: number;
  balance: number;
  dueDate: string | null;
  status: string;
  items: Array<{
    id: number;
    name: string;
    sku: string | null;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  payments: Array<{
    id: number;
    amount: number;
    method: string;
    createdAt: string;
  }>;
  paymentReports: CatalogReceivablePaymentReport[];
};

export type CatalogCustomerReceivables = {
  summary: { originalAmount: number; paidAmount: number; balance: number };
  receivables: CatalogCustomerReceivable[];
};
