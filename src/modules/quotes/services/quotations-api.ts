import type {
  ConvertQuotationToSaleInput,
  CreateQuotationInput,
  PublicQuotationDetail,
  QuotationDetail,
  QuotationFilters,
  QuotationSummary,
  UpdateQuotationInput,
} from "@/modules/quotes/types/quotation";
import {
  deleteJson,
  getBlob,
  getJson,
  patchJson,
  postJson,
} from "@/shared/services/api-client";

function toSearchParams(filters: QuotationFilters) {
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

  return queryString ? `?${queryString}` : "";
}

export function getQuotations(filters: QuotationFilters) {
  return getJson<QuotationSummary[]>(`/quotations${toSearchParams(filters)}`);
}

export function getQuotationDetail(quotationId: string) {
  return getJson<QuotationDetail>(`/quotations/${quotationId}`);
}

export function createQuotation(input: CreateQuotationInput) {
  return postJson<QuotationDetail, CreateQuotationInput>("/quotations", input);
}

export function updateQuotation(
  quotationId: string,
  input: UpdateQuotationInput,
) {
  return patchJson<QuotationDetail, UpdateQuotationInput>(
    `/quotations/${quotationId}`,
    input,
  );
}

export function deleteQuotation(quotationId: string) {
  return deleteJson<{ deleted: true }>(`/quotations/${quotationId}`);
}

export function sendQuotation(quotationId: string) {
  return postJson<QuotationDetail, Record<string, never>>(
    `/quotations/${quotationId}/send`,
    {},
  );
}

export function acceptQuotation(quotationId: string) {
  return postJson<QuotationDetail, Record<string, never>>(
    `/quotations/${quotationId}/accept`,
    {},
  );
}

export function rejectQuotation(quotationId: string) {
  return postJson<QuotationDetail, Record<string, never>>(
    `/quotations/${quotationId}/reject`,
    {},
  );
}

export function cancelQuotation(quotationId: string) {
  return postJson<QuotationDetail, Record<string, never>>(
    `/quotations/${quotationId}/cancel`,
    {},
  );
}

export function convertQuotationToSale(
  quotationId: string,
  input: ConvertQuotationToSaleInput,
) {
  return postJson<QuotationDetail, ConvertQuotationToSaleInput>(
    `/quotations/${quotationId}/convert-to-sale`,
    input,
  );
}

export function downloadQuotationDocument(quotationId: string) {
  return getBlob(`/quotations/${quotationId}/pdf`, {
    accept: "text/html",
  });
}

const publicRequestOptions = {
  accessToken: "",
  businessId: "",
} as const;

export function getPublicQuotationDetail(publicToken: string) {
  return getJson<PublicQuotationDetail>(
    `/quotations/public/${publicToken}`,
    publicRequestOptions,
  );
}

export function acceptPublicQuotation(publicToken: string) {
  return postJson<PublicQuotationDetail, Record<string, never>>(
    `/quotations/public/${publicToken}/accept`,
    {},
    publicRequestOptions,
  );
}

export function rejectPublicQuotation(publicToken: string) {
  return postJson<PublicQuotationDetail, Record<string, never>>(
    `/quotations/public/${publicToken}/reject`,
    {},
    publicRequestOptions,
  );
}

export function downloadPublicQuotationDocument(publicToken: string) {
  return getBlob(`/quotations/public/${publicToken}/pdf`, {
    accept: "text/html",
    ...publicRequestOptions,
  });
}
