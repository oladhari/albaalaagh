import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { fetchNewestUploadsDetailed } from "@/lib/youtube";

export const maxDuration = 60;

function extractYoutubeId(url: string): string | null {
  const watch = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (watch) return watch[1];
  const hosted = url.match(/\/([A-Za-z0-9_-]{11})\.[a-z0-9]+(?:$|[?#])/i);
  return hosted ? hosted[1] : null;
}

function matchPlaylistId(title: string, playlists: { id: string; name: string }[]): string | null {
  const prefix = title.split("|")[0]?.trim();
  if (prefix) {
    const exact = playlists.find((p) => p.name.trim() === prefix);
    if (exact) return exact.id;
  }
  const substring = playlists.find(
    (p) => (prefix && p.name.includes(prefix)) || title.includes(p.name)
  );
  return substring?.id ?? null;
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

    const [playlistsRes, existingRes] = await Promise.all([
      supabaseAdmin.from("playlists").select("id, name"),
      candidateIds.length
        ? supabaseAdmin.from("site_videos").select("video_url").or(orFilter)
        : Promise.resolve({ data: [] as { video_url: string }[] }),
    ]);

    const playlists = playlistsRes.data ?? [];
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

      const playlistId = matchPlaylistId(v.title, playlists);
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
