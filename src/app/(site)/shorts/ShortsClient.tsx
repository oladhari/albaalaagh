import Link from "next/link";
import { formatArabicDate } from "@/lib/utils";
import { videoPath } from "@/lib/public-urls";

interface Video {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  video_type: string;
  hashtags: string | null;
}

interface Props {
  videos: Video[];
  kind: "short" | "video";
  counts: { short: number; video: number };
  page: number;
  totalPages: number;
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-8 h-8 drop-shadow-lg" fill="none">
      <circle cx="12" cy="12" r="12" fill="rgba(0,0,0,0.5)" />
      <polygon points="9.5,7 18,12 9.5,17" fill="#F0EAD6" />
    </svg>
  );
}

function ShortCard({ video }: { video: Video }) {
  return (
    <Link href={videoPath(video.id)} className="group block">
      <div className="relative overflow-hidden rounded-2xl" style={{ aspectRatio: "9/16", background: "#1A1810" }}>
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: "#2E2A18" }}>
            <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none">
              <polygon points="5,3 19,12 5,21" fill="#C9A844" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <PlayIcon />
        </div>
        <div className="absolute bottom-0 right-0 left-0 p-3">
          <p className="text-xs font-bold leading-snug line-clamp-2" style={{ color: "#F0EAD6" }}>{video.title}</p>
          {video.hashtags && (
            <p className="text-xs mt-1 truncate" style={{ color: "#C9A844" }}>{video.hashtags}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

function VideoCard({ video }: { video: Video }) {
  return (
    <Link href={videoPath(video.id)} className="group block">
      <div className="relative overflow-hidden rounded-xl" style={{ aspectRatio: "16/9", background: "#1A1810" }}>
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: "#2E2A18" }}>
            <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none">
              <polygon points="5,3 19,12 5,21" fill="#C9A844" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <PlayIcon />
        </div>
      </div>
      <div className="mt-2 px-1">
        <p className="text-sm font-bold leading-snug line-clamp-2" style={{ color: "#F0EAD6" }}>{video.title}</p>
        {video.description && (
          <p className="text-xs mt-1 line-clamp-2" style={{ color: "#9A9070" }}>{video.description}</p>
        )}
        {video.published_at && (
          <p className="text-xs mt-1" style={{ color: "#6B6448" }}>
            {formatArabicDate(video.published_at)}
          </p>
        )}
      </div>
    </Link>
  );
}

export default function ShortsClient({ videos, kind, counts, page, totalPages }: Props) {
  const tabs = [
    ...(counts.short > 0 ? [{ key: "short" as const, label: "مقاطع قصيرة", count: counts.short }] : []),
    ...(counts.video > 0 ? [{ key: "video" as const, label: "فيديوهات", count: counts.video }] : []),
  ];

  if (counts.short === 0 && counts.video === 0) {
    return (
      <div className="text-center py-20" style={{ color: "#9A9070" }}>
        لا توجد فيديوهات بعد في هذا القسم
      </div>
    );
  }

  return (
    <>
      {tabs.length > 1 && (
        <div className="flex gap-3 mb-8">
          {tabs.map(t => (
            <Link
              key={t.key}
              href={`/shorts?kind=${t.key}`}
              className="px-5 py-2 rounded-full text-sm font-bold transition-all"
              style={{
                background: kind === t.key ? "linear-gradient(135deg, #C9A844, #9A7B28)" : "transparent",
                color:      kind === t.key ? "#111008" : "#9A9070",
                border:     kind === t.key ? "none" : "1px solid #2E2A18",
              }}
            >
              {t.label}
              <span className="mr-2 text-xs opacity-70">({t.count})</span>
            </Link>
          ))}
        </div>
      )}

      {kind === "short" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {videos.map(v => <ShortCard key={v.id} video={v} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {videos.map(v => <VideoCard key={v.id} video={v} />)}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-3 mt-10" aria-label="صفحات الفيديوهات">
          {page > 1 && (
            <Link
              href={`/shorts?kind=${kind}&page=${page - 1}`}
              className="px-5 py-2 rounded-full text-sm font-bold"
              style={{ border: "1px solid #2E2A18", color: "#C9A844" }}
            >
              الصفحة السابقة
            </Link>
          )}
          <span className="text-sm" style={{ color: "#9A9070" }}>{page} / {totalPages}</span>
          {page < totalPages && (
            <Link
              href={`/shorts?kind=${kind}&page=${page + 1}`}
              className="px-5 py-2 rounded-full text-sm font-bold"
              style={{ border: "1px solid #2E2A18", color: "#C9A844" }}
            >
              الصفحة التالية
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
