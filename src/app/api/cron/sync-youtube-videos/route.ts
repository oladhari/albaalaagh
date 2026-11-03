import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { fetchNewestUploadsDetailed, fetchPlaylistNames, fetchPlaylistVideoMembership } from "@/lib/youtube";

export const maxDuration = 300;

function extractYoutubeId(url: string): string | null {
  const watch = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (watch) return watch[1];
  const hosted = url.match(/\/([A-Za-z0-9_-]{11})\.[a-z0-9]+(?:$|[?#])/i);
  return hosted ? hosted[1] : null;
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const headerSecret = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("authorization");
  const isDev = process.env.NODE_ENV === "development";
  const validManual = Boolean(cronSecret) && headerSecret === cronSecret;
  const validVercel = Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;
  if (!isDev && !validManual && !validVercel) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    checked: 0,
    inserted: 0,
    repairedPlaylists: 0,
    createdPlaylists: 0,
    skippedExisting: 0,
    skippedLive: 0,
    unmatchedPlaylist: 0,
    errors: [] as string[],
  };

  const started = Date.now();
  const progress = (stage: string) => console.info(JSON.stringify({ event: "youtube_sync", stage, elapsedMs: Date.now() - started, ...results }));
  try {
    progress("started");
    // Revisit a month to recover missed runs; batch writes keep this bounded.
    const cutoff = new Date(Date.now() - 30 * 86400_000).toISOString();
    const uploads = await fetchNewestUploadsDetailed(5000, cutoff);
    results.checked = uploads.length;
    progress("uploads_fetched");

    // Check existence per-candidate (ilike on the 11-char id) instead of pulling
    // the whole table — a plain unfiltered select gets capped at 1000 rows by
    // PostgREST, which silently misses recent inserts once the table passes that size.
    const candidateIds = uploads.map((v) => v.videoId);
    const candidateChunks: string[][] = [];
    for (let i = 0; i < candidateIds.length; i += 100) {
      candidateChunks.push(candidateIds.slice(i, i + 100));
    }

    const ytPlaylists = await fetchPlaylistNames();

    const [membership, playlistsRes, existingRes] = await Promise.all([
      fetchPlaylistVideoMembership(ytPlaylists),
      supabaseAdmin.from("playlists").select("id, name"),
      Promise.all(candidateChunks.map((ids) =>
        supabaseAdmin.from("site_videos").select("id,video_url,youtube_video_id,playlist_id").or(
          ids.flatMap((id) => [`video_url.ilike.%${id}%`, `youtube_video_id.eq.${id}`]).join(",")
        )
      )),
    ]);

    progress("membership_fetched");
    if (playlistsRes.error) throw new Error(playlistsRes.error.message);
    for (const result of existingRes) {
      if (result.error) throw new Error(result.error.message);
    }

    // Which real YouTube playlist does each internal playlists-table row correspond
    // to? Matched by exact playlist NAME (a small, reviewable set — ~70 rows — unlike
    // matching individual video titles, which the channel's history is too inconsistent for).
    const nameToInternalId = new Map(
      (playlistsRes.data ?? []).map((p: { id: string; name: string }) => [p.name.trim(), p.id])
    );
    // New programmes must become usable without a separate manual database import.
    for (const pl of ytPlaylists) {
      const name = pl.title.trim();
      if (nameToInternalId.has(name)) continue;
      const { data, error } = await supabaseAdmin.from("playlists")
        .insert({ name, display_order: nameToInternalId.size }).select("id").single();
      if (error) throw new Error(error.message);
      nameToInternalId.set(name, data.id);
      results.createdPlaylists++;
    }
    const ytPlaylistIdToInternalId = new Map<string, string>();
    for (const pl of ytPlaylists) {
      const internalId = nameToInternalId.get(pl.title.trim());
      if (internalId) ytPlaylistIdToInternalId.set(pl.id, internalId);
    }

    const existing = existingRes.flatMap((result) => result.data ?? []);
    const knownIds = new Set(existing.map(v => v.youtube_video_id ?? extractYoutubeId(v.video_url)).filter(Boolean));
    const repairs = new Map<string, string[]>();
    for (const row of existing) {
      const sourceId = row.youtube_video_id ?? extractYoutubeId(row.video_url);
      const ytPlaylist = sourceId ? membership.get(sourceId) : null;
      const playlistId = ytPlaylist ? ytPlaylistIdToInternalId.get(ytPlaylist) : null;
      if (playlistId && playlistId !== row.playlist_id) {
        repairs.set(playlistId, [...(repairs.get(playlistId) ?? []), row.id]);
      }
    }
    for (const [playlistId, ids] of repairs) {
      for (let i = 0; i < ids.length; i += 100) {
        const batch = ids.slice(i, i + 100);
        const { error } = await supabaseAdmin.from("site_videos").update({ playlist_id: playlistId }).in("id", batch);
        if (error) results.errors.push(error.message);
        else results.repairedPlaylists += batch.length;
      }
    }
    const inserts = [];

    for (const v of uploads) {
      if (knownIds.has(v.videoId)) {
        results.skippedExisting++;
        continue;
      }
      // Still live or upcoming — wait until it actually ends before publishing
      if (v.isLivestream && !v.liveEnded) {
        results.skippedLive++;
        continue;
      }

      // Authoritative: is this video actually a member of a real YouTube playlist
      // that we can map back to an internal playlist row? No guessing from the title.
      const ytPlaylistId = membership.get(v.videoId);
      const playlistId = ytPlaylistId ? ytPlaylistIdToInternalId.get(ytPlaylistId) ?? null : null;
      if (!playlistId) results.unmatchedPlaylist++;

      inserts.push({
        youtube_video_id: v.videoId,
        title: v.title,
        description: v.description ? v.description.slice(0, 4500) : null,
        video_url: `https://www.youtube.com/watch?v=${v.videoId}`,
        thumbnail_url: v.thumbnail_url || null,
        playlist_id: playlistId,
        display_order: 0,
        published: true,
        published_at: v.liveStartedAt ?? v.publishedAt,
        video_type: v.isLivestream ? "live" : "clip",
        hashtags: null,
      });
    }
    for (let i = 0; i < inserts.length; i += 100) {
      const batch = inserts.slice(i, i + 100);
      const { error } = await supabaseAdmin.from("site_videos").insert(batch);
      if (error) results.errors.push(error.message);
      else results.inserted += batch.length;
    }
  } catch (err: unknown) {
    results.errors.push(err instanceof Error ? err.message : String(err));
  }

  progress("finished");
  return NextResponse.json(results, { status: results.errors.length ? 500 : 200 });
}
