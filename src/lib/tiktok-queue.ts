export const TIKTOK_QUEUE_PREFIX = 'tiktok_queue:';
export interface TikTokQueueVideo {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  published_at: string | null;
}
export function parseTikTokQueueRow(row: { key: string; value: string }): TikTokQueueVideo | null {
  try {
    const v = JSON.parse(row.value);
    if (row.key !== TIKTOK_QUEUE_PREFIX + v.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.id) || typeof v.title !== 'string' || !v.title.trim()) return null;
    const url = new URL(v.video_url);
    if (url.protocol !== 'https:' || url.hostname !== 'media.albaalaagh.com' || !url.pathname.endsWith('.mp4')) return null;
    return { id: v.id, title: v.title, description: typeof v.description === 'string' ? v.description : null, video_url: url.href, published_at: typeof v.published_at === 'string' ? v.published_at : null };
  } catch { return null; }
}
export function mergeTikTokQueue(videos: TikTokQueueVideo[], queued: TikTokQueueVideo[]): TikTokQueueVideo[] {
  const ids = new Set(videos.map(v => v.id));
  const urls = new Set(videos.map(v => v.video_url));
  return [...videos, ...queued.filter(v => {
    if (ids.has(v.id) || urls.has(v.video_url)) return false;
    ids.add(v.id); urls.add(v.video_url); return true;
  })].sort((a, b) => (b.published_at || '').localeCompare(a.published_at || '') || a.id.localeCompare(b.id));
}
