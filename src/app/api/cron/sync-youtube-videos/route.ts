import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { fetchNewestUploadsDetailed, fetchPlaylistNames, fetchPlaylistVideoMembership } from "@/lib/youtube";

export const maxDuration = 60;

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
  const validManual = headerSecret === cronSecret;
  const validVercel = authHeader === `Bearer ${cronSecret}`;
  if (!isDev && !validManual && !validVercel) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    checked: 0,
    inserted: 0,
    skippedExisting: 0,
    skippedLive: 0,
    unmatchedPlaylist: 0,
    errors: [] as string[],
  };

  try {
    const uploads = await fetchNewestUploadsDetailed(15);
    results.checked = uploads.length;

    // Check existence per-candidate (ilike on the 11-char id) instead of pulling
    // the whole table — a plain unfiltered select gets capped at 1000 rows by
    // PostgREST, which silently misses recent inserts once the table passes that size.
    const candidateIds = uploads.map((v) => v.videoId);
    const orFilter = candidateIds.map((id) => `video_url.ilike.%${id}%`).join(",");

    const ytPlaylists = await fetchPlaylistNames();

    const [membership, playlistsRes, existingRes] = await Promise.all([
      fetchPlaylistVideoMembership(ytPlaylists),
      supabaseAdmin.from("playlists").select("id, name"),
      candidateIds.length
        ? supabaseAdmin.from("site_videos").select("video_url").or(orFilter)
        : Promise.resolve({ data: [] as { video_url: string }[] }),
    ]);

    // Which real YouTube playlist does each internal playlists-table row correspond
    // to? Matched by exact playlist NAME (a small, reviewable set — ~70 rows — unlike
    // matching individual video titles, which the channel's history is too inconsistent for).
    const nameToInternalId = new Map(
      (playlistsRes.data ?? []).map((p: { id: string; name: string }) => [p.name.trim(), p.id])
    );
    const ytPlaylistIdToInternalId = new Map<string, string>();
    for (const pl of ytPlaylists) {
      const internalId = nameToInternalId.get(pl.title.trim());
      if (internalId) ytPlaylistIdToInternalId.set(pl.id, internalId);
    }

    const knownIds = new Set(
      (existingRes.data ?? [])
        .map((v: { video_url: string }) => extractYoutubeId(v.video_url))
        .filter((id): id is string => !!id)
    );

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

      const { error } = await supabaseAdmin.from("site_videos").insert({
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

      if (error) results.errors.push(`${v.videoId}: ${error.message}`);
      else results.inserted++;
    }
  } catch (err: any) {
    results.errors.push(String(err?.message ?? err));
  }

  return NextResponse.json(results);
}
