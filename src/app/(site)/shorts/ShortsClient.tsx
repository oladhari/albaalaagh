"use client";

import { useState } from "react";
import Link from "next/link";

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
  shorts: Video[];
  videos: Video[];
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
    <Link href={`/videos/${video.id}`} className="group block">
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
    <Link href={`/videos/${video.id}`} className="group block">
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
            {new Date(video.published_at).toLocaleDateString("ar-TN", { year: "numeric", month: "short", day: "numeric" })}
          </p>
        )}
      </div>
    </Link>
  );
}

export default function ShortsClient({ shorts, videos }: Props) {
  const hasShorts = shorts.length > 0;
  const hasVideos = videos.length > 0;

  const tabs = [
    ...(hasShorts ? [{ key: "short" as const, label: "مقاطع قصيرة", count: shorts.length }] : []),
    ...(hasVideos ? [{ key: "video" as const, label: "فيديوهات",    count: videos.length }] : []),
  ];

  const [tab, setTab] = useState<"short" | "video">(tabs[0]?.key ?? "video");

  if (!hasShorts && !hasVideos) {
    return (
      <div className="text-center py-20" style={{ color: "#9A9070" }}>
        لا توجد فيديوهات بعد في هذا القسم
      </div>
    );
  }

  const activeList = tab === "short" ? shorts : videos;

  return (
    <>
      {tabs.length > 1 && (
        <div className="flex gap-3 mb-8">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-5 py-2 rounded-full text-sm font-bold transition-all"
              style={{
                background: tab === t.key ? "linear-gradient(135deg, #C9A844, #9A7B28)" : "transparent",
                color:      tab === t.key ? "#111008" : "#9A9070",
                border:     tab === t.key ? "none" : "1px solid #2E2A18",
              }}
            >
              {t.label}
              <span className="mr-2 text-xs opacity-70">({t.count})</span>
            </button>
          ))}
        </div>
      )}

      {tab === "short" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {activeList.map(v => <ShortCard key={v.id} video={v} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {activeList.map(v => <VideoCard key={v.id} video={v} />)}
        </div>
      )}
    </>
  );
}
