import { getAIAnalysisRunRepository } from "@/lib/repositories";

/**
 * Rate limit for AI calls, counted from `ai_analysis_runs`.
 *
 * This was a module-level `Map<number, number[]>`: per process, so two replicas
 * gave twice the allowance, a deploy reset every user's quota to zero, and the
 * map grew for the lifetime of the process because entries were never evicted.
 * It guards a metered paid API, so none of that was harmless.
 *
 * Every successful analysis already writes a row with a timestamp, so the table
 * IS the counter -- no second store, and nothing to keep in sync.
 */

const DEFAULT_MAX_CALLS = 5;
const DEFAULT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

export async function checkRateLimit(
  userId: number,
  maxCalls: number = DEFAULT_MAX_CALLS,
  windowMs: number = DEFAULT_WINDOW_MS
): Promise<RateLimitResult> {
  const { count, oldestAt } = await getAIAnalysisRunRepository().countRunsSince(userId, windowMs);

  if (count >= maxCalls) {
    // The window frees up when the oldest call in it ages out.
    const oldestMs = oldestAt != null ? Date.parse(oldestAt) : NaN;
    const retryAfterMs = Number.isFinite(oldestMs)
      ? Math.max(0, oldestMs + windowMs - Date.now())
      : windowMs;
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  return { allowed: true, remaining: maxCalls - count - 1 };
}

/**
 * Kept as a no-op so callers read the same way. The run row written by
 * `persistAIAnalysisRun` is the record; there is nothing else to record.
 */
export function recordCall(_userId: number): void {
  // intentionally empty -- see checkRateLimit
}
