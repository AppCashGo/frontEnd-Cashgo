import type {
  BillingAvailableSale,
  BillingCollectionInput,
  BillingConfiguration,
  BillingConfigurationInput,
  BillingDocumentDetail,
  BillingDocumentSummary,
  BillingDocumentsFilters,
  CreateBillingInvoiceInput,
} from "@/modules/billing/types/billing";
import {
  getBlob,
  getJson,
  patchJson,
  postJson,
} from "@/shared/services/api-client";

function toSearchParams(filters: BillingDocumentsFilters) {
  const searchParams = new URLSearchParams();

  if (filters.search) {
    searchParams.set("search", filters.search);
  }

  if (filters.customerId) {
    searchParams.set("customerId", filters.customerId);
  }

  if (filters.status && filters.status !== "ALL") {
    searchParams.set("status", filters.status);
  }

  if (filters.from) {
    searchParams.set("from", filters.from);
  }

  if (filters.to) {
    searchParams.set("to", filters.to);
  }

  const queryString = searchParams.toString();

  return queryString.length > 0 ? `?${queryString}` : "";
}

export function getBillingDocuments(filters: BillingDocumentsFilters) {
  return getJson<BillingDocumentSummary[]>(`/billing${toSearchParams(filters)}`);
}

export function getBillingConfiguration() {
  return getJson<BillingConfiguration>("/billing/config");
}

export function updateBillingConfiguration(input: BillingConfigurationInput) {
  return patchJson<BillingConfiguration, BillingConfigurationInput>(
    "/billing/config",
    input,
  );
}

export function getAvailableBillingSales(search?: string) {
  const queryString = search?.trim()
    ? `?search=${encodeURIComponent(search.trim())}`
    : "";

  return getJson<BillingAvailableSale[]>(`/billing/sales/available${queryString}`);
}

export function createBillingDocumentFromSale(input: CreateBillingInvoiceInput) {
  return postJson<BillingDocumentDetail, CreateBillingInvoiceInput>(
    "/billing/from-sale",
    input,
  );
}

export function getBillingDocumentDetail(documentId: string) {
  return getJson<BillingDocumentDetail>(`/billing/${documentId}`);
}

export function collectBillingDocument(
  documentId: string,
  input: BillingCollectionInput,
) {
  return postJson<BillingDocumentDetail, BillingCollectionInput>(
    `/billing/${documentId}/collect`,
    input,
  );
}

export function downloadBillingReceipt(documentId: string) {
  return getBlob(`/billing/${documentId}/receipt`, {
    accept: "text/html",
  });
}

export function downloadBillingReport(filters: BillingDocumentsFilters) {
  return getBlob(`/billing/report/export${toSearchParams(filters)}`, {
    accept: "text/csv",
  });
}
