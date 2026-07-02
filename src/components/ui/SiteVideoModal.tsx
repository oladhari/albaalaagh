"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

function getYouTubeId(url: string): string | null {
  return url.match(/[?&]v=([^&]+)/)?.[1] ?? null;
}

interface Props {
  id: string;
  title: string;
  video_url: string;
  onClose: () => void;
}

export default function SiteVideoModal({ id, title, video_url, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
      style={{ background: "rgba(0,0,0,0.92)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-[95vw] sm:max-w-4xl rounded-xl sm:rounded-2xl overflow-hidden" style={{ background: "#111008", border: "1px solid #2E2A18" }}>
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4" style={{ borderBottom: "1px solid #2E2A18" }}>
          <h2 className="font-black text-base line-clamp-1 flex-1" style={{ color: "#F0EAD6" }}>{title}</h2>
          <Link
            href={`/videos/${id}`}
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-opacity hover:opacity-80"
            style={{ background: "rgba(201,168,68,0.12)", color: "#C9A844", border: "1px solid rgba(201,168,68,0.3)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            مشاركة
          </Link>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg leading-none transition-colors hover:opacity-70 shrink-0"
            style={{ background: "#2E2A18", color: "#9A9070" }}
          >
            ×
          </button>
        </div>

        {/* Video */}
        <div className="w-full" style={{ aspectRatio: "16/9", background: "#000" }}>
          {getYouTubeId(video_url) ? (
            <iframe
              src={`https://www.youtube.com/embed/${getYouTubeId(video_url)}?autoplay=1&rel=0`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
              style={{ display: "block", border: "none" }}
            />
          ) : (
            <video
              ref={videoRef}
              src={video_url}
              controls
              autoPlay
              className="w-full h-full"
              style={{ display: "block" }}
              controlsList="nodownload"
            >
              متصفحك لا يدعم تشغيل الفيديو.
            </video>
          )}
        </div>
      </div>
    </div>
  );
}
