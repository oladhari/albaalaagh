"use client";

import { useState } from "react";
import VideoCard from "@/components/ui/VideoCard";
import type { YTVideo, YTPlaylist } from "@/lib/youtube";

type Tab = "live" | "playlists" | "shorts";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "live",      label: "البث المباشر",   icon: "●" },
  { key: "playlists", label: "البرامج والسلاسل", icon: "☰" },
  { key: "shorts",    label: "مقاطع قصيرة",    icon: "▶" },
];

interface Props {
  liveStreams: YTVideo[];
  playlists:  YTPlaylist[];
  shorts:     YTVideo[];
}

export default function InterviewsTabs({ liveStreams, playlists, shorts }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("live");

  return (
    <div>
      {/* Tab bar */}
      <div
        className="flex gap-1 mb-8 p-1 rounded-xl"
        style={{ background: "#1A1810", border: "1px solid #2E2A18", display: "inline-flex" }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-5 py-2 rounded-lg text-sm font-bold transition-all"
            style={{
              background: activeTab === tab.key ? "linear-gradient(135deg, #C9A844, #9A7B28)" : "transparent",
              color:      activeTab === tab.key ? "#111008" : "#9A9070",
            }}
          >
            <span className={`ml-1.5 ${tab.key === "live" && activeTab === tab.key ? "text-red-800" : ""}`}>
              {tab.icon}
            </span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Live streams ── */}
      {activeTab === "live" && (
        <div>
          {liveStreams.length === 0 ? (
            <p className="text-center py-16" style={{ color: "#9A9070" }}>لا توجد بثوث مباشرة بعد</p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {liveStreams.map((video) => (
                  <VideoCard key={video.id} {...video} />
                ))}
              </div>
              <div className="text-center mt-8">
                <a
                  href="https://www.youtube.com/@albaalaagh/streams"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold"
                  style={{ background: "linear-gradient(135deg, #C9A844, #9A7B28)", color: "#111008" }}
                >
                  عرض جميع البثوث على يوتيوب ↗
                </a>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Playlists ── */}
      {activeTab === "playlists" && (
        <div>
          {playlists.length === 0 ? (
            <p className="text-center py-16" style={{ color: "#9A9070" }}>لا توجد قوائم تشغيل</p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {playlists.map((playlist) => (
                  <a
                    key={playlist.id}
                    href={`https://www.youtube.com/playlist?list=${playlist.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group rounded-2xl overflow-hidden card-hover flex flex-col"
                    style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
                  >
                    {/* Thumbnail */}
                    <div className="relative overflow-hidden" style={{ aspectRatio: "16/9" }}>
                      <img
                        src={playlist.latestVideo?.thumbnail_url || playlist.thumbnail_url}
                        alt={playlist.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                      <div
                        className="absolute inset-0"
                        style={{ background: "linear-gradient(to top, rgba(17,16,8,0.8) 0%, transparent 60%)" }}
                      />
                      <div
                        className="absolute top-3 left-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ background: "rgba(201,168,68,0.9)", color: "#111008" }}
                      >
                        <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
                          <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h10v2H4z"/>
                        </svg>
                        قائمة تشغيل
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4 flex flex-col flex-1">
                      <h3
                        className="font-black text-sm mb-2 group-hover:text-[#C9A844] transition-colors"
                        style={{ color: "#F0EAD6" }}
                      >
                        {playlist.title}
                      </h3>
                      {playlist.description && (
                        <p
                          className="text-xs leading-relaxed line-clamp-2 flex-1"
                          style={{ color: "#9A9070", lineHeight: "1.8" }}
                        >
                          {playlist.description}
                        </p>
                      )}
                      {playlist.latestVideo && (
                        <div
                          className="mt-3 pt-3 text-xs"
                          style={{ borderTop: "1px solid #2E2A18", color: "#9A9070" }}
                        >
                          آخر حلقة: <span className="line-clamp-1">{playlist.latestVideo.title}</span>
                        </div>
                      )}
                    </div>
                  </a>
                ))}
              </div>
              <div className="text-center mt-8">
                <a
                  href="https://www.youtube.com/@albaalaagh/playlists"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold"
                  style={{ background: "linear-gradient(135deg, #C9A844, #9A7B28)", color: "#111008" }}
                >
                  عرض جميع البرامج على يوتيوب ↗
                </a>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Shorts ── */}
      {activeTab === "shorts" && (
        <div>
          {shorts.length === 0 ? (
            <p className="text-center py-16" style={{ color: "#9A9070" }}>لا توجد مقاطع قصيرة</p>
          ) : (
            <>
              {/* Shorts use portrait cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {shorts.map((video) => (
                  <a
                    key={video.id}
                    href={`https://www.youtube.com/shorts/${video.youtube_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block rounded-xl overflow-hidden card-hover"
                    style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
                  >
                    <div className="relative overflow-hidden" style={{ aspectRatio: "9/16" }}>
                      <img
                        src={video.thumbnail_url}
                        alt={video.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div
                        className="absolute inset-0"
                        style={{ background: "linear-gradient(to top, rgba(17,16,8,0.85) 0%, transparent 50%)" }}
                      />
                      <div className="absolute bottom-2 right-2 left-2">
                        <p className="text-xs font-semibold line-clamp-2 leading-snug" style={{ color: "#F0EAD6" }}>
                          {video.title}
                        </p>
                      </div>
                      {/* Shorts icon */}
                      <div
                        className="absolute top-2 left-2 text-xs font-bold px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(220,38,38,0.9)", color: "#fff" }}
                      >
                        #
                      </div>
                    </div>
                  </a>
                ))}
              </div>
              <div className="text-center mt-8">
                <a
                  href="https://www.youtube.com/@albaalaagh/shorts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold"
                  style={{ background: "linear-gradient(135deg, #C9A844, #9A7B28)", color: "#111008" }}
                >
                  عرض جميع المقاطع القصيرة ↗
                </a>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
