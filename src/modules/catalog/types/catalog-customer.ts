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
