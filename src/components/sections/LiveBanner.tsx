"use client";

import { useState } from "react";

const TWITCH_CHANNEL = "albaalaagh";
// Both www and non-www must be listed so the embed works regardless of how users arrive
const PARENTS = "parent=albaalaagh.com&parent=www.albaalaagh.com";

export default function LiveBanner() {
  const [open, setOpen] = useState(false);

  const src =
    `https://player.twitch.tv/?channel=${TWITCH_CHANNEL}` +
    `&${PARENTS}` +
    `&autoplay=true`;

  return (
    <div style={{ background: "#0D0808", borderBottom: "2px solid rgba(220,50,50,0.35)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-3"
          dir="rtl"
        >
          {/* Pulsing dot */}
          <span className="relative flex h-3 w-3 shrink-0">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ background: "#FF4444" }}
            />
            <span
              className="relative inline-flex rounded-full h-3 w-3"
              style={{ background: "#FF2222" }}
            />
          </span>

          <span className="text-xs font-black tracking-widest shrink-0" style={{ color: "#FF4444" }}>
            🔴 بث مباشر — Twitch
          </span>

          <span className="text-sm flex-1 text-right" style={{ color: "#9A9070" }}>
            albaalaagh.com/live
          </span>

          <span
            className="text-xs shrink-0 px-3 py-1 rounded-full font-bold"
            style={{ background: "#FF2222", color: "#fff" }}
          >
            {open ? "إخفاء ▲" : "شاهد ▼"}
          </span>
        </button>

        {open && (
          <div
            className="mt-4 mx-auto rounded-xl overflow-hidden"
            style={{ maxWidth: "860px", aspectRatio: "16/9" }}
          >
            <iframe
              src={src}
              title="البلاغ — بث مباشر"
              allowFullScreen
              allow="autoplay; fullscreen"
              className="w-full h-full"
              style={{ border: "none" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
