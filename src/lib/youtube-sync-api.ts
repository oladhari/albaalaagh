export interface YouTubeSyncItem {
  id?: string;
  snippet?: { title?: string; description?: string; publishedAt?: string; resourceId?: { videoId?: string } };
  contentDetails?: { videoId?: string; relatedPlaylists?: { uploads?: string } };
}
export interface YouTubeSyncResponse {
  items?: YouTubeSyncItem[];
  nextPageToken?: string;
  error?: { code?: number; errors?: { reason?: string }[] };
}

/** Per-run accounting and circuit breaker. Never include URLs/keys in errors. */
export class YouTubeSyncError extends Error {
  constructor(public readonly method: string, public readonly reason: string, public readonly status: number) {
    super(`YouTube ${method}: ${reason} (HTTP ${status})`);
  }
  get quotaExceeded() { return /quota|dailyLimit|rateLimit/i.test(this.reason); }
  get pauseRequired() { return this.quotaExceeded || this.status === 401 || this.status === 403; }
}
export class YouTubeBudgetError extends Error {
  constructor() { super("YouTube sync request budget reached; remaining playlist work deferred"); }
}
export class YouTubeSyncClient {
  readonly counts: Record<string, number> = {};
  total = 0;
  private stopped: Error | null = null;
  private readonly deadlineAt = Date.now() + 180_000;
  constructor(readonly limit = 160) {}
  get remaining() { return Date.now() >= this.deadlineAt ? 0 : Math.max(0, this.limit - this.total); }
  async request(url: URL): Promise<YouTubeSyncResponse> {
    if (this.stopped) throw this.stopped;
    if (!this.remaining) throw new YouTubeBudgetError();
    const method = url.pathname.split("/").pop() || "unknown";
    this.total++;
    this.counts[method] = (this.counts[method] || 0) + 1;
    try {
      const res = await fetch(url.toString(), { cache: "no-store", signal: AbortSignal.timeout(15_000) });
      const data = await res.json() as YouTubeSyncResponse;
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid response");
      if (res.ok === false || data.error) {
        const raw = data.error?.errors?.[0]?.reason;
        const reason = typeof raw === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(raw) ? raw : "requestFailed";
        const error = new YouTubeSyncError(method, reason, res.status || data.error?.code || 502);
        // All work is sequential: after a terminal response, no further API calls.
        if (error.pauseRequired || error.status >= 500) this.stopped = error;
        throw error;
      }
      return data;
    } catch (error) {
      if (error instanceof YouTubeSyncError) throw error;
      const safe = new YouTubeSyncError(method, "networkOrInvalidResponse", 502);
      this.stopped = safe;
      throw safe;
    }
  }
}

export function nextYouTubeQuotaReset(now = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" });
  const parts = Object.fromEntries(fmt.formatToParts(now).map(p => [p.type, p.value]));
  const reset = new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day + 1, 8));
  const hour = Number(fmt.formatToParts(reset).find(p => p.type === "hour")!.value);
  reset.setUTCHours(reset.getUTCHours() - hour); // midnight is UTC+8 in winter, UTC+7 in summer
  return reset.toISOString();
}
