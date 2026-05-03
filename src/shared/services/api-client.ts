import {
  clearAuthSession,
  getAuthAccessToken,
  getAuthBusinessId,
} from "@/shared/services/auth-session";

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function getApiBaseUrl() {
  return import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";
}

function buildApiUrl(path: string) {
  return `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseResponse<TResponse>(
  response: Response,
): Promise<TResponse> {
  const contentType = response.headers.get("content-type") ?? "";
  const isJsonResponse = contentType.includes("application/json");

  const payload = isJsonResponse
    ? ((await response.json()) as unknown)
    : await response.text();

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthSession();
    }

    const message = extractErrorMessage(payload) ?? response.statusText;

    throw new ApiError(message, response.status, payload);
  }

  return payload as TResponse;
}

function extractErrorMessage(payload: unknown) {
  if (typeof payload === "string") {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const message = Reflect.get(payload, "message");

  if (Array.isArray(message)) {
    return message.join(", ");
  }

  if (typeof message === "string") {
    return message;
  }

  return null;
}

type JsonRequestOptions = {
  accessToken?: string;
  businessId?: string;
};

type BlobRequestOptions = JsonRequestOptions & {
  accept?: string;
};

async function requestJson<TResponse, TBody = undefined>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: TBody,
  options?: JsonRequestOptions,
) {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const accessToken = options?.accessToken ?? getAuthAccessToken();
  const businessId = options?.businessId ?? getAuthBusinessId();

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  if (businessId) {
    headers["X-Business-Id"] = businessId;
  }

  const response = await fetch(buildApiUrl(path), {
    method,
    headers,
    ...(body !== undefined
      ? {
          body: JSON.stringify(body),
        }
      : {}),
  });

  return parseResponse<TResponse>(response);
}

export function getJson<TResponse>(path: string, options?: JsonRequestOptions) {
  return requestJson<TResponse>("GET", path, undefined, options);
}

export function postJson<TResponse, TBody>(
  path: string,
  body: TBody,
  options?: JsonRequestOptions,
) {
  return requestJson<TResponse, TBody>("POST", path, body, options);
}

export function patchJson<TResponse, TBody>(
  path: string,
  body: TBody,
  options?: JsonRequestOptions,
) {
  return requestJson<TResponse, TBody>("PATCH", path, body, options);
}

export function deleteJson<TResponse>(
  path: string,
  options?: JsonRequestOptions,
) {
  return requestJson<TResponse>("DELETE", path, undefined, options);
}

export async function getBlob(
  path: string,
  options?: BlobRequestOptions,
): Promise<{ blob: Blob; filename: string | null }> {
  const headers: Record<string, string> = {
    Accept: options?.accept ?? "*/*",
  };

  const accessToken = options?.accessToken ?? getAuthAccessToken();
  const businessId = options?.businessId ?? getAuthBusinessId();

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  if (businessId) {
    headers["X-Business-Id"] = businessId;
  }

  const response = await fetch(buildApiUrl(path), {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthSession();
    }

    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? ((await response.json()) as unknown)
      : await response.text();
    const message = extractErrorMessage(payload) ?? response.statusText;

    throw new ApiError(message, response.status, payload);
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get("content-disposition");
  const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/);

  return {
    blob,
    filename: filenameMatch?.[1] ?? null,
  };
}
