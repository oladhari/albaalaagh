const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = "UCReplaceWithYourChannelId"; // Replace after getting from YouTube

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
