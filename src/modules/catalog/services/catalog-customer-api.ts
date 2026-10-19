import {
  deleteJson,
  getJson,
  patchJson,
  postFormData,
  postJson,
} from "@/shared/services/api-client";
import type {
  CatalogCustomerNotification,
  CatalogSavedAddress,
  CatalogCustomerFavorite,
  CatalogCustomerProfile,
  CatalogCustomerReceivables,
  CatalogReceivablePaymentReport,
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

export function getCatalogCustomerProfile(slug: string, accessToken: string) {
  return getJson<CatalogCustomerProfile>(
    `/catalog-customer/${encodeURIComponent(slug)}/profile`,
    options(accessToken),
  );
}

export function updateCatalogCustomerProfile(
  slug: string,
  accessToken: string,
  input: Pick<
    CatalogCustomerProfile,
    "name" | "phone" | "documentType" | "documentNumber" | "address"
  >,
) {
  return patchJson<CatalogCustomerProfile, typeof input>(
    `/catalog-customer/${encodeURIComponent(slug)}/profile`,
    input,
    options(accessToken),
  );
}

export function uploadCatalogCustomerAvatar(
  slug: string,
  accessToken: string,
  file: File,
) {
  const body = new FormData();
  body.append("file", file);
  return postFormData<{ avatarUrl: string }>(
    `/catalog-customer/${encodeURIComponent(slug)}/profile/avatar`,
    body,
    options(accessToken),
  );
}

export function getCatalogCustomerFavorites(slug: string, accessToken: string) {
  return getJson<CatalogCustomerFavorite[]>(
    `/catalog-customer/${encodeURIComponent(slug)}/favorites`,
    options(accessToken),
  );
}

export function addCatalogCustomerFavorite(
  slug: string,
  accessToken: string,
  productId: number,
) {
  return postJson<{ saved: true }, Record<string, never>>(
    `/catalog-customer/${encodeURIComponent(slug)}/favorites/${productId}`,
    {},
    options(accessToken),
  );
}

export function removeCatalogCustomerFavorite(
  slug: string,
  accessToken: string,
  productId: number,
) {
  return deleteJson<{ deleted: true }>(
    `/catalog-customer/${encodeURIComponent(slug)}/favorites/${productId}`,
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

export function markCatalogNotificationsRead(
  slug: string,
  accessToken: string,
) {
  return postJson<{ updated: true }, Record<string, never>>(
    `/catalog-customer/${encodeURIComponent(slug)}/notifications/read`,
    {},
    options(accessToken),
  );
}

export function getCatalogCustomerReceivables(
  slug: string,
  accessToken: string,
) {
  return getJson<CatalogCustomerReceivables>(
    `/catalog-customer/${encodeURIComponent(slug)}/receivables`,
    options(accessToken),
  );
}

export function reportCatalogReceivablePayment(
  slug: string,
  accessToken: string,
  receivableId: number,
  input: {
    amount: number;
    method: "DIGITAL_WALLET" | "TRANSFER" | "BANK_DEPOSIT";
    reference?: string;
    notes?: string;
    file: File;
  },
) {
  const body = new FormData();
  body.append("amount", String(input.amount));
  body.append("method", input.method);
  if (input.reference) body.append("reference", input.reference);
  if (input.notes) body.append("notes", input.notes);
  body.append("file", input.file);
  return postFormData<CatalogReceivablePaymentReport>(
    `/catalog-customer/${encodeURIComponent(slug)}/receivables/${receivableId}/payment-reports`,
    body,
    options(accessToken),
  );
}
