"use client";

import { useState } from "react";
import SiteVideoCard from "@/components/ui/SiteVideoCard";
import SiteVideoModal from "@/components/ui/SiteVideoModal";
import SectionHeader from "@/components/ui/SectionHeader";

interface Playlist { id: string; name: string; }

interface SiteVideo {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  playlist_id: string | null;
  published_at: string | null;
}

interface Props {
  videos: SiteVideo[];
  playlists: Playlist[];
}

export default function SiteVideosSection({ videos, playlists }: Props) {
  const [playing, setPlaying]           = useState<SiteVideo | null>(null);
  const [activePlaylist, setActive]     = useState<string | null>(null);

  if (videos.length === 0) return null;

  const visiblePlaylists = playlists.filter((p) => videos.some((v) => v.playlist_id === p.id));
  const displayed = activePlaylist
    ? videos.filter((v) => v.playlist_id === activePlaylist)
    : videos;

  return (
    <>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SectionHeader title="فيديوهات" subtitle="مقاطع فيديو مختارة من البلاغ" />

        {/* Playlist tabs */}
        {visiblePlaylists.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-1" dir="rtl">
            <button
              onClick={() => setActive(null)}
              className="px-4 py-1.5 rounded-full text-sm font-bold shrink-0 transition-all"
              style={{
                background: activePlaylist === null ? "linear-gradient(135deg, #C9A844, #9A7B28)" : "rgba(201,168,68,0.08)",
                color: activePlaylist === null ? "#111008" : "#C9A844",
                border: "1px solid rgba(201,168,68,0.3)",
              }}
            >
              الكل
            </button>
            {visiblePlaylists.map((p) => (
              <button
                key={p.id}
                onClick={() => setActive(p.id === activePlaylist ? null : p.id)}
                className="px-4 py-1.5 rounded-full text-sm font-bold shrink-0 transition-all"
                style={{
                  background: activePlaylist === p.id ? "linear-gradient(135deg, #C9A844, #9A7B28)" : "rgba(201,168,68,0.08)",
                  color: activePlaylist === p.id ? "#111008" : "#C9A844",
                  border: "1px solid rgba(201,168,68,0.3)",
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayed.map((v) => (
            <SiteVideoCard
              key={v.id}
              {...v}
              onPlay={(video) => setPlaying({ ...v, ...video })}
            />
          ))}
        </div>
      </section>

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
