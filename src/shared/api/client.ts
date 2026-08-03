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

let authHeaderProvider: AuthHeaderProvider | undefined;

export function setAuthHeaderProvider(provider: AuthHeaderProvider | undefined) {
  authHeaderProvider = provider;
}

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  accessToken?: string;
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

  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  let body: BodyInit | undefined;

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  const authHeader = options.accessToken
    ? `Bearer ${options.accessToken}`
    : authHeaderProvider?.();

  if (authHeader) {
    headers.set("Authorization", authHeader);
  }

  let response: Response;

  try {
    response = await fetch(buildUrl(path), {
      ...options,
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

  if (!response.ok) {
    throw new ApiError(`Request failed with status ${response.status}.`, {
      kind: getErrorKind(response.status),
      status: response.status,
      bodyText: responseText || undefined,
      bodyJson: responseJson,
    });
  }

  if (response.status === 204 || !responseText) {
    return undefined as TResponse;
  }

  return responseJson as TResponse;
}
