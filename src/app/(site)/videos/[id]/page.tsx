import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import ShareButtons from "@/components/ui/ShareButtons";

export const revalidate = 300;

async function getVideo(id: string) {
  const { data } = await supabaseAdmin
    .from("site_videos")
    .select("id, title, description, video_url, thumbnail_url, published_at, video_type, hashtags")
    .eq("id", id)
    .eq("published", true)
    .single();
  return data;
}

// Strip Unicode replacement characters (U+FFFD) left by corrupted emojis from Facebook/YouTube.
// Returns a short clean snippet for OG/SEO use.
function cleanDesc(raw: string): string {
  return raw
    .replace(/�/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function ogSnippet(raw: string | null | undefined): string {
  if (!raw) return "";
  const clean = cleanDesc(raw);
  const first = clean.split("\n\n")[0] ?? clean.split("\n")[0] ?? clean;
  return first.replace(/\n/g, " ").slice(0, 250).trim();
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = await getVideo(id);
  if (!video) return {};

  const base = "https://www.albaalaagh.com";
  const url = `${base}/videos/${id}`;
  const isShort = video.video_type === "short";
  const w = isShort ? 720 : 1280;
  const h = isShort ? 1280 : 720;

  const metaDesc = ogSnippet(video.description) || video.title;
  const ytId = video.video_url.match(/[?&]v=([^&]+)/)?.[1] ?? null;

  const ogImage = video.thumbnail_url ?? `${base}/og-image.png`;
  const ogImages = [{ url: ogImage, width: video.thumbnail_url ? w : 1200, height: video.thumbnail_url ? h : 630 }];

  return {
    title: `${video.title} | البلاغ`,
    description: metaDesc,
    openGraph: {
      title: video.title,
      description: metaDesc,
      url,
      siteName: "البلاغ",
      locale: "ar_TN",
      type: "video.other",
      images: ogImages,
      ...(ytId ? { videos: [{ url: `https://www.youtube.com/embed/${ytId}`, type: "text/html", width: w, height: h }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: video.title,
      description: metaDesc,
      images: [ogImage],
    },
    other: {
      "fb:app_id": process.env.NEXT_PUBLIC_FB_APP_ID ?? "",
      ...(ytId ? {
        "og:video": `https://www.youtube.com/embed/${ytId}`,
        "og:video:type": "text/html",
        "og:video:width": String(w),
        "og:video:height": String(h),
      } : {}),
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
        {(() => {
          const ytId = video.video_url.match(/[?&]v=([^&]+)/)?.[1];
          return ytId ? (
            <div style={{ position: "relative", paddingBottom: video.video_type === "short" ? "177.78%" : "56.25%", height: 0 }}>
              <iframe
                src={`https://www.youtube.com/embed/${ytId}?rel=0`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none", display: "block" }}
              />
            </div>
          ) : (
            <video
              src={video.video_url}
              controls
              className="w-full"
              poster={video.thumbnail_url ?? undefined}
              style={{ display: "block", maxHeight: video.video_type === "short" ? "80vh" : "70vh" }}
            />
          );
        })()}
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

      {video.description && (() => {
        const clean = cleanDesc(video.description);
        return clean ? (
          <div
            className="text-sm leading-loose mb-3 whitespace-pre-wrap"
            style={{ color: "#9A9070" }}
          >
            {clean}
          </div>
        ) : null;
      })()}

      {video.hashtags && (
        <p className="text-sm mb-4" style={{ color: "#C9A844" }}>{video.hashtags}</p>
      )}

      <ShareButtons title={video.title} url={url} />
    </div>
  );
}
