import { Suspense } from "react";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { SHORTS_PLAYLIST_IDS } from "@/lib/shorts-playlists";
import { isRateLimited } from "@/lib/rate-limit";
import SectionHeader from "@/components/ui/SectionHeader";
import InterviewsClient from "./InterviewsClient";

export const revalidate = 60;

export const metadata = {
  title: "البرامج والحلقات | البلاغ",
  description: "أرشيف كامل لبرامج وحلقات قناة البلاغ",
};

const PAGE_SIZE = 24;

async function getData(
  playlistId: string | null,
  page: number,
  q: string | null,
  dateFrom: string | null,
  dateTo: string | null
) {
  const { data: allPlaylists } = await supabaseAdmin
    .from("playlists")
    .select("id, name")
    .order("display_order", { ascending: true });

  // Hide shorts playlists from the interviews sidebar
  const playlists = (allPlaylists ?? []).filter(p => !SHORTS_PLAYLIST_IDS.includes(p.id));

  if (playlistId) {
    // When filtering by playlist, load all matching episodes in that playlist (usually < 24)
    let plQuery = supabaseAdmin
      .from("site_videos")
      .select("id, title, description, video_url, thumbnail_url, published_at, playlist_id", { count: "exact" })
      .eq("published", true)
      .eq("playlist_id", playlistId);
    if (q) plQuery = plQuery.ilike("title", `%${q}%`);
    if (dateFrom) plQuery = plQuery.gte("published_at", dateFrom);
    if (dateTo) plQuery = plQuery.lte("published_at", `${dateTo}T23:59:59`);

    const { data: videos, count } = await plQuery
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    return { playlists, videos: videos ?? [], totalCount: count ?? 0, page: 1, totalPages: 1 };
  }

  const from = (page - 1) * PAGE_SIZE;
  const to   = from + PAGE_SIZE - 1;

  let query = supabaseAdmin
    .from("site_videos")
    .select("id, title, description, video_url, thumbnail_url, published_at, playlist_id", { count: "exact" })
    .eq("published", true)
    .not("playlist_id", "is", null);
  if (q) query = query.ilike("title", `%${q}%`);
  if (dateFrom) query = query.gte("published_at", dateFrom);
  if (dateTo) query = query.lte("published_at", `${dateTo}T23:59:59`);

  // Exclude clips/shorts playlists
  for (const id of SHORTS_PLAYLIST_IDS) {
    query = query.neq("playlist_id", id);
  }

  const { data: videos, count } = await query
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return { playlists, videos: videos ?? [], totalCount: count ?? 0, page, totalPages };
}

export default async function InterviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ playlist?: string; page?: string; q?: string; from?: string; to?: string }>;
}) {
  const params     = await searchParams;
  const playlistId = params.playlist ?? null;
  const page       = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const q          = params.q?.trim() || null;
  const dateFrom   = params.from || null;
  const dateTo     = params.to || null;

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || hdrs.get("x-real-ip") || "unknown";
  // 60 requests/min/IP: comfortably covers real browsing + debounced search typing,
  // blocks scripted flooding of the count-exact query behind every filter change.
  const limited = isRateLimited(`interviews-page:${ip}`, 60, 60_000);

  const { playlists, videos, totalCount, totalPages } = limited
    ? { playlists: [], videos: [], totalCount: 0, totalPages: 1 }
    : await getData(playlistId, page, q, dateFrom, dateTo);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" dir="rtl">
      <SectionHeader
        title="البرامج والحلقات"
        subtitle="أرشيف حلقات قناة البلاغ"
      />

      {limited ? (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
        >
          <p className="text-sm" style={{ color: "#9A9070" }}>
            عدد كبير من الطلبات، الرجاء المحاولة بعد قليل.
          </p>
        </div>
      ) : (
        <Suspense>
          <InterviewsClient
            videos={videos}
            playlists={playlists}
            activePlaylistId={playlistId}
            totalCount={totalCount}
            page={page}
            totalPages={totalPages}
            q={q}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
        </Suspense>
      )}
    </div>
  );
}
