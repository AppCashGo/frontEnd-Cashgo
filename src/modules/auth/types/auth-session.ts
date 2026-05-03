import type { AppUserRole } from "@/shared/constants/user-roles";

export type AuthBusiness = {
  id: string;
  businessName: string;
  businessCategory: string | null;
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
  countryCode: string;
  phone: string;
  acceptedTerms: boolean;
};

export type RegisterStartResponse = {
  registrationId: string;
  status: "PENDING_VERIFICATION" | "VERIFIED" | "COMPLETED" | "CANCELLED";
  maskedPhone: string;
  expiresInSeconds: number;
  developmentVerificationCode?: string;
};

export type RegisterVerifyPayload = {
  registrationId: string;
  verificationCode: string;
};

export type RegisterVerifyResponse = {
  registrationId: string;
  status: "PENDING_VERIFICATION" | "VERIFIED" | "COMPLETED" | "CANCELLED";
  maskedPhone: string;
  verifiedAt: string;
};

export type RegisterCompletePayload = {
  registrationId: string;
  fullName: string;
  email: string;
  password: string;
  businessName: string;
  businessCategory: string;
  sellerCode?: string;
};
