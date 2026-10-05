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
