import crypto from "crypto";

export interface LogContext {
  requestId?: string;
  userId?: string;
  tenantId?: string;
  route?: string;
  action?: string;
  durationMs?: number;
  statusCode?: number;
  [key: string]: unknown;
}

/**
 * Strips sensitive keys and values from logging metadata.
 */
export function sanitizeLogData<T>(data: T): T {
  if (!data || typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item)) as unknown as T;
  }

  const sensitiveKeys = [
    "authorization",
    "cookie",
    "token",
    "secret",
    "password",
    "kek",
    "dek",
    "key",
    "access_token",
    "refresh_token",
    "client_secret",
    "body",
  ];

  const sanitized: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    const isSensitive = sensitiveKeys.some((sk) => k.toLowerCase().includes(sk));
    if (isSensitive) {
      sanitized[k] = "[REDACTED]";
    } else if (typeof v === "object" && v !== null) {
      sanitized[k] = sanitizeLogData(v);
    } else if (typeof v === "string" && (v.startsWith("Bearer ") || v.includes("AIzaSy"))) {
      sanitized[k] = "[REDACTED_SECRET]";
    } else {
      sanitized[k] = v;
    }
  }

  return sanitized as T;
}

export class AppLogger {
  public static generateRequestId(): string {
    return `req_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  }

  public static info(message: string, context?: LogContext): void {
    const payload = {
      level: "info",
      timestamp: new Date().toISOString(),
      message,
      ...(context ? sanitizeLogData(context) : {}),
    };
    console.log(`[INFO] ${JSON.stringify(payload)}`);
  }

  public static warn(message: string, context?: LogContext): void {
    const payload = {
      level: "warn",
      timestamp: new Date().toISOString(),
      message,
      ...(context ? sanitizeLogData(context) : {}),
    };
    console.warn(`[WARN] ${JSON.stringify(payload)}`);
  }

  public static error(message: string, error?: unknown, context?: LogContext): void {
    const errMessage = error instanceof Error ? error.message : String(error || "");
    const safeError = errMessage.replace(/(bearer\s+[\w.-]+|key=[\w-]+|postgres:\/\/[\S]+)/gi, "[REDACTED]");

    const payload = {
      level: "error",
      timestamp: new Date().toISOString(),
      message,
      error: safeError,
      ...(context ? sanitizeLogData(context) : {}),
    };
    console.error(`[ERROR] ${JSON.stringify(payload)}`);
  }
}
