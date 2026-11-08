import { afterEach, expect, it, vi } from "vitest";
import { YouTubeSyncClient, YouTubeSyncError, nextYouTubeQuotaReset } from "../youtube-sync-api";
import type { YouTubeSyncState } from "../youtube-sync-state";
const state = (): YouTubeSyncState => ({ version: 1, playlists: {}, nextPlaylistIndex: 0 });
const response = (data: unknown, status = 200) => ({ ok: status < 400, status, json: async () => data });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });
it("enforces a shared request budget before issuing another HTTP request", async () => {
  const fetch = vi.fn(async () => response({ items: [] })); vi.stubGlobal("fetch", fetch);
  const client = new YouTubeSyncClient(2);
  const url = new URL("https://www.googleapis.com/youtube/v3/videos?key=do-not-log");
  await client.request(url); await client.request(url);
  await expect(client.request(url)).rejects.toThrow("budget");
  expect(fetch).toHaveBeenCalledTimes(2); expect(client.counts).toEqual({ videos: 2 });
});
it("breaks on quota and exposes only safe method/reason/status, never URLs or keys", async () => {
  const fetch = vi.fn(async () => response({ error: { code: 403, message: "secret-key", errors: [{ reason: "quotaExceeded" }] } }, 403)); vi.stubGlobal("fetch", fetch);
  const c = new YouTubeSyncClient();
  const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems?key=secret-key");
  await expect(c.request(url)).rejects.toThrow("YouTube playlistItems: quotaExceeded (HTTP 403)");
  await expect(c.request(url)).rejects.toBeInstanceOf(YouTubeSyncError);
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("reuses cached membership without any historical requests", async () => {
  vi.stubEnv("YOUTUBE_API_KEY", "test-key"); const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  const s = state(); s.playlists.show = { members: ["wanted"], pendingMembers: [] };
  const { fetchPlaylistVideoMembership } = await import("../youtube");
  const r = await fetchPlaylistVideoMembership([{ id: "show", title: "Show" }], new Set(["wanted"]), s, new YouTubeSyncClient(4));
  expect(r.membership.get("wanted")).toBe("show"); expect(fetch).not.toHaveBeenCalled();
});
it("bounds a wide playlist inventory and never walks playlists concurrently", async () => {
  vi.stubEnv("YOUTUBE_API_KEY", "test-key"); let active = 0, maxActive = 0;
  const fetch = vi.fn(async () => { active++; maxActive = Math.max(active, maxActive); await Promise.resolve(); active--; return response({ items: [], nextPageToken: "older" }); }); vi.stubGlobal("fetch", fetch);
  const { fetchPlaylistVideoMembership } = await import("../youtube");
  const r = await fetchPlaylistVideoMembership(Array.from({ length: 100 }, (_, n) => ({ id: `pl-${n}`, title: "Show" })), new Set(["missing"]), state(), new YouTubeSyncClient(10));
  expect(fetch).toHaveBeenCalledTimes(10); expect(maxActive).toBe(1); expect(r.complete).toBe(false);
});
it("resumes older pages from the saved cursor instead of restarting history", async () => {
  vi.stubEnv("YOUTUBE_API_KEY", "test-key");
  const fetch = vi.fn(async (input: string) => { const token = new URL(input).searchParams.get("pageToken"); return response(token === "page-2" ? { items: [{ contentDetails: { videoId: "wanted" } }] } : { items: [], nextPageToken: token === "page-1" ? "page-2" : "page-1" }); }); vi.stubGlobal("fetch", fetch);
  const { fetchPlaylistVideoMembership } = await import("../youtube"); const s = state(); const lists = [{ id: "show", title: "Show" }];
  await fetchPlaylistVideoMembership(lists, new Set(["wanted"]), s, new YouTubeSyncClient(2));
  expect(s.playlists.show.nextPageToken).toBe("page-2");
  fetch.mockClear(); const r = await fetchPlaylistVideoMembership(lists, new Set(["wanted"]), s, new YouTubeSyncClient(2));
  expect(r.membership.get("wanted")).toBe("show");
  expect(fetch.mock.calls.map(x => new URL(x[0]).searchParams.get("pageToken"))).toEqual([null, "page-2"]);
});
it("stops repeated playlist page tokens rather than looping to quota exhaustion", async () => {
  vi.stubEnv("YOUTUBE_API_KEY", "test-key"); const fetch = vi.fn(async () => response({ items: [], nextPageToken: "repeat" })); vi.stubGlobal("fetch", fetch);
  const { fetchPlaylistVideoMembership } = await import("../youtube");
  const r = await fetchPlaylistVideoMembership([{ id: "show", title: "Show" }], new Set(["missing"]), state(), new YouTubeSyncClient(100));
  expect(fetch).toHaveBeenCalledTimes(2); expect(r.warnings.join(" ")).toContain("repeated page token"); expect(r.complete).toBe(false);
});
it("calculates midnight Pacific quota cooldowns in winter and summer", () => {
  expect(nextYouTubeQuotaReset(new Date("2026-11-08T12:00:00Z"))).toBe("2026-11-09T08:00:00.000Z");
  expect(nextYouTubeQuotaReset(new Date("2026-07-08T12:00:00Z"))).toBe("2026-07-09T07:00:00.000Z");
});
it("rotates fresh playlist checks when the budget cannot cover the whole inventory", async () => {
  vi.stubEnv("YOUTUBE_API_KEY", "test-key");
  const fetch = vi.fn(async () => response({ items: [] })); vi.stubGlobal("fetch", fetch);
  const { fetchPlaylistVideoMembership } = await import("../youtube"); const s = state();
  const lists = Array.from({ length: 8 }, (_, i) => ({ id: `show-${i}`, title: "Show" }));
  await fetchPlaylistVideoMembership(lists, new Set(["missing"]), s, new YouTubeSyncClient(4));
  const r = await fetchPlaylistVideoMembership(lists, new Set(["missing"]), s, new YouTubeSyncClient(4));
  expect(fetch.mock.calls.map(x => new URL((x as unknown as [string])[0]).searchParams.get("playlistId"))).toEqual(["show-0", "show-1", "show-2", "show-3"]);
  expect(r.complete).toBe(false);
});
it("resets an expired historical cursor rather than failing on it forever", async () => {
  vi.stubEnv("YOUTUBE_API_KEY", "test-key");
  const fetch = vi.fn(async (input: string) => new URL(input).searchParams.has("pageToken") ? response({ error: { errors: [{ reason: "invalidPageToken" }] } }, 400) : response({ items: [], nextPageToken: "first-older" })); vi.stubGlobal("fetch", fetch);
  const s = state(); s.playlists.show = { members: ["other"], pendingMembers: [], nextPageToken: "expired" };
  const { fetchPlaylistVideoMembership } = await import("../youtube");
  const { YouTubeSyncClient: Client } = await import("../youtube-sync-api");
  const r = await fetchPlaylistVideoMembership([{ id: "show", title: "Show" }], new Set(["missing"]), s, new Client(5));
  expect(s.playlists.show.nextPageToken).toBeUndefined();
  expect(r.warnings.join(" ")).toContain("expired page cursor"); expect(fetch).toHaveBeenCalledTimes(2);
});

it("stops before the function timeout so playlist progress can be persisted", async () => {
  vi.useFakeTimers(); const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  const c = new YouTubeSyncClient(); vi.advanceTimersByTime(180_001);
  await expect(c.request(new URL("https://www.googleapis.com/youtube/v3/videos"))).rejects.toThrow("budget");
  expect(fetch).not.toHaveBeenCalled();
});
