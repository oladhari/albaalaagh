import { afterEach, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });

it("recovers an episode beyond upload 100 and stops at the time cutoff", async () => {
  vi.stubEnv("YOUTUBE_API_KEY", "test-key");
  let pages = 0;
  const details: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: string) => {
    const u = new URL(input);
    let data;
    if (u.pathname.endsWith("/channels")) data = { items: [{ contentDetails: { relatedPlaylists: { uploads: "uploads" } } }] };
    else if (u.pathname.endsWith("/playlistItems")) {
      const page = Number(u.searchParams.get("pageToken") ?? 0); pages++;
      data = { items: Array.from({ length: 50 }, (_, n) => ({ snippet: {
        publishedAt: page === 4 && n >= 25 ? "2026-10-01T00:00:00Z" : "2026-10-19T00:00:00Z",
        resourceId: { videoId: page * 50 + n === 221 ? "jO091aoKuQ4" : `video-${page * 50 + n}` },
      } })), nextPageToken: String(page + 1) };
    } else {
      const ids = u.searchParams.get("id")!.split(","); details.push(...ids);
      data = { items: ids.map(id => ({ id, snippet: { title: id, publishedAt: "2026-10-19T00:00:00Z" }, liveStreamingDetails: { actualStartTime: "2026-10-18T20:39:02Z", actualEndTime: "2026-10-19T00:13:00Z" } })) };
    }
    return { json: async () => data };
  }));
  const { fetchNewestUploadsDetailed } = await import("../youtube");
  const result = await fetchNewestUploadsDetailed(2000, "2026-10-11T00:00:00Z");
  expect(result.find(v => v.videoId === "jO091aoKuQ4")).toMatchObject({ liveEnded: true });
  expect(pages).toBe(5);
  expect(details).toHaveLength(225);
});

it("reports API failures instead of a successful empty sync", async () => {
  vi.stubEnv("YOUTUBE_API_KEY", "test-key");
  vi.stubGlobal("fetch", vi.fn(async () => ({ json: async () => ({ error: { code: 403 } }) })));
  const { fetchNewestUploadsDetailed } = await import("../youtube");
  await expect(fetchNewestUploadsDetailed(2000, "2026-10-11T00:00:00Z")).rejects.toThrow();
});
