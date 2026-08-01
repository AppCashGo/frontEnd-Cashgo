import axios, { type AxiosError, type AxiosRequestConfig } from "axios";
import {
  clearAuthSession,
  getAuthAccessToken,
  getAuthBusinessId,
  notifyAuthSessionExpired,
} from "@/shared/services/auth-session";

export class ApiError extends Error {
  status: number;
  details: unknown;
  kind: ApiErrorKind;
  userMessage: string;
  code?: string;
  fieldErrors?: Record<string, string[]>;
  isNetworkError: boolean;

  constructor(
    message: string,
    status: number,
    details: unknown,
    options: ApiErrorOptions = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
    this.kind = options.kind ?? getApiErrorKindFromStatus(status);
    this.userMessage = options.userMessage ?? message;
    this.code = options.code;
    this.fieldErrors = options.fieldErrors;
    this.isNetworkError =
      options.isNetworkError ?? (this.kind === "network" || status === 0);
  }
}

export type ApiErrorKind =
  | "network"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation"
  | "conflict"
  | "unavailable"
  | "server"
  | "unknown";

type ApiErrorOptions = {
  kind?: ApiErrorKind;
  userMessage?: string;
  code?: string;
  fieldErrors?: Record<string, string[]>;
  isNetworkError?: boolean;
};

export type ApiErrorPayload = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
  code?: string;
  details?: unknown;
  errors?: unknown;
  fieldErrors?: Record<string, string[]>;
};

export type ApiSuccess<TData> =
  | TData
  | {
      data: TData;
      message?: string;
      meta?: Record<string, unknown>;
    };

const DEVELOPMENT_API_URL = "http://localhost:3000/api";
const PRODUCTION_API_URL = "/api";
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

function getApiAssetBaseUrl() {
  const apiBaseUrl = getApiBaseUrl();

  return apiBaseUrl.endsWith("/api") ? apiBaseUrl.slice(0, -4) : apiBaseUrl;
}

export function resolveApiAssetUrl(url?: string | null) {
  if (!url) {
    return null;
  }

  if (/^(blob:|data:|https?:\/\/)/i.test(url)) {
    return url;
  }

  return `${getApiAssetBaseUrl()}${url.startsWith("/") ? url : `/${url}`}`;
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
  if (error instanceof ApiError) {
    return error;
  }

  if (!axios.isAxiosError(error)) {
    return normalizeApiError(error);
  }

  const axiosError = error as AxiosError<ApiErrorPayload | Blob | string>;
  const status = axiosError.response?.status ?? 0;
  const payload = await parseBlobErrorPayload(axiosError.response?.data);
  const kind = getApiErrorKindFromStatus(status, !axiosError.response);

  if (status === 401) {
    clearAuthSession();
    notifyAuthSessionExpired();
  }

  const rawMessage =
    extractErrorMessage(payload) ??
    axiosError.response?.statusText ??
    axiosError.message;
  const userMessage = getApiErrorUserMessage(kind, rawMessage);

  return new ApiError(userMessage, status, payload, {
    code: extractErrorCode(payload),
    fieldErrors: extractFieldErrors(payload),
    isNetworkError: !axiosError.response,
    kind,
    userMessage,
  });
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

function extractErrorCode(payload: unknown) {
  if (!isRecord(payload)) {
    return undefined;
  }

  const code = payload.code;

  return typeof code === "string" ? code : undefined;
}

function extractFieldErrors(payload: unknown) {
  if (!isRecord(payload)) {
    return undefined;
  }

  const directFieldErrors = payload.fieldErrors;

  if (isStringArrayRecord(directFieldErrors)) {
    return directFieldErrors;
  }

  const errors = payload.errors;

  if (isStringArrayRecord(errors)) {
    return errors;
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStringArrayRecord(
  value: unknown,
): value is Record<string, string[]> {
  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every(
    (entry) =>
      Array.isArray(entry) && entry.every((item) => typeof item === "string"),
  );
}

function getApiErrorKindFromStatus(
  status: number,
  isNetworkError = false,
): ApiErrorKind {
  if (isNetworkError || status === 0) {
    return "network";
  }

  if (status === 401) {
    return "unauthorized";
  }

  if (status === 403) {
    return "forbidden";
  }

  if (status === 404) {
    return "not_found";
  }

  if (status === 409) {
    return "conflict";
  }

  if (status === 422 || status === 400) {
    return "validation";
  }

  if (status === 503) {
    return "unavailable";
  }

  if (status >= 500) {
    return "server";
  }

  return "unknown";
}

function getApiErrorUserMessage(kind: ApiErrorKind, rawMessage?: string | null) {
  const normalizedMessage = rawMessage?.trim();

  if (kind === "validation" && normalizedMessage) {
    return normalizedMessage;
  }

  if (kind === "conflict" && normalizedMessage) {
    return normalizedMessage;
  }

  switch (kind) {
    case "network":
      return "No pudimos conectarnos con el servidor. Revisa tu conexión e intenta nuevamente.";
    case "unauthorized":
      return "Tu sesión expiró. Inicia sesión nuevamente para continuar.";
    case "forbidden":
      return "No tienes permisos para realizar esta acción.";
    case "not_found":
      return "No encontramos la información solicitada.";
    case "validation":
      return "Revisa los datos ingresados e intenta nuevamente.";
    case "conflict":
      return "No pudimos completar la acción porque hay información en conflicto.";
    case "unavailable":
      return "El servicio no está disponible en este momento. Intenta nuevamente en unos minutos.";
    case "server":
      return "Ocurrió un problema en el servidor. Intenta nuevamente en unos minutos.";
    default:
      return normalizedMessage || "No pudimos completar la acción. Intenta nuevamente.";
  }
}

export function normalizeApiError(
  error: unknown,
  fallbackMessage = "No pudimos completar la acción. Intenta nuevamente.",
) {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const kind = getApiErrorKindFromStatus(status, !error.response);
    const rawMessage =
      extractErrorMessage(error.response?.data) ??
      error.response?.statusText ??
      error.message;
    const userMessage = getApiErrorUserMessage(kind, rawMessage);

    if (status === 401) {
      clearAuthSession();
      notifyAuthSessionExpired();
    }

    return new ApiError(userMessage, status, error.response?.data ?? error, {
      code: extractErrorCode(error.response?.data),
      fieldErrors: extractFieldErrors(error.response?.data),
      isNetworkError: !error.response,
      kind,
      userMessage,
    });
  }

  if (error instanceof Error) {
    return new ApiError(error.message || fallbackMessage, 0, error, {
      kind: "unknown",
      userMessage: error.message || fallbackMessage,
    });
  }

  return new ApiError(fallbackMessage, 0, error, {
    kind: "unknown",
    userMessage: fallbackMessage,
  });
}

export function getApiErrorMessage(
  error: unknown,
  fallbackMessage = "No pudimos completar la acción. Intenta nuevamente.",
) {
  return normalizeApiError(error, fallbackMessage).userMessage;
}

export function shouldRetryApiError(
  error: unknown,
  failureCount: number,
  maxRetries = 1,
) {
  if (failureCount >= maxRetries) {
    return false;
  }

  const apiError = normalizeApiError(error);

  return apiError.kind === "network" || apiError.kind === "server";
}

export function unwrapApiSuccess<TData>(payload: ApiSuccess<TData>) {
  if (!isRecord(payload) || !("data" in payload)) {
    return payload as TData;
  }

  const keys = Object.keys(payload);
  const isApiEnvelope = keys.every((key) =>
    ["data", "message", "meta"].includes(key),
  );

  return isApiEnvelope ? (payload.data as TData) : (payload as TData);
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
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
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

async function requestFormData<TResponse>(
  method: "POST" | "PATCH",
  path: string,
  body: FormData,
  options?: JsonRequestOptions,
) {
  try {
    const response = await apiClient.request<TResponse>({
      data: body,
      headers: buildHeaders(options),
      method,
      url: path,
    });

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

export function putJson<TResponse, TBody>(
  path: string,
  body: TBody,
  options?: JsonRequestOptions,
) {
  return requestJson<TResponse, TBody>("PUT", path, body, options);
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

export function postFormData<TResponse>(
  path: string,
  body: FormData,
  options?: JsonRequestOptions,
) {
  return requestFormData<TResponse>("POST", path, body, options);
}

export function patchFormData<TResponse>(
  path: string,
  body: FormData,
  options?: JsonRequestOptions,
) {
  return requestFormData<TResponse>("PATCH", path, body, options);
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
