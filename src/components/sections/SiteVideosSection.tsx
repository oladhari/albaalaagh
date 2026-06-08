"use client";

import { useState } from "react";
import SiteVideoCard from "@/components/ui/SiteVideoCard";
import SiteVideoModal from "@/components/ui/SiteVideoModal";
import SectionHeader from "@/components/ui/SectionHeader";

interface SiteVideo {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
}

interface Props {
  videos: SiteVideo[];
}

export default function SiteVideosSection({ videos }: Props) {
  const [playing, setPlaying] = useState<SiteVideo | null>(null);

  if (videos.length === 0) return null;

  return (
    <>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SectionHeader
          title="فيديوهات"
          subtitle="مقاطع فيديو مختارة من البلاغ"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {videos.map((v) => (
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
          title={playing.title}
          video_url={playing.video_url}
          onClose={() => setPlaying(null)}
        />
      )}
    </>
  );
}
