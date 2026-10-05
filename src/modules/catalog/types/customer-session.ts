export type CatalogCustomer = {
  id: number;
  businessId: number;
  businessName: string;
  catalogSlug: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  emailVerifiedAt: string;
};

export type CustomerAuthResponse = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: string;
  customer: CatalogCustomer;
};

export type CustomerLoginPayload = {
  email: string;
  password: string;
};

export type CustomerRegisterPayload = CustomerLoginPayload & {
  name: string;
};

export type CustomerRegistrationResponse = {
  requiresVerification: true;
  email: string;
  expiresInMinutes: number;
  developmentVerificationToken?: string;
};
