import { deleteJson, getJson, postJson } from "@/shared/services/api-client";
import type {
  CatalogCustomerNotification,
  CatalogSavedAddress,
} from "../types/catalog-customer";

const options = (accessToken: string) => ({
  accessToken,
  businessId: "",
  handleGlobalAuthFailure: false,
});

export function getCatalogSavedAddresses(slug: string, accessToken: string) {
  return getJson<CatalogSavedAddress[]>(
    `/catalog-customer/${encodeURIComponent(slug)}/addresses`,
    options(accessToken),
  );
}

export function saveCatalogAddress(
  slug: string,
  accessToken: string,
  input: { label: string; address: string; instructions?: string },
) {
  return postJson<CatalogSavedAddress, typeof input>(
    `/catalog-customer/${encodeURIComponent(slug)}/addresses`,
    input,
    options(accessToken),
  );
}

export function deleteCatalogAddress(
  slug: string,
  accessToken: string,
  addressId: number,
) {
  return deleteJson<{ deleted: true }>(
    `/catalog-customer/${encodeURIComponent(slug)}/addresses/${addressId}`,
    options(accessToken),
  );
}

export function getCatalogNotifications(slug: string, accessToken: string) {
  return getJson<CatalogCustomerNotification[]>(
    `/catalog-customer/${encodeURIComponent(slug)}/notifications`,
    options(accessToken),
  );
}

export function markCatalogNotificationsRead(slug: string, accessToken: string) {
  return postJson<{ updated: true }, Record<string, never>>(
    `/catalog-customer/${encodeURIComponent(slug)}/notifications/read`,
    {},
    options(accessToken),
  );
}
