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

type SerializedNodeBuffer = {
  type: "Buffer";
  data: number[];
};

function isSerializedNodeBuffer(value: unknown): value is SerializedNodeBuffer {
  if (!value || typeof value !== "object") {
    return false;
  }

  const type = Reflect.get(value, "type");
  const data = Reflect.get(value, "data");

  return (
    type === "Buffer" &&
    Array.isArray(data) &&
    data.every(
      (byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255,
    )
  );
}

async function normalizePdfResponse(result: {
  blob: Blob;
  filename: string | null;
}) {
  const signature = await result.blob.slice(0, 5).text();

  if (signature === "%PDF-") {
    return result;
  }

  try {
    const payload = JSON.parse(await result.blob.text()) as unknown;

    if (isSerializedNodeBuffer(payload)) {
      const pdfBlob = new Blob([new Uint8Array(payload.data)], {
        type: "application/pdf",
      });

      if ((await pdfBlob.slice(0, 5).text()) === "%PDF-") {
        return {
          ...result,
          blob: pdfBlob,
        };
      }
    }
  } catch {
    // The response was neither a PDF nor the legacy serialized Buffer payload.
  }

  throw new Error(
    "El documento recibido no es un PDF válido. Intenta nuevamente.",
  );
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

export async function downloadQuotationDocument(quotationId: string) {
  const result = await getBlob(`/quotations/${quotationId}/pdf`, {
    accept: "application/pdf",
  });

  return normalizePdfResponse(result);
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

export async function downloadPublicQuotationDocument(publicToken: string) {
  const result = await getBlob(`/quotations/public/${publicToken}/pdf`, {
    accept: "application/pdf",
    ...publicRequestOptions,
  });

  return normalizePdfResponse(result);
}
