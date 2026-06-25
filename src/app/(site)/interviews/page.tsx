import { Suspense } from "react";
import { supabaseAdmin } from "@/lib/supabase";
import SectionHeader from "@/components/ui/SectionHeader";
import InterviewsClient from "./InterviewsClient";

export const revalidate = 60;

export const metadata = {
  title: "البرامج والحلقات | البلاغ",
  description: "أرشيف كامل لبرامج وحلقات قناة البلاغ",
};

async function getData(playlistId: string | null) {
  const [{ data: playlists }, { data: videos, count }] = await Promise.all([
    supabaseAdmin
      .from("playlists")
      .select("id, name")
      .order("display_order", { ascending: true }),
    supabaseAdmin
      .from("site_videos")
      .select("id, title, description, video_url, thumbnail_url, published_at, playlist_id", { count: "exact" })
      .eq("published", true)
      .eq("video_type", "interview")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(120),
  ]);

  const allVideos = videos ?? [];
  const filtered = playlistId
    ? allVideos.filter(v => v.playlist_id === playlistId)
    : allVideos;

  return {
    playlists: playlists ?? [],
    videos: filtered,
    totalCount: playlistId ? filtered.length : (count ?? allVideos.length),
  };
}

export default async function InterviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ playlist?: string }>;
}) {
  const params = await searchParams;
  const playlistId = params.playlist ?? null;
  const { playlists, videos, totalCount } = await getData(playlistId);

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
        />
      </Suspense>
    </div>
  );
}
