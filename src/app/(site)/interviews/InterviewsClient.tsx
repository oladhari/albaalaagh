"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SiteVideoCard from "@/components/ui/SiteVideoCard";
import SiteVideoModal from "@/components/ui/SiteVideoModal";

interface Playlist { id: string; name: string; }
interface SiteVideo {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  published_at: string | null;
  playlist_id: string | null;
}
interface PlayingVideo { id: string; title: string; video_url: string; }

interface Props {
  videos: SiteVideo[];
  playlists: Playlist[];
  activePlaylistId: string | null;
  totalCount: number;
}

export default function InterviewsClient({ videos, playlists, activePlaylistId, totalCount }: Props) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [playing, setPlaying] = useState<PlayingVideo | null>(null);

  const setPlaylist = useCallback((id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("playlist", id);
    else params.delete("playlist");
    router.push(`/interviews?${params.toString()}`);
  }, [router, searchParams]);

  const visiblePlaylists = playlists.filter(p => p.id !== "__none__");

  return (
    <>
      {/* Playlist filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-1" dir="rtl">
        <button
          onClick={() => setPlaylist(null)}
          className="px-4 py-1.5 rounded-full text-sm font-bold shrink-0 transition-all"
          style={{
            background: !activePlaylistId ? "linear-gradient(135deg, #C9A844, #9A7B28)" : "rgba(201,168,68,0.08)",
            color: !activePlaylistId ? "#111008" : "#C9A844",
            border: "1px solid rgba(201,168,68,0.3)",
          }}
        >
          الكل
        </button>
        {visiblePlaylists.map((p) => (
          <button
            key={p.id}
            onClick={() => setPlaylist(activePlaylistId === p.id ? null : p.id)}
            className="px-4 py-1.5 rounded-full text-sm font-bold shrink-0 transition-all"
            style={{
              background: activePlaylistId === p.id ? "linear-gradient(135deg, #C9A844, #9A7B28)" : "rgba(201,168,68,0.08)",
              color: activePlaylistId === p.id ? "#111008" : "#C9A844",
              border: "1px solid rgba(201,168,68,0.3)",
            }}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Count */}
      <p className="text-xs mb-4" style={{ color: "#6B6040" }}>
        {totalCount} حلقة
        {activePlaylistId && ` — ${playlists.find(p => p.id === activePlaylistId)?.name ?? ""}`}
      </p>

      {videos.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
        >
          <p className="text-sm" style={{ color: "#9A9070" }}>لا توجد حلقات بعد في هذا البرنامج</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {videos.map((v) => (
            <SiteVideoCard
              key={v.id}
              {...v}
              onPlay={(vid) => setPlaying({ id: v.id, title: vid.title, video_url: vid.video_url })}
            />
          ))}
        </div>
      )}

      {playing && (
        <SiteVideoModal
          id={playing.id}
          title={playing.title}
          video_url={playing.video_url}
          onClose={() => setPlaying(null)}
        />
      )}
    </>
  );
}
