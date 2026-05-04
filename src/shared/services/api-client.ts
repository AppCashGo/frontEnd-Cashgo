import axios, { type AxiosError, type AxiosRequestConfig } from "axios";
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

const DEVELOPMENT_API_URL = "http://localhost:3000/api";
const PRODUCTION_API_URL = "https://backend-cashgo.onrender.com/api";
const LOCAL_API_HOSTS = ["localhost", "127.0.0.1"];

function getApiBaseUrl() {
  const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

  if (
    configuredApiUrl &&
    !(import.meta.env.PROD && isLocalApiUrl(configuredApiUrl))
  ) {
    return configuredApiUrl;
  }

  return import.meta.env.DEV ? DEVELOPMENT_API_URL : PRODUCTION_API_URL;
}

function isLocalApiUrl(url: string) {
  try {
    return LOCAL_API_HOSTS.includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
});

async function parseBlobErrorPayload(payload: unknown) {
  if (!(payload instanceof Blob)) {
    return payload;
  }

  const contentType = payload.type;
  const text = await payload.text();

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }

  return text;
}

async function toApiError(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return error;
  }

  const axiosError = error as AxiosError;
  const status = axiosError.response?.status ?? 0;
  const payload = await parseBlobErrorPayload(axiosError.response?.data);

  if (status === 401) {
    clearAuthSession();
  }

  const message =
    extractErrorMessage(payload) ??
    axiosError.response?.statusText ??
    axiosError.message;

  return new ApiError(message, status, payload);
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

function buildHeaders(
  options?: JsonRequestOptions,
  contentType?: "application/json",
) {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  const accessToken = options?.accessToken ?? getAuthAccessToken();
  const businessId = options?.businessId ?? getAuthBusinessId();

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  if (businessId) {
    headers["X-Business-Id"] = businessId;
  }

  return headers;
}

async function requestJson<TResponse, TBody = undefined>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: TBody,
  options?: JsonRequestOptions,
) {
  const requestConfig: AxiosRequestConfig<TBody> = {
    data: body,
    headers: buildHeaders(
      options,
      body !== undefined ? "application/json" : undefined,
    ),
    method,
    url: path,
  };

  try {
    const response = await apiClient.request<TResponse>(requestConfig);

    return response.data;
  } catch (error) {
    throw await toApiError(error);
  }
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
  try {
    const response = await apiClient.get<Blob>(path, {
      headers: {
        ...buildHeaders(options),
        Accept: options?.accept ?? "*/*",
      },
      responseType: "blob",
    });

    const contentDisposition = response.headers["content-disposition"];
    const filename = getFilenameFromContentDisposition(contentDisposition);

    return {
      blob: response.data,
      filename,
    };
  } catch (error) {
    throw await toApiError(error);
  }
}

function getFilenameFromContentDisposition(contentDisposition?: string) {
  const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/);

  return filenameMatch?.[1] ?? null;
}
