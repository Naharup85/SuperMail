import { NextResponse } from "next/server";

export interface ApiErrorOptions {
  status?: number;
  code?: string;
  requestId?: string;
  headers?: Record<string, string>;
  details?: unknown;
}

/**
 * Strips internal stack traces, DB connection strings, and credential secrets from raw error messages.
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (!error) return "";
  const raw = error instanceof Error ? error.message : String(error);

  // Redact secrets and sensitive substrings
  return raw
    .replace(/(bearer\s+[\w.-]+)/gi, "[REDACTED_TOKEN]")
    .replace(/(key=[\w-]+)/gi, "[REDACTED_KEY]")
    .replace(/(postgres:\/\/[\S]+)/gi, "[REDACTED_DATABASE_URL]")
    .replace(/(mysql:\/\/[\S]+)/gi, "[REDACTED_DATABASE_URL]")
    .replace(/(mongodb(\+srv)?:\/\/[\S]+)/gi, "[REDACTED_DATABASE_URL]");
}

/**
 * Standardized API Error Response creator.
 * Ensures consistent error shapes and prevents secret leakage across all API endpoints.
 */
export function createApiErrorResponse(
  message: string,
  error?: unknown,
  options?: ApiErrorOptions,
): NextResponse {
  const status = options?.status ?? 500;
  const code = options?.code ?? (status === 401 ? "UNAUTHORIZED" : status === 403 ? "FORBIDDEN" : status === 429 ? "RATE_LIMITED" : status === 400 ? "BAD_REQUEST" : "INTERNAL_SERVER_ERROR");
  const requestId = options?.requestId;

  const isProduction = process.env.NODE_ENV === "production";
  const sanitizedDetails = error ? sanitizeErrorMessage(error) : undefined;

  const body: Record<string, unknown> = {
    error: message,
    code,
    ...(requestId ? { requestId } : {}),
    ...(options?.details ? { details: options.details } : {}),
    ...(!isProduction && sanitizedDetails ? { debugDetails: sanitizedDetails } : {}),
  };

  const responseHeaders = new Headers();
  if (options?.headers) {
    for (const [key, value] of Object.entries(options.headers)) {
      responseHeaders.set(key, value);
    }
  }
  if (requestId) {
    responseHeaders.set("X-Request-Id", requestId);
  }

  return NextResponse.json(body, {
    status,
    headers: responseHeaders,
  });
}
