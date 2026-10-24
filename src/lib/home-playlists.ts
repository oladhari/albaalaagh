import { deduplicatePlaylistEpisodes } from "./playlist-episodes";
import { supabaseAdmin } from "./supabase";
const PAGE_SIZE = 1000;
async function getPublishedPlaylistVideos() {
  const videos: { id: string; title: string; video_url: string; playlist_id: string | null; thumbnail_url: string | null; published_at: string | null }[] = [];
  // PostgREST caps each response at 1000 rows; never treat one response as the full archive.
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabaseAdmin.from("site_videos")
      .select("id, title, video_url, playlist_id, thumbnail_url, published_at").eq("published", true)
      .not("playlist_id", "is", null)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: true }).range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error("تعذّر تحميل أرشيف البرامج");
    const page = data ?? [];
    videos.push(...page);
    if (page.length < PAGE_SIZE) return videos;
  }
}
export async function getHomePlaylists() {
  const [{ data: playlists, error }, videos] = await Promise.all([
    supabaseAdmin.from("playlists").select("id, name").order("display_order", { ascending: true }),
    getPublishedPlaylistVideos(),
  ]);
  if (error) throw new Error("تعذّر تحميل البرامج");
  const byPlaylist = new Map<string, { thumbnail: string | null; count: number; latestDate: string | null }>();
  for (const v of deduplicatePlaylistEpisodes(videos)) {
    if (!v.playlist_id) continue;
    if (!byPlaylist.has(v.playlist_id)) byPlaylist.set(v.playlist_id, { thumbnail: v.thumbnail_url, count: 0, latestDate: v.published_at });
    byPlaylist.get(v.playlist_id)!.count++;
  }
  return (playlists ?? []).filter(p => byPlaylist.has(p.id)).map(p => ({ id: p.id, name: p.name, ...byPlaylist.get(p.id)! }))
    .sort((a, b) => (b.latestDate ?? "").localeCompare(a.latestDate ?? ""));
}
