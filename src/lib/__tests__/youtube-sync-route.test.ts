vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
import { revalidateTag } from "next/cache";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ uploads: vi.fn(), names: vi.fn(), membership: vi.fn(), from: vi.fn(), load: vi.fn(), save: vi.fn() }));
vi.mock("@/lib/youtube", () => ({ fetchNewestUploadsDetailed: mocks.uploads, fetchPlaylistNames: mocks.names, fetchPlaylistVideoMembership: mocks.membership }));
vi.mock("@/lib/youtube-sync-state", () => ({ loadYouTubeSyncState: mocks.load, saveYouTubeSyncState: mocks.save, emptyYouTubeSyncState: () => ({ version: 1, playlists: {}, nextPlaylistIndex: 0 }) }));
beforeEach(() => { mocks.load.mockResolvedValue({ version: 1, playlists: {}, nextPlaylistIndex: 0 }); mocks.save.mockResolvedValue(undefined); });
vi.mock("@/lib/supabase", () => ({ supabaseAdmin: { from: mocks.from } }));
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
it("batches missing uploads and repairs playlist assignments without replacing archived media", async () => {
  vi.stubEnv("CRON_SECRET", "test-secret");
  const insert = vi.fn(async () => ({ error: null }));
  const update = vi.fn(() => ({ in: vi.fn(async () => ({ error: null })) }));
  mocks.uploads.mockResolvedValue(Array.from({ length: 202 }, (_, i) => ({ videoId: `video-${i}`, title: `Episode ${i}`, publishedAt: "2026-11-01T00:00:00Z", isLivestream: false })));
  mocks.names.mockResolvedValue([{ id: "yt-show", title: "Show" }]);
  mocks.membership.mockResolvedValue({ membership: new Map(Array.from({ length: 202 }, (_, i) => [`video-${i}`, "yt-show"])), complete: true, warnings: [] });
  mocks.from.mockImplementation((table: string) => table === "playlists" ? { select: async () => ({ data: [{ id: "show", name: "Show" }] }) } : {
    select: () => ({ or: async (query: string) => ({ data: query.includes("youtube_video_id.eq.video-0,") ? [{ id: "archived", youtube_video_id: "video-0", video_url: "https://media.albaalaagh.com/archived.mp4", playlist_id: null }] : [] }) }), insert, update,
  });
  const { GET } = await import("@/app/api/cron/sync-youtube-videos/route");
  const response = await GET(new Request("https://example.com", { headers: { "x-cron-secret": "test-secret" } }) as never);
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ inserted: 201, repairedPlaylists: 1, skippedExisting: 1 });
  expect(insert.mock.calls.map(call => (call as unknown as [unknown[]])[0].length)).toEqual([100, 100, 1]);
  expect(update).toHaveBeenCalledWith({ playlist_id: "show" });
  expect(revalidateTag).toHaveBeenCalledWith("public-programmes", { expire: 0 });
});
it("rejects unauthenticated requests when the secret is missing", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("CRON_SECRET", "");
  const { GET } = await import("@/app/api/cron/sync-youtube-videos/route");
  expect((await GET(new Request("https://example.com") as never)).status).toBe(401);
});
it("creates missing programme records before assigning their episodes", async () => {
  vi.stubEnv("CRON_SECRET", "test-secret");
  mocks.uploads.mockResolvedValue([]);
  mocks.names.mockResolvedValue([{ id: "new-yt", title: "New programme" }]);
  mocks.membership.mockResolvedValue({ membership: new Map(), complete: true, warnings: [] });
  const insert = vi.fn(() => ({ select: () => ({ single: async () => ({ data: { id: "new-show" }, error: null }) }) }));
  mocks.from.mockReturnValue({ select: async () => ({ data: [], error: null }), insert });
  const { GET } = await import("@/app/api/cron/sync-youtube-videos/route");
  const response = await GET(new Request("https://example.com", { headers: { "x-cron-secret": "test-secret" } }) as never);
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ createdPlaylists: 1 });
  expect(insert).toHaveBeenCalledWith({ name: "New programme", display_order: 0 });
});

it("does not expire programme summaries when nothing changed", async () => {
  vi.stubEnv("CRON_SECRET", "test-secret");
  mocks.uploads.mockResolvedValue([]);
  mocks.names.mockResolvedValue([]);
  mocks.membership.mockResolvedValue({ membership: new Map(), complete: true, warnings: [] });
  mocks.from.mockReturnValue({ select: async () => ({ data: [], error: null }) });
  const { GET } = await import("@/app/api/cron/sync-youtube-videos/route");
  const response = await GET(new Request("https://example.com", { headers: { "x-cron-secret": "test-secret" } }) as never);
  expect(response.status).toBe(200);
  expect(revalidateTag).not.toHaveBeenCalled();
});

it("skips playlist walks for videos with known programme assignments", async () => {
  vi.stubEnv("CRON_SECRET", "test-secret");
  mocks.uploads.mockResolvedValue([{ videoId: "known", title: "Known", publishedAt: "2026-11-01", isLivestream: false }]);
  mocks.names.mockResolvedValue([]);
  mocks.from.mockImplementation((table: string) => table === "playlists" ? { select: async () => ({ data: [] }) } : { select: () => ({ or: async () => ({ data: [{ id: "row", youtube_video_id: "known", video_url: "https://media.albaalaagh.com/known.mp4", playlist_id: "existing" }] }) }) });
  const { GET } = await import("@/app/api/cron/sync-youtube-videos/route");
  const res = await GET(new Request("https://example.com", { headers: { "x-cron-secret": "test-secret" } }) as never);
  expect(res.status).toBe(200);
  expect(mocks.membership).not.toHaveBeenCalled();
});
it("does no API work during a persisted quota cooldown", async () => {
  vi.stubEnv("CRON_SECRET", "test-secret");
  mocks.load.mockResolvedValue({ version: 1, playlists: {}, nextPlaylistIndex: 0, blockedUntil: "2099-01-01T00:00:00Z" });
  const { GET } = await import("@/app/api/cron/sync-youtube-videos/route");
  const res = await GET(new Request("https://example.com", { headers: { "x-cron-secret": "test-secret" } }) as never);
  expect(await res.json()).toMatchObject({ skipped: "youtube_cooldown", youtubeRequests: 0 });
  expect(mocks.uploads).not.toHaveBeenCalled();
  expect(mocks.names).not.toHaveBeenCalled();
});
it("imports fetched public videos even when optional playlist scanning hits quota", async () => {
  vi.stubEnv("CRON_SECRET", "test-secret");
  mocks.uploads.mockResolvedValue([{ videoId: "new", title: "New", publishedAt: "2026-11-01", isLivestream: false }]);
  mocks.names.mockResolvedValue([{ id: "yt-show", title: "Show" }]);
  const { YouTubeSyncError } = await import("../youtube-sync-api");
  mocks.membership.mockRejectedValue(new YouTubeSyncError("playlistItems", "quotaExceeded", 403));
  const insert = vi.fn(async () => ({ error: null }));
  mocks.from.mockImplementation((table: string) => table === "playlists" ? { select: async () => ({ data: [{ id: "show", name: "Show" }] }) } : { select: () => ({ or: async () => ({ data: [] }) }), insert });
  const { GET } = await import("@/app/api/cron/sync-youtube-videos/route");
  const res = await GET(new Request("https://example.com", { headers: { "x-cron-secret": "test-secret" } }) as never);
  expect(await res.json()).toMatchObject({ inserted: 1, playlistScanComplete: false, warnings: [expect.stringContaining("quotaExceeded")], youtubePausedUntil: expect.any(String) });
  expect(insert).toHaveBeenCalledWith([expect.objectContaining({ youtube_video_id: "new", published: true })]);
  expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ blockedUntil: expect.any(String) }));
});
