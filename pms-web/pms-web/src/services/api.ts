/**
 * Centralized Laravel API client.
 *
 * Every page imports `apiRequest(path, options)` and expects a parsed JSON
 * body back (or an ApiError thrown for non-2xx responses). This module owns
 * the base URL, auth header and JSON handling so pages never talk to
 * `fetch` directly.
 */

const DEFAULT_API_BASE = "http://127.0.0.1:8000/api";

/**
 * Base URL for the Laravel API. Override with `VITE_API_BASE_URL` in an
 * `.env` file when the backend is not running on the default host/port.
 */
export const API_BASE =
  (typeof import.meta !== "undefined" &&
    (import.meta as ImportMeta).env?.VITE_API_BASE_URL?.trim()) ||
  DEFAULT_API_BASE;

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function getStoredToken(): string | null {
  try {
    return localStorage.getItem("token") ?? sessionStorage.getItem("token");
  } catch {
    // Storage may be unavailable (privacy mode, blocked cookies, etc.)
    return null;
  }
}

function extractMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;

    if (typeof record.message === "string" && record.message.trim()) {
      return record.message;
    }

    if (record.errors && typeof record.errors === "object") {
      const firstField = Object.values(
        record.errors as Record<string, unknown>
      )[0];
      const firstMessage = Array.isArray(firstField) ? firstField[0] : null;
      if (typeof firstMessage === "string" && firstMessage.trim()) {
        return firstMessage;
      }
    }
  }

  return fallback;
}

const AUTH_SCHEME = "Bearer";

/**
 * Makes a request against the Laravel API and returns the parsed JSON body.
 *
 * - Adds `Accept: application/json` and, when a body is present,
 *   `Content-Type: application/json` (unless already set by the caller).
 * - Attaches an `Authorization` header with the stored Sanctum token, when
 *   one is present.
 * - Parses the response body as JSON when possible; falls back to `null`
 *   for empty/non-JSON bodies instead of throwing.
 * - Throws `ApiError` for any non-2xx response so callers can surface the
 *   real backend error message.
 */
export async function apiRequest(
  path: string,
  options: RequestInit = {}
): Promise<unknown> {
  const headers = new Headers(options.headers);

  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = getStoredToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `${AUTH_SCHEME} ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      "Could not reach the server. Check your connection and try again.",
      0,
      null
    );
  }

  const rawBody = await response.text();
  let data: unknown = null;

  if (rawBody) {
    try {
      data = JSON.parse(rawBody);
    } catch {
      // Non-JSON body (e.g. an HTML error page from a misconfigured
      // backend). Keep `data` as null rather than throwing here so the
      // status-code check below can still produce a useful error.
      data = null;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      extractMessage(data, `Request failed with status ${response.status}.`),
      response.status,
      data
    );
  }

  return data;
}
