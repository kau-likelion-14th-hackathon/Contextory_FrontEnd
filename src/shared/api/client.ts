const API_BASE_URL = import.meta.env.VITE_CONTEXTORY_API_BASE_URL;
const APP_ENV = import.meta.env.VITE_CONTEXTORY_APP_ENV ?? "local";

export type ApiErrorKind =
  | "configuration"
  | "network"
  | "aborted"
  | "unauthorized"
  | "forbidden"
  | "notFound"
  | "server"
  | "unknown";

export type ApiErrorDetails = {
  kind: ApiErrorKind;
  status?: number;
  bodyText?: string;
  bodyJson?: unknown;
};

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly bodyText?: string;
  readonly bodyJson?: unknown;

  constructor(message: string, details: ApiErrorDetails) {
    super(message);
    this.name = "ApiError";
    this.kind = details.kind;
    this.status = details.status;
    this.bodyText = details.bodyText;
    this.bodyJson = details.bodyJson;
  }
}

export const apiConfig = {
  baseUrl: API_BASE_URL,
  appEnv: APP_ENV,
};

export type AuthHeaderProvider = () => string | undefined;
export type UnauthorizedHandler = () => Promise<string | undefined>;

let authHeaderProvider: AuthHeaderProvider | undefined;
let unauthorizedHandler: UnauthorizedHandler | undefined;

export function setAuthHeaderProvider(provider: AuthHeaderProvider | undefined) {
  authHeaderProvider = provider;
}

export function setUnauthorizedHandler(handler: UnauthorizedHandler | undefined) {
  unauthorizedHandler = handler;
}

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  accessToken?: string;
  authenticated?: boolean;
  retryUnauthorized?: boolean;
};

export type ApiResponse<TResult> = {
  isSuccess: boolean;
  code: string;
  message: string;
  result: TResult;
};

export function getErrorKind(status: number): ApiErrorKind {
  if (status === 401) {
    return "unauthorized";
  }

  if (status === 403) {
    return "forbidden";
  }

  if (status === 404) {
    return "notFound";
  }

  if (status >= 500) {
    return "server";
  }

  return "unknown";
}

function parseJsonSafely(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function buildUrl(path: string) {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  return `${API_BASE_URL}${path}`;
}

function getResponseMessage(body: unknown) {
  if (!body || typeof body !== "object" || !("message" in body)) return undefined;
  return typeof body.message === "string" ? body.message : undefined;
}

export async function requestJson<TResponse>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  if (!API_BASE_URL) {
    throw new ApiError(
      "Contextory API base URL is not configured. Set VITE_CONTEXTORY_API_BASE_URL in the current Vite environment file.",
      { kind: "configuration" },
    );
  }

  const {
    accessToken,
    authenticated = true,
    body: requestBody,
    retryUnauthorized = true,
    ...requestInit
  } = options;
  const headers = new Headers(requestInit.headers);
  headers.set("Accept", "application/json");

  let body: BodyInit | undefined;

  if (requestBody !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(requestBody);
  }

  const authHeader = authenticated
    ? accessToken
      ? `Bearer ${accessToken}`
      : authHeaderProvider?.()
    : undefined;

  if (authHeader) {
    headers.set("Authorization", authHeader);
  }

  let response: Response;

  try {
    response = await fetch(buildUrl(path), {
      credentials: "include",
      ...requestInit,
      headers,
      body,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new ApiError("Request was aborted.", {
        kind: "aborted",
      });
    }

    throw new ApiError("Network request failed.", {
      kind: "network",
    });
  }

  const responseText = await response.text();
  const responseJson = responseText ? parseJsonSafely(responseText) : undefined;

  if (response.status === 401 && retryUnauthorized && unauthorizedHandler) {
    let nextAccessToken: string | undefined;

    try {
      nextAccessToken = await unauthorizedHandler();
    } catch {
      nextAccessToken = undefined;
    }

    if (nextAccessToken) {
      return requestJson<TResponse>(path, {
        ...options,
        accessToken: nextAccessToken,
        retryUnauthorized: false,
      });
    }
  }

  if (!response.ok) {
    throw new ApiError(
      getResponseMessage(responseJson) ?? `Request failed with status ${response.status}.`,
      {
        kind: getErrorKind(response.status),
        status: response.status,
        bodyText: responseText || undefined,
        bodyJson: responseJson,
      },
    );
  }

  if (response.status === 204 || !responseText) {
    return undefined as TResponse;
  }

  return responseJson as TResponse;
}

export async function requestApiResult<TResult>(
  path: string,
  options: ApiRequestOptions = {},
) {
  const response = await requestJson<ApiResponse<TResult>>(path, options);

  if (!response?.isSuccess) {
    throw new ApiError(response?.message || "API request failed.", {
      kind: "unknown",
      bodyJson: response,
    });
  }

  return response.result;
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) return fallback;

  const responseMessage = getResponseMessage(error.bodyJson);
  if (responseMessage) return responseMessage;
  if (error.kind === "configuration") return "API 서버 주소가 설정되지 않았습니다.";
  if (error.kind === "network") return "네트워크 연결을 확인한 뒤 다시 시도해주세요.";
  if (error.kind === "server") return "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  if (error.kind === "unauthorized" || error.kind === "forbidden") return fallback;

  return error.message === "API request failed." ? fallback : error.message;
}
