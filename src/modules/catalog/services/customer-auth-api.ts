import { getJson, postJson } from "@/shared/services/api-client";
import type {
  CatalogCustomer,
  CustomerAuthResponse,
  CustomerLoginPayload,
  CustomerRegisterPayload,
  CustomerRegistrationResponse,
} from "../types/customer-session";

const publicOptions = {
  accessToken: "",
  businessId: "",
  handleGlobalAuthFailure: false,
};

export function loginCatalogCustomer(
  slug: string,
  payload: CustomerLoginPayload,
) {
  return postJson<CustomerAuthResponse, CustomerLoginPayload>(
    `/customer-auth/${encodeURIComponent(slug)}/login`,
    payload,
    publicOptions,
  );
}

export function authenticateCatalogCustomerWithGoogle(
  slug: string,
  credential: string,
) {
  return postJson<CustomerAuthResponse, { credential: string }>(
    `/customer-auth/${encodeURIComponent(slug)}/google`,
    { credential },
    publicOptions,
  );
}

export function registerCatalogCustomer(
  slug: string,
  payload: CustomerRegisterPayload,
) {
  return postJson<CustomerRegistrationResponse, CustomerRegisterPayload>(
    `/customer-auth/${encodeURIComponent(slug)}/register`,
    payload,
    publicOptions,
  );
}

export function verifyCatalogCustomerEmail(slug: string, token: string) {
  return postJson<CustomerAuthResponse, { token: string }>(
    `/customer-auth/${encodeURIComponent(slug)}/verify-email`,
    { token },
    publicOptions,
  );
}

export function resendCatalogCustomerVerification(slug: string, email: string) {
  return postJson<CustomerRegistrationResponse, { email: string }>(
    `/customer-auth/${encodeURIComponent(slug)}/resend-verification`,
    { email },
    publicOptions,
  );
}

export function getCatalogCustomer(slug: string, accessToken: string) {
  return getJson<CatalogCustomer>(
    `/customer-auth/${encodeURIComponent(slug)}/me`,
    { accessToken, businessId: "", handleGlobalAuthFailure: false },
  );
}
