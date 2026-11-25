import type { AppUserRole } from "@/shared/constants/user-roles";

export type AuthBusiness = {
  id: string;
  businessName: string;
  businessCategory: string | null;
  logoUrl: string | null;
  role: AppUserRole;
  isDefault: boolean;
};

export type AuthTranslation = {
  id: string;
  code: string;
  name: string;
  nativeName: string;
};

export type AuthUser = {
  id: string;
  email: string;
  phone: string | null;
  name: string;
  role: AppUserRole;
  businessId: string;
  businessName: string;
  businessCategory: string | null;
  logoUrl: string | null;
  translationId: string | null;
  translation: AuthTranslation;
  businesses: AuthBusiness[];
};

export type LoginCredentials = {
  identifier: string;
  password: string;
  businessId?: string;
};

export type GoogleLoginPayload = {
  credential: string;
  businessId?: string;
};

export type PhoneLoginStartPayload = {
  countryCode: string;
  phone: string;
};

export type PhoneLoginStartResponse = {
  loginRequestId: number;
  maskedPhone: string;
  expiresInSeconds: number;
  developmentVerificationCode?: string;
};

export type PhoneLoginVerifyPayload = {
  loginRequestId: number;
  verificationCode: string;
  businessId?: string;
};

export type LoginResponse = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: string;
  user: AuthUser;
};

export type RegisterStartPayload = {
  translationId: string;
  email: string;
  acceptedTerms: boolean;
};

export type RegisterStartResponse = {
  registrationToken: string;
  expiresInSeconds: number;
};

export type RegisterVerifyPayload = {
  registrationToken: string;
  verificationCode: string;
};

export type RegisterVerifyResponse = {
  verified: boolean;
};

export type RegisterCompletePayload = {
  registrationToken: string;
  fullName: string;
  businessPhone?: string;
  password: string;
  businessName: string;
  businessCategory: string;
  sellerCode?: string;
};
