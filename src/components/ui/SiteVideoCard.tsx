"use client";

interface Props {
  id: string;
  title: string;
  description?: string | null;
  video_url: string;
  thumbnail_url?: string | null;
  onPlay: (video: { title: string; video_url: string; thumbnail_url?: string | null }) => void;
}

export default function SiteVideoCard({ title, description, video_url, thumbnail_url, onPlay }: Props) {
  return (
    <button
      className="group text-right w-full rounded-2xl overflow-hidden flex flex-col card-hover"
      style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
      onClick={() => onPlay({ title, video_url, thumbnail_url })}
    >
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

        {/* Dark overlay */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(17,16,8,0.7) 0%, transparent 60%)" }}
        />

        {/* Play button */}
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
      </div>
    </button>
  );
}
