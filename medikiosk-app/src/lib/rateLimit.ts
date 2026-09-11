/**
 * In-memory sliding-window rate limiter. Adequate for a single-process demo
 * deployment; a production multi-instance deployment should back this with
 * Postgres or Redis instead.
 */
const buckets = new Map<string, number[]>();

export function checkRateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (timestamps.length >= maxAttempts) {
    buckets.set(key, timestamps);
    return false;
  }

  timestamps.push(now);
  buckets.set(key, timestamps);
  return true;
}
