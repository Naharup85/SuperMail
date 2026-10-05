export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in seconds
  retryAfterSeconds: number;
}

interface RateLimitRecord {
  timestamps: number[];
}

export class MemoryRateLimiter {
  private store = new Map<string, RateLimitRecord>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Optional periodic cleanup to prevent memory leaks in long-running processes
    if (typeof setInterval !== "undefined") {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
      if (this.cleanupInterval && typeof this.cleanupInterval.unref === "function") {
        this.cleanupInterval.unref();
      }
    }
  }

  public check(identifier: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const windowMs = config.windowSeconds * 1000;
    const windowStart = now - windowMs;

    let record = this.store.get(identifier);
    if (!record) {
      record = { timestamps: [] };
      this.store.set(identifier, record);
    }

    // Filter out timestamps older than the window
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    const resetTimestampSec = Math.ceil((now + windowMs) / 1000);

    if (record.timestamps.length >= config.maxRequests) {
      const oldestInWindow = record.timestamps[0] || now;
      const retryAfterMs = Math.max(0, oldestInWindow + windowMs - now);
      const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

      return {
        success: false,
        limit: config.maxRequests,
        remaining: 0,
        reset: Math.ceil((oldestInWindow + windowMs) / 1000),
        retryAfterSeconds: Math.max(1, retryAfterSeconds),
      };
    }

    // Record this request timestamp
    record.timestamps.push(now);

    return {
      success: true,
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - record.timestamps.length),
      reset: resetTimestampSec,
      retryAfterSeconds: 0,
    };
  }

  public reset(identifier?: string): void {
    if (identifier) {
      this.store.delete(identifier);
    } else {
      this.store.clear();
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const maxWindowMs = 3600 * 1000; // 1 hour max age
    for (const [key, record] of this.store.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < maxWindowMs);
      if (record.timestamps.length === 0) {
        this.store.delete(key);
      }
    }
  }
}

export const rateLimiter = new MemoryRateLimiter();

export const RATE_LIMIT_PRESETS = {
  chat: { maxRequests: 25, windowSeconds: 60 },
  chatAction: { maxRequests: 20, windowSeconds: 60 },
  cron: { maxRequests: 60, windowSeconds: 60 },
  automationRun: { maxRequests: 10, windowSeconds: 60 },
  gmailSend: { maxRequests: 15, windowSeconds: 60 },
  calendarMutation: { maxRequests: 25, windowSeconds: 60 },
  oauthConnect: { maxRequests: 15, windowSeconds: 60 },
  apiGeneral: { maxRequests: 120, windowSeconds: 60 },
} as const;

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.reset),
  };

  if (!result.success && result.retryAfterSeconds > 0) {
    headers["Retry-After"] = String(result.retryAfterSeconds);
  }

  return headers;
}
