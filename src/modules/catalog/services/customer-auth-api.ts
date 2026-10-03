import { getJson, postJson } from "@/shared/services/api-client";
import type {
  CatalogCustomer,
  CustomerAuthResponse,
  CustomerLoginPayload,
  CustomerRegisterPayload,
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

export function registerCatalogCustomer(
  slug: string,
  payload: CustomerRegisterPayload,
) {
  return postJson<CustomerAuthResponse, CustomerRegisterPayload>(
    `/customer-auth/${encodeURIComponent(slug)}/register`,
    payload,
    publicOptions,
  );
}

export function getCatalogCustomer(slug: string, accessToken: string) {
  return getJson<CatalogCustomer>(
    `/customer-auth/${encodeURIComponent(slug)}/me`,
    { accessToken, businessId: "", handleGlobalAuthFailure: false },
  );
}
