"use client";

import { useEffect, useRef } from "react";

interface Props {
  title: string;
  video_url: string;
  onClose: () => void;
}

export default function SiteVideoModal({ title, video_url, onClose }: Props) {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.92)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-4xl rounded-2xl overflow-hidden" style={{ background: "#111008", border: "1px solid #2E2A18" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #2E2A18" }}>
          <h2 className="font-black text-base line-clamp-1" style={{ color: "#F0EAD6" }}>{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg leading-none transition-colors hover:opacity-70"
            style={{ background: "#2E2A18", color: "#9A9070" }}
          >
            ×
          </button>
        </div>

        {/* Video */}
        <div className="w-full" style={{ aspectRatio: "16/9", background: "#000" }}>
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
        </div>
      </div>
    </div>
  );
}
