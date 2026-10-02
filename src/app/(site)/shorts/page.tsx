import { supabaseAdmin } from "@/lib/supabase";
import { SHORTS_PLAYLIST_IDS } from "@/lib/shorts-playlists";
import SectionHeader from "@/components/ui/SectionHeader";
import ShortsClient from "./ShortsClient";

export const revalidate = 60;

export const metadata = {
  title: "مقاطع وفيديوهات | البلاغ",
  description: "مقاطع قصيرة وفيديوهات من قناة البلاغ",
  alternates: { canonical: "/shorts" },
};

const PAGE_SIZE = 48;

async function getVideos(kind: "short" | "video", page: number) {
  // Show videos with no playlist OR videos from designated shorts playlists
  const orFilter = [
    "playlist_id.is.null",
    ...SHORTS_PLAYLIST_IDS.map(id => `playlist_id.eq.${id}`),
  ].join(",");

  const from = (page - 1) * PAGE_SIZE;
  let query = supabaseAdmin
    .from("site_videos")
    .select("id, title, description, thumbnail_url, published_at, video_type, hashtags", { count: "exact" })
    .eq("published", true)
    .or(orFilter);

  query = kind === "short" ? query.eq("video_type", "short") : query.neq("video_type", "short");

  const { data, count } = await query
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const countFor = async (videoKind: "short" | "video") => {
    let countQuery = supabaseAdmin
      .from("site_videos")
      .select("id", { count: "exact", head: true })
      .eq("published", true)
      .or(orFilter);
    countQuery = videoKind === "short"
      ? countQuery.eq("video_type", "short")
      : countQuery.neq("video_type", "short");
    const { count: total } = await countQuery;
    return total ?? 0;
  };

  const otherKind = kind === "short" ? "video" : "short";
  const otherCount = await countFor(otherKind);
  const activeCount = count ?? 0;

  return {
    videos: data ?? [],
    counts: kind === "short"
      ? { short: activeCount, video: otherCount }
      : { short: otherCount, video: activeCount },
    totalPages: Math.max(1, Math.ceil(activeCount / PAGE_SIZE)),
  };
}

export default async function ShortsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; page?: string }>;
}) {
  const params = await searchParams;
  const kind = params.kind === "video" ? "video" : "short";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const { videos, counts, totalPages } = await getVideos(kind, page);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" dir="rtl">
      <SectionHeader
        as="h1"
        title="مقاطع وفيديوهات"
        subtitle="مقاطع قصيرة وفيديوهات مختارة من قناة البلاغ"
      />

      <ShortsClient
        videos={videos}
        kind={kind}
        counts={counts}
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}
