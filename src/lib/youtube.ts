const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = "UC3jvdYx_FbLzQ8Ntcx95AQg";

export async function fetchAllVideoTitles(maxResults = 50): Promise<{ youtube_id: string; title: string; thumbnail_url: string; published_at: string }[]> {
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

export async function fetchLatestVideos(maxResults = 12) {
  if (!YOUTUBE_API_KEY) {
    console.warn("YOUTUBE_API_KEY not set, returning mock data");
    return getMockVideos(maxResults);
  }

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&channelId=${CHANNEL_ID}&part=snippet&order=date&maxResults=${maxResults}&type=video`,
      { next: { revalidate: 3600 } } // Cache 1 hour
    );
    const data = await res.json();

    if (!data.items) return getMockVideos(maxResults);

    return data.items.map((item: any) => ({
      id: item.id.videoId,
      youtube_id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail_url: item.snippet.thumbnails?.maxres?.url ||
                     item.snippet.thumbnails?.high?.url ||
                     item.snippet.thumbnails?.medium?.url,
      published_at: item.snippet.publishedAt,
      created_at: item.snippet.publishedAt,
    }));
  } catch (e) {
    console.error("YouTube API error:", e);
    return getMockVideos(maxResults);
  }
}

function getMockVideos(count: number) {
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
