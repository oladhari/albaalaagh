const buckets = new Map<string, number[]>();

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

/**
 * Best-effort in-memory sliding-window limiter, per server instance.
 * Enough to deter scripted flooding of a public read endpoint; not a
 * substitute for a shared store (Redis/Upstash) under multi-instance load.
 */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();

  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    for (const [k, timestamps] of buckets) {
      const fresh = timestamps.filter((t) => now - t < windowMs);
      if (fresh.length === 0) buckets.delete(k);
      else buckets.set(k, fresh);
    }
    lastCleanup = now;
  }

  const timestamps = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (timestamps.length >= limit) {
    buckets.set(key, timestamps);
    return true;
  }

  timestamps.push(now);
  buckets.set(key, timestamps);
  return false;
}
