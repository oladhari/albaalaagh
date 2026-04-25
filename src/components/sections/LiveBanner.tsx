"use client";

import { useState } from "react";
import type { YTLiveStream } from "@/lib/youtube";

interface Props {
  liveStream: YTLiveStream | null;
}

export default function LiveBanner({ liveStream }: Props) {
  const [open, setOpen] = useState(false);

  if (!liveStream) return null;

  return (
    <div style={{ background: "#1A0808", borderBottom: "2px solid rgba(220,50,50,0.4)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-3 text-right"
        >
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#FF4444" }} />
            <span className="relative inline-flex rounded-full h-3 w-3" style={{ background: "#FF2222" }} />
          </span>
          <span className="text-xs font-black tracking-widest shrink-0" style={{ color: "#FF4444" }}>
            🔴 بث مباشر الآن
          </span>
          <span className="text-sm font-bold truncate flex-1" style={{ color: "#F0EAD6" }}>
            {liveStream.title}
          </span>
          <span className="text-xs shrink-0 px-3 py-1 rounded-full font-bold" style={{ background: "#FF2222", color: "#fff" }}>
            {open ? "إخفاء ▲" : "شاهد ▼"}
          </span>
        </button>

        {open && (
          <div className="mt-4 mx-auto rounded-xl overflow-hidden" style={{ maxWidth: "800px", aspectRatio: "16/9" }}>
            <iframe
              src={`https://www.youtube.com/embed/${liveStream.youtube_id}?autoplay=1`}
              title={liveStream.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full"
              style={{ border: "none" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
