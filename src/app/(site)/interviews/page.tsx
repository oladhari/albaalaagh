import { Suspense } from "react";
import { supabaseAdmin } from "@/lib/supabase";
import SectionHeader from "@/components/ui/SectionHeader";
import InterviewsClient from "./InterviewsClient";

export const revalidate = 60;

export const metadata = {
  title: "البرامج والحلقات | البلاغ",
  description: "أرشيف كامل لبرامج وحلقات قناة البلاغ",
};

const PAGE_SIZE = 24;

async function getData(playlistId: string | null, page: number) {
  const { data: playlists } = await supabaseAdmin
    .from("playlists")
    .select("id, name")
    .order("display_order", { ascending: true });

  if (playlistId) {
    // When filtering by playlist, load all episodes in that playlist (usually < 24)
    const { data: videos, count } = await supabaseAdmin
      .from("site_videos")
      .select("id, title, description, video_url, thumbnail_url, published_at, playlist_id", { count: "exact" })
      .eq("published", true)
      .eq("playlist_id", playlistId)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    return { playlists: playlists ?? [], videos: videos ?? [], totalCount: count ?? 0, page: 1, totalPages: 1 };
  }

  const from = (page - 1) * PAGE_SIZE;
  const to   = from + PAGE_SIZE - 1;

  const { data: videos, count } = await supabaseAdmin
    .from("site_videos")
    .select("id, title, description, video_url, thumbnail_url, published_at, playlist_id", { count: "exact" })
    .eq("published", true)
    .eq("video_type", "interview")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return { playlists: playlists ?? [], videos: videos ?? [], totalCount: count ?? 0, page, totalPages };
}

export default async function InterviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ playlist?: string; page?: string }>;
}) {
  const params     = await searchParams;
  const playlistId = params.playlist ?? null;
  const page       = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const { playlists, videos, totalCount, totalPages } = await getData(playlistId, page);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" dir="rtl">
      <SectionHeader
        title="البرامج والحلقات"
        subtitle="أرشيف حلقات قناة البلاغ"
      />

      <Suspense>
        <InterviewsClient
          videos={videos}
          playlists={playlists}
          activePlaylistId={playlistId}
          totalCount={totalCount}
          page={page}
          totalPages={totalPages}
        />
      </Suspense>
    </div>
  );
}
