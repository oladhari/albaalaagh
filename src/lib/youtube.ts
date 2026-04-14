const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = "UC3jvdYx_FbLzQ8Ntcx95AQg";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface YTVideo {
  id: string;
  youtube_id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  published_at: string;
  created_at: string;
  is_live?: boolean;
}

export interface YTPlaylist {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  itemCount: number;
  latestVideo: { youtube_id: string; title: string; thumbnail_url: string } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapVideo(item: any, videoId?: string): YTVideo {
  const id = videoId ?? item.id?.videoId ?? item.id;
  return {
    id,
    youtube_id: id,
    title: item.snippet.title,
    description: item.snippet.description ?? "",
    thumbnail_url:
      item.snippet.thumbnails?.maxres?.url ||
      item.snippet.thumbnails?.high?.url ||
      item.snippet.thumbnails?.medium?.url || "",
    published_at: item.snippet.publishedAt,
    created_at: item.snippet.publishedAt,
  };
}

async function ytFetch(url: URL): Promise<any> {
  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  return res.json();
}

// ── Fetch completed live streams ──────────────────────────────────────────────

export async function fetchLiveStreams(maxResults = 6): Promise<YTVideo[]> {
  if (!YOUTUBE_API_KEY) return getMockVideos(maxResults);

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("key", YOUTUBE_API_KEY);
    url.searchParams.set("channelId", CHANNEL_ID);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("eventType", "completed");
    url.searchParams.set("type", "video");
    url.searchParams.set("order", "date");
    url.searchParams.set("maxResults", String(maxResults));

    const data = await ytFetch(url);
    if (!data.items?.length) return fetchLatestVideos(maxResults); // fallback

    return data.items.map((item: any) => ({ ...mapVideo(item), is_live: true }));
  } catch {
    return fetchLatestVideos(maxResults);
  }
}

// ── Fetch latest videos (by date) ─────────────────────────────────────────────

export async function fetchLatestVideos(maxResults = 12): Promise<YTVideo[]> {
  if (!YOUTUBE_API_KEY) return getMockVideos(maxResults);

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("key", YOUTUBE_API_KEY);
    url.searchParams.set("channelId", CHANNEL_ID);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("order", "date");
    url.searchParams.set("type", "video");
    url.searchParams.set("maxResults", String(maxResults));

    const data = await ytFetch(url);
    if (!data.items) return getMockVideos(maxResults);
    return data.items.map((item: any) => mapVideo(item));
  } catch (e) {
    console.error("YouTube API error:", e);
    return getMockVideos(maxResults);
  }
}

// ── Fetch featured playlists by name ─────────────────────────────────────────
// Costs: 1 unit (playlists.list) + 1 unit per playlist (playlistItems.list)

const PLAYLIST_NAMES = [
  "البلاغ الذكية",
  "سياسة في العمق",
  "منبر الأحد",
  "حصاد الأسبوع",
  "هات الحل",
  "حدث و خبر مع رمزي",
  "الشريعة و السياسة",
  "رسالة من الزنزانة",
  "فلسطين قضية العالم بأسره",
  "وعد الآخرة",
  "حصاد 25",
];

// Custom descriptions (overrides YouTube description if it's short)
const PLAYLIST_DESCRIPTIONS: Record<string, string> = {
  "البلاغ الذكية":
    "أول برنامج حواري تلفزيوني في العالم العربي يجمع الذكاء الاصطناعي والخبراء المختصين، يجيب عن أسئلة الواقع التونسي بطريقة سلسة تجمع الدقة العلمية والاستشراف الإنساني.",
  "منبر الأحد":
    "نقاشات سياسية وفكرية أسبوعية مع شخصيات بارزة حول أبرز القضايا التونسية والعربية.",
  "سياسة في العمق":
    "تحليلات معمّقة للمشهد السياسي التونسي والإقليمي مع نخبة من الخبراء والمختصين.",
};

export async function fetchFeaturedPlaylists(): Promise<YTPlaylist[]> {
  if (!YOUTUBE_API_KEY) return [];

  try {
    // 1. Get all channel playlists (with contentDetails for itemCount)
    const listUrl = new URL("https://www.googleapis.com/youtube/v3/playlists");
    listUrl.searchParams.set("key", YOUTUBE_API_KEY);
    listUrl.searchParams.set("channelId", CHANNEL_ID);
    listUrl.searchParams.set("part", "snippet,contentDetails");
    listUrl.searchParams.set("maxResults", "50");

    const listData = await ytFetch(listUrl);
    const allPlaylists: any[] = listData.items ?? [];

    // 2. Match by name (partial match, case-insensitive)
    const matched = PLAYLIST_NAMES.map((name) =>
      allPlaylists.find((p) =>
        p.snippet.title.includes(name) || name.includes(p.snippet.title)
      )
    ).filter(Boolean);

    // 3. For each matched playlist, fetch its latest video
    const results: YTPlaylist[] = [];

    for (const playlist of matched) {
      const itemsUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
      itemsUrl.searchParams.set("key", YOUTUBE_API_KEY);
      itemsUrl.searchParams.set("playlistId", playlist.id);
      itemsUrl.searchParams.set("part", "snippet");
      itemsUrl.searchParams.set("maxResults", "1");

      const itemsData = await ytFetch(itemsUrl);
      const latest = itemsData.items?.[0];

      // Determine description
      const ytDesc: string = playlist.snippet.description ?? "";
      const customKey = PLAYLIST_NAMES.find((n) => playlist.snippet.title.includes(n));
      const description =
        (customKey && PLAYLIST_DESCRIPTIONS[customKey]) ||
        (ytDesc.length > 20 ? ytDesc.slice(0, 200) : "");

      results.push({
        id: playlist.id,
        title: playlist.snippet.title,
        description,
        thumbnail_url:
          playlist.snippet.thumbnails?.high?.url ||
          playlist.snippet.thumbnails?.medium?.url || "",
        itemCount: playlist.contentDetails?.itemCount ?? 0,
        latestVideo: latest
          ? {
              youtube_id: latest.snippet.resourceId.videoId,
              title: latest.snippet.title,
              thumbnail_url:
                latest.snippet.thumbnails?.high?.url ||
                latest.snippet.thumbnails?.medium?.url || "",
            }
          : null,
      });
    }

    // Preserve the user-defined order
    return PLAYLIST_NAMES.map((name) =>
      results.find((r) => r.title.includes(name) || name.includes(r.title))
    ).filter(Boolean) as YTPlaylist[];
  } catch (e) {
    console.error("YouTube playlists error:", e);
    return [];
  }
}

// ── Fetch all channel playlists ───────────────────────────────────────────────

export async function fetchAllPlaylists(): Promise<YTPlaylist[]> {
  if (!YOUTUBE_API_KEY) return [];

  try {
    const listUrl = new URL("https://www.googleapis.com/youtube/v3/playlists");
    listUrl.searchParams.set("key", YOUTUBE_API_KEY);
    listUrl.searchParams.set("channelId", CHANNEL_ID);
    listUrl.searchParams.set("part", "snippet");
    listUrl.searchParams.set("maxResults", "50");

    const listData = await ytFetch(listUrl);
    const allPlaylists: any[] = listData.items ?? [];

    const results: YTPlaylist[] = [];

    for (const playlist of allPlaylists) {
      const itemsUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
      itemsUrl.searchParams.set("key", YOUTUBE_API_KEY);
      itemsUrl.searchParams.set("playlistId", playlist.id);
      itemsUrl.searchParams.set("part", "snippet");
      itemsUrl.searchParams.set("maxResults", "1");

      const itemsData = await ytFetch(itemsUrl);
      const latest = itemsData.items?.[0];

      const customKey = PLAYLIST_NAMES.find((n) => playlist.snippet.title.includes(n));
      const ytDesc: string = playlist.snippet.description ?? "";
      const description =
        (customKey && PLAYLIST_DESCRIPTIONS[customKey]) ||
        (ytDesc.length > 20 ? ytDesc.slice(0, 200) : "");

      results.push({
        id: playlist.id,
        title: playlist.snippet.title,
        description,
        thumbnail_url:
          playlist.snippet.thumbnails?.high?.url ||
          playlist.snippet.thumbnails?.medium?.url || "",
        itemCount: playlist.contentDetails?.itemCount ?? 0,
        latestVideo: latest
          ? {
              youtube_id: latest.snippet.resourceId.videoId,
              title: latest.snippet.title,
              thumbnail_url:
                latest.snippet.thumbnails?.high?.url ||
                latest.snippet.thumbnails?.medium?.url || "",
            }
          : null,
      });
    }

    // Sort: pin البلاغ الذكية first, then sort rest by itemCount descending
    const pinned = results.filter((p) => p.title.includes("البلاغ الذكية"));
    const rest   = results
      .filter((p) => !p.title.includes("البلاغ الذكية"))
      .sort((a, b) => b.itemCount - a.itemCount);

    return [...pinned, ...rest];
  } catch (e) {
    console.error("YouTube all playlists error:", e);
    return [];
  }
}

// ── Fetch shorts (videos < 4 min) ─────────────────────────────────────────────

export async function fetchShorts(maxResults = 12): Promise<YTVideo[]> {
  if (!YOUTUBE_API_KEY) return [];

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("key", YOUTUBE_API_KEY);
    url.searchParams.set("channelId", CHANNEL_ID);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("type", "video");
    url.searchParams.set("videoDuration", "short"); // < 4 minutes
    url.searchParams.set("order", "date");
    url.searchParams.set("maxResults", String(maxResults));

    const data = await ytFetch(url);
    if (!data.items?.length) return [];
    return data.items.map((item: any) => mapVideo(item));
  } catch {
    return [];
  }
}

// ── For admin guests tool ─────────────────────────────────────────────────────

export async function fetchAllVideoTitles(
  maxResults = 50
): Promise<{ youtube_id: string; title: string; thumbnail_url: string; published_at: string }[]> {
  if (!YOUTUBE_API_KEY) return [];

  const videos: any[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("key", YOUTUBE_API_KEY);
    url.searchParams.set("channelId", CHANNEL_ID);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("order", "date");
    url.searchParams.set("type", "video");
    url.searchParams.set("maxResults", "50");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    const data = await res.json();
    if (!data.items) break;

    for (const item of data.items) {
      videos.push({
        youtube_id: item.id.videoId,
        title: item.snippet.title,
        thumbnail_url:
          item.snippet.thumbnails?.medium?.url ??
          item.snippet.thumbnails?.default?.url ?? "",
        published_at: item.snippet.publishedAt,
      });
    }

    pageToken = data.nextPageToken;
  } while (pageToken && videos.length < maxResults);

  return videos;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

function getMockVideos(count: number): YTVideo[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `mock-${i}`,
    youtube_id: `dQw4w9WgXcQ`,
    title: `مقابلة سياسية ${i + 1} - البلاغ`,
    description: "حوار سياسي معمق حول الأوضاع التونسية",
    thumbnail_url: `https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg`,
    published_at: new Date(Date.now() - i * 86400000 * 3).toISOString(),
    created_at: new Date(Date.now() - i * 86400000 * 3).toISOString(),
  }));
}
