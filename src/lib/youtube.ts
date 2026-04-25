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

async function ytFetch(url: URL, revalidate = 1800): Promise<any> {
  const res = await fetch(url.toString(), { next: { revalidate } });
  return res.json();
}

// ── Fetch channel statistics ──────────────────────────────────────────────────

export interface YTChannelStats {
  videoCount: number;
  subscriberCount: number;
  viewCount: number;
}

export async function fetchChannelStats(): Promise<YTChannelStats> {
  if (!YOUTUBE_API_KEY) return { videoCount: 0, subscriberCount: 0, viewCount: 0 };

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/channels");
    url.searchParams.set("key", YOUTUBE_API_KEY);
    url.searchParams.set("id", CHANNEL_ID);
    url.searchParams.set("part", "statistics");

    const data = await ytFetch(url);
    const stats = data.items?.[0]?.statistics;
    if (!stats) return { videoCount: 0, subscriberCount: 0, viewCount: 0 };

    return {
      videoCount:      parseInt(stats.videoCount      ?? "0", 10),
      subscriberCount: parseInt(stats.subscriberCount ?? "0", 10),
      viewCount:       parseInt(stats.viewCount       ?? "0", 10),
    };
  } catch {
    return { videoCount: 0, subscriberCount: 0, viewCount: 0 };
  }
}

// ── Fetch completed live streams ──────────────────────────────────────────────
// Fetches recent uploads then filters to livestreams only via liveStreamingDetails.

export async function fetchLiveStreams(maxResults = 6): Promise<YTVideo[]> {
  if (!YOUTUBE_API_KEY) return getMockVideos(maxResults);

  try {
    // Step 1: uploads playlist ID (cached 24h)
    const chUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
    chUrl.searchParams.set("key", YOUTUBE_API_KEY);
    chUrl.searchParams.set("id", CHANNEL_ID);
    chUrl.searchParams.set("part", "contentDetails");
    const chData = await ytFetch(chUrl, 86400);
    const uploadsId: string = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsId) return getMockVideos(maxResults);

    // Step 2: grab more items than needed so we have enough after filtering
    const plUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    plUrl.searchParams.set("key", YOUTUBE_API_KEY);
    plUrl.searchParams.set("playlistId", uploadsId);
    plUrl.searchParams.set("part", "snippet");
    plUrl.searchParams.set("maxResults", String(Math.min(maxResults * 5, 50)));
    const plData = await ytFetch(plUrl);
    if (!plData.items?.length) return getMockVideos(maxResults);

    const ids = plData.items
      .map((item: any) => item.snippet?.resourceId?.videoId)
      .filter(Boolean) as string[];

    // Step 3: batch-fetch liveStreamingDetails to identify livestreams
    const vidUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    vidUrl.searchParams.set("key", YOUTUBE_API_KEY);
    vidUrl.searchParams.set("id", ids.join(","));
    vidUrl.searchParams.set("part", "snippet,liveStreamingDetails");
    const vidData = await ytFetch(vidUrl);
    if (!vidData.items?.length) return getMockVideos(maxResults);

    const lives = vidData.items
      .filter((item: any) => !!item.liveStreamingDetails)
      .slice(0, maxResults)
      .map((item: any) => ({
        id:            item.id,
        youtube_id:    item.id,
        title:         item.snippet.title ?? "",
        description:   item.snippet.description ?? "",
        thumbnail_url:
          item.snippet.thumbnails?.maxres?.url ||
          item.snippet.thumbnails?.high?.url   ||
          item.snippet.thumbnails?.medium?.url || "",
        published_at: item.snippet.publishedAt,
        created_at:   item.snippet.publishedAt,
      } satisfies YTVideo));

    return lives.length ? lives : getMockVideos(maxResults);
  } catch (e) {
    console.error("YouTube livestreams error:", e);
    return getMockVideos(maxResults);
  }
}

// ── Fetch latest videos via uploads playlist (no indexing delay) ──────────────
// Uses playlistItems.list on the channel's uploads playlist — more reliable
// than search.list which has delays for recently completed livestreams.

export async function fetchLatestVideos(maxResults = 12): Promise<YTVideo[]> {
  if (!YOUTUBE_API_KEY) return getMockVideos(maxResults);

  try {
    // Step 1: get uploads playlist ID
    const chUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
    chUrl.searchParams.set("key", YOUTUBE_API_KEY);
    chUrl.searchParams.set("id", CHANNEL_ID);
    chUrl.searchParams.set("part", "contentDetails");
    const chData = await ytFetch(chUrl, 86400); // channel meta changes rarely
    const uploadsId: string = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsId) return getMockVideos(maxResults);

    // Step 2: fetch latest N items from uploads playlist
    const plUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    plUrl.searchParams.set("key", YOUTUBE_API_KEY);
    plUrl.searchParams.set("playlistId", uploadsId);
    plUrl.searchParams.set("part", "snippet");
    plUrl.searchParams.set("maxResults", String(maxResults));
    const plData = await ytFetch(plUrl); // uses default 30-min cache

    if (!plData.items?.length) return getMockVideos(maxResults);

    return plData.items.map((item: any) => {
      const snippet = item.snippet;
      const videoId = snippet.resourceId?.videoId ?? "";
      return {
        id:            videoId,
        youtube_id:    videoId,
        title:         snippet.title ?? "",
        description:   snippet.description ?? "",
        thumbnail_url:
          snippet.thumbnails?.maxres?.url ||
          snippet.thumbnails?.high?.url   ||
          snippet.thumbnails?.medium?.url || "",
        published_at: snippet.publishedAt,
        created_at:   snippet.publishedAt,
      } satisfies YTVideo;
    });
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

// ── Lightweight playlist names list (for admin dropdowns) ────────────────────
// Single API call, cached 24h. Returns just id + title.

export async function fetchPlaylistNames(): Promise<{ id: string; title: string }[]> {
  if (!YOUTUBE_API_KEY) return [];
  try {
    const all: { id: string; title: string }[] = [];
    let pageToken: string | undefined;

    do {
      const url = new URL("https://www.googleapis.com/youtube/v3/playlists");
      url.searchParams.set("key", YOUTUBE_API_KEY);
      url.searchParams.set("channelId", CHANNEL_ID);
      url.searchParams.set("part", "snippet");
      url.searchParams.set("maxResults", "50");
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      // Short cache so renamed playlists appear within an hour
      const data = await ytFetch(url, 3600);
      for (const p of data.items ?? []) {
        const title = (p.snippet?.title ?? "").trim();
        if (title) all.push({ id: p.id, title });
      }
      pageToken = data.nextPageToken;
    } while (pageToken);

    // Deduplicate by id, then sort alphabetically
    const seen = new Set<string>();
    return all
      .filter((p) => { if (seen.has(p.id)) return false; seen.add(p.id); return true; })
      .sort((a, b) => a.title.localeCompare(b.title, "ar"));
  } catch {
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

// ── Fetch all live stream videos with full descriptions (for guest import) ────
// Uses uploads playlist (not search.list) — paginated at 1 unit/50 videos.
// Then filters to live streams only via liveStreamingDetails.

export async function fetchAllVideosWithDescriptions(): Promise<
  { youtube_id: string; title: string; description: string }[]
> {
  if (!YOUTUBE_API_KEY) return [];

  // Step 1: get the channel's uploads playlist ID (1 unit)
  const chUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
  chUrl.searchParams.set("key", YOUTUBE_API_KEY);
  chUrl.searchParams.set("id", CHANNEL_ID);
  chUrl.searchParams.set("part", "contentDetails");
  const chRes = await fetch(chUrl.toString(), { cache: "no-store" });
  const chData = await chRes.json();
  const uploadsPlaylistId: string =
    chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) return [];

  // Step 2: paginate through uploads playlist to collect all video IDs (1 unit/50)
  const allIds: string[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("key", YOUTUBE_API_KEY);
    url.searchParams.set("playlistId", uploadsPlaylistId);
    url.searchParams.set("part", "contentDetails");
    url.searchParams.set("maxResults", "50");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), { cache: "no-store" });
    const data = await res.json();
    if (!data.items) break;

    for (const item of data.items) {
      const vid = item.contentDetails?.videoId;
      if (vid) allIds.push(vid);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  // Step 3: batch-fetch snippet + liveStreamingDetails (1 unit/50 videos)
  // Keep only videos that have liveStreamingDetails (= were live streams)
  const videos: { youtube_id: string; title: string; description: string }[] = [];

  for (let i = 0; i < allIds.length; i += 50) {
    const batch = allIds.slice(i, i + 50);
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("key", YOUTUBE_API_KEY);
    url.searchParams.set("id", batch.join(","));
    url.searchParams.set("part", "snippet,liveStreamingDetails");

    const res = await fetch(url.toString(), { cache: "no-store" });
    const data = await res.json();
    if (!data.items) continue;

    for (const item of data.items) {
      // liveStreamingDetails exists only on live/past-live videos
      if (!item.liveStreamingDetails) continue;
      videos.push({
        youtube_id: item.id,
        title: item.snippet.title ?? "",
        description: item.snippet.description ?? "",
      });
    }
  }

  return videos;
}

// ── Detect active live stream ─────────────────────────────────────────────────
// Cost: 2 units per call (uploads playlist + videos.list), cached 2 minutes.
// Checks the 5 most recent uploads for liveBroadcastContent === "live".

export interface YTLiveStream {
  youtube_id: string;
  title: string;
  thumbnail_url: string;
}

export async function fetchActiveLiveStream(): Promise<YTLiveStream | null> {
  if (!YOUTUBE_API_KEY) return null;
  try {
    // Step 1: uploads playlist ID — 1 unit, cached 24h
    const chUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
    chUrl.searchParams.set("key", YOUTUBE_API_KEY);
    chUrl.searchParams.set("id", CHANNEL_ID);
    chUrl.searchParams.set("part", "contentDetails");
    const chData = await ytFetch(chUrl, 86400);
    const uploadsId: string = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsId) return null;

    // Step 2: first 5 items from uploads playlist — 1 unit, cached 2 min
    const plUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    plUrl.searchParams.set("key", YOUTUBE_API_KEY);
    plUrl.searchParams.set("playlistId", uploadsId);
    plUrl.searchParams.set("part", "contentDetails");
    plUrl.searchParams.set("maxResults", "5");
    const plData = await ytFetch(plUrl, 120);
    const ids = (plData.items ?? [])
      .map((i: any) => i.contentDetails?.videoId)
      .filter(Boolean) as string[];
    if (!ids.length) return null;

    // Step 3: check liveBroadcastContent — 1 unit, cached 2 min
    const vidUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    vidUrl.searchParams.set("key", YOUTUBE_API_KEY);
    vidUrl.searchParams.set("id", ids.join(","));
    vidUrl.searchParams.set("part", "snippet");
    const vidData = await ytFetch(vidUrl, 120);

    const live = (vidData.items ?? []).find(
      (v: any) => v.snippet?.liveBroadcastContent === "live"
    );
    if (!live) return null;

    return {
      youtube_id:    live.id,
      title:         live.snippet.title ?? "",
      thumbnail_url:
        live.snippet.thumbnails?.maxres?.url ||
        live.snippet.thumbnails?.high?.url   || "",
    };
  } catch {
    return null;
  }
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
