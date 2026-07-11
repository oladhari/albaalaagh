import { Suspense } from "react";
import { supabaseAdmin } from "@/lib/supabase";
import { SHORTS_PLAYLIST_IDS } from "@/lib/shorts-playlists";
import SectionHeader from "@/components/ui/SectionHeader";
import ShortsClient from "./ShortsClient";

export const revalidate = 60;

export const metadata = {
  title: "مقاطع وفيديوهات | البلاغ",
  description: "مقاطع قصيرة وفيديوهات من قناة البلاغ",
};

async function getVideos() {
  // Show videos with no playlist OR videos from designated shorts playlists
  const orFilter = [
    "playlist_id.is.null",
    ...SHORTS_PLAYLIST_IDS.map(id => `playlist_id.eq.${id}`),
  ].join(",");

  const { data } = await supabaseAdmin
    .from("site_videos")
    .select("id, title, description, thumbnail_url, published_at, video_type, hashtags")
    .eq("published", true)
    .or(orFilter)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(500);

  const all = data ?? [];
  return {
    shorts: all.filter(v => v.video_type === "short"),
    videos: all.filter(v => v.video_type !== "short"),
  };
}

export default async function ShortsPage() {
  const { shorts, videos } = await getVideos();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" dir="rtl">
      <SectionHeader
        title="مقاطع وفيديوهات"
        subtitle="مقاطع قصيرة وفيديوهات مختارة من قناة البلاغ"
      />

      <Suspense>
        <ShortsClient shorts={shorts} videos={videos} />
      </Suspense>
    </div>
  );
}
