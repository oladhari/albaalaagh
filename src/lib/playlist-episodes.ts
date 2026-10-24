interface EpisodeIdentity {
  id: string;
  title: string;
  video_url: string;
  playlist_id: string | null;
  published_at: string | null;
}
function sourceId(videoUrl: string): string | null {
  try {
    const u = new URL(videoUrl);
    if (["youtube.com", "www.youtube.com"].includes(u.hostname)) {
      const id = u.searchParams.get("v");
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (u.hostname === "youtu.be" && /^\/[\w-]{11}$/.test(u.pathname)) return u.pathname.slice(1);
    if (u.hostname === "media.albaalaagh.com") return u.pathname.match(/^\/videos\/([\w-]{11})\.mp4$/)?.[1] ?? null;
  } catch { /* Unknown media remains a separate record. */ }
  return null;
}
function episodeFingerprint(row: EpisodeIdentity): string | null {
  const date = row.published_at?.slice(0, 10);
  if (!row.title.trim() || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return JSON.stringify([row.playlist_id, row.title.trim().replace(/\s+/g, " "), date]);
}
export function deduplicatePlaylistEpisodes<T extends EpisodeIdentity>(rows: T[]): T[] {
  const canonical = new Set(rows.filter(row => sourceId(row.video_url)).map(episodeFingerprint).filter(Boolean));
  const sources = new Set<string>();
  return rows.filter(row => {
    const id = sourceId(row.video_url);
    const fingerprint = episodeFingerprint(row);
    // Historical hashed R2 imports can duplicate a YouTube or source-ID R2 record.
    // Do not merge distinct YouTube videos merely because their titles/dates match.
    if (!id && /^https:\/\/media\.albaalaagh\.com\/videos\/[a-f0-9]{40}\.mp4$/.test(row.video_url) && fingerprint && canonical.has(fingerprint)) return false;
    if (!id) return true;
    const key = JSON.stringify([row.playlist_id, id]);
    if (sources.has(key)) return false;
    sources.add(key);
    return true;
  });
}
