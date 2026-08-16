"use client";

import Link from "next/link";
import { formatArabicDate } from "@/lib/utils";

interface Props {
  id: string;
  title: string;
  description?: string | null;
  video_url: string;
  thumbnail_url?: string | null;
  published_at?: string | null;
  onPlay?: (video: { title: string; video_url: string; thumbnail_url?: string | null }) => void;
}

const innerContent = (title: string, description: string | null | undefined, thumbnail_url: string | null | undefined, published_at: string | null | undefined) => (
  <>
    <div className="relative overflow-hidden" style={{ aspectRatio: "16/9" }}>
      {thumbnail_url ? (
        <img
          src={thumbnail_url}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center" style={{ background: "#111008" }}>
          <svg viewBox="0 0 24 24" className="w-12 h-12 opacity-30" fill="none">
            <polygon points="5,3 19,12 5,21" fill="#C9A844" />
          </svg>
        </div>
      )}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(17,16,8,0.7) 0%, transparent 60%)" }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
          style={{ background: "rgba(201,168,68,0.9)", backdropFilter: "blur(4px)" }}
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current ml-1" style={{ color: "#111008" }}>
            <polygon points="5,3 19,12 5,21" />
          </svg>
        </div>
      </div>
    </div>

    <div className="p-4 flex flex-col flex-1">
      <h3
        className="font-black text-sm leading-snug mb-1 group-hover:text-[#C9A844] transition-colors line-clamp-2"
        style={{ color: "#F0EAD6" }}
      >
        {title}
      </h3>
      {description && (
        <p className="text-xs line-clamp-2 mt-1" style={{ color: "#9A9070", lineHeight: "1.7" }}>
          {description}
        </p>
      )}
      {published_at && (
        <p className="text-xs mt-2" style={{ color: "#6B6448" }}>
          {formatArabicDate(published_at)}
        </p>
      )}
    </div>
  </>
);

export default function SiteVideoCard({ id, title, description, video_url, thumbnail_url, published_at, onPlay }: Props) {
  return (
    <div
      className="group text-right w-full rounded-2xl overflow-hidden flex flex-col card-hover relative"
      style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
    >
      {/* Share link — appears on hover */}
      <Link
        href={`/videos/${id}`}
        title="مشاركة الفيديو"
        className="absolute top-2 left-2 z-10 flex items-center justify-center w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: "rgba(17,16,8,0.75)", backdropFilter: "blur(4px)" }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#C9A844" strokeWidth="2" width="15" height="15">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
      </Link>

      {onPlay ? (
        <button
          className="text-right w-full flex flex-col flex-1"
          onClick={() => onPlay({ title, video_url, thumbnail_url })}
        >
          {innerContent(title, description, thumbnail_url, published_at)}
        </button>
      ) : (
        <Link href={`/videos/${id}`} className="text-right w-full flex flex-col flex-1">
          {innerContent(title, description, thumbnail_url, published_at)}
        </Link>
      )}
    </div>
  );
}
