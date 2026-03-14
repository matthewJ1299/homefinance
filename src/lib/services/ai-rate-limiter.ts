/**
 * In-memory rate limiter for AI (e.g. Gemini) calls per user.
 * Tracks timestamps per user and allows a fixed number of calls per window.
 */

const DEFAULT_MAX_CALLS = 5;
const DEFAULT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

const timestampsByUser = new Map<number, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

export function checkRateLimit(
  userId: number,
  maxCalls: number = DEFAULT_MAX_CALLS,
  windowMs: number = DEFAULT_WINDOW_MS
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  let timestamps = timestampsByUser.get(userId) ?? [];
  timestamps = timestamps.filter((t) => t > cutoff);
  timestampsByUser.set(userId, timestamps);

  if (timestamps.length >= maxCalls) {
    const oldestInWindow = Math.min(...timestamps);
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: oldestInWindow + windowMs - now,
    };
  }

  return {
    allowed: true,
    remaining: maxCalls - timestamps.length - 1,
  };
}

export function recordCall(userId: number): void {
  const now = Date.now();
  const timestamps = timestampsByUser.get(userId) ?? [];
  timestamps.push(now);
  timestampsByUser.set(userId, timestamps);
}
