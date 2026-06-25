import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import ShareButtons from "@/components/ui/ShareButtons";

export const revalidate = 3600;

async function getVideo(id: string) {
  const { data } = await supabaseAdmin
    .from("site_videos")
    .select("id, title, description, video_url, thumbnail_url, published_at, video_type, hashtags")
    .eq("id", id)
    .eq("published", true)
    .single();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = await getVideo(id);
  if (!video) return {};

  const base = "https://www.albaalaagh.com";
  const url = `${base}/videos/${id}`;
  const ogImage = video.thumbnail_url ?? `${base}/og-image.jpg`;

  return {
    title: `${video.title} | البلاغ`,
    description: video.description ?? video.title,
    openGraph: {
      title: video.title,
      description: video.description ?? video.title,
      url,
      siteName: "البلاغ",
      locale: "ar_TN",
      type: "video.other",
      images: [{ url: ogImage, width: 1280, height: 720 }],
    },
    twitter: {
      card: "summary_large_image",
      title: video.title,
      description: video.description ?? video.title,
      images: [ogImage],
    },
    other: {
      "fb:app_id": process.env.NEXT_PUBLIC_FB_APP_ID ?? "",
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = await getVideo(id);
  if (!video) notFound();

  const url = `https://www.albaalaagh.com/videos/${id}`;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10" dir="rtl">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm mb-6 hover:opacity-70 transition-opacity"
        style={{ color: "#9A9070" }}
      >
        → العودة إلى الرئيسية
      </Link>

      <div
        className="rounded-2xl overflow-hidden mb-6 mx-auto"
        style={{
          background: "#111008",
          maxWidth: video.video_type === "short" ? 400 : "100%",
        }}
      >
        <video
          src={video.video_url}
          controls
          className="w-full"
          poster={video.thumbnail_url ?? undefined}
          style={{ display: "block", maxHeight: video.video_type === "short" ? "80vh" : "70vh" }}
        />
      </div>

      <h1
        className="text-xl sm:text-2xl font-black leading-snug mb-3"
        style={{ color: "#F0EAD6" }}
      >
        {video.title}
      </h1>

      {video.published_at && (
        <p className="text-xs mb-3" style={{ color: "#6B6448" }}>
          {new Date(video.published_at).toLocaleDateString("ar-TN", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      )}

      {video.description && (
        <p className="text-sm leading-loose mb-3" style={{ color: "#9A9070" }}>
          {video.description}
        </p>
      )}

      {video.hashtags && (
        <p className="text-sm mb-4" style={{ color: "#C9A844" }}>{video.hashtags}</p>
      )}

      <ShareButtons title={video.title} url={url} />
    </div>
  );
}
