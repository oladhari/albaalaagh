import { formatArabicDate } from "@/lib/utils";

interface VideoCardProps {
  id: string;
  youtube_id: string;
  title: string;
  thumbnail_url: string;
  published_at: string;
  size?: "sm" | "md" | "lg";
}

export default function VideoCard({
  youtube_id,
  title,
  thumbnail_url,
  published_at,
  size = "md",
}: VideoCardProps) {
  const url = `https://www.youtube.com/watch?v=${youtube_id}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl overflow-hidden card-hover bg-bg-card border border-border"
    >
      {/* Thumbnail */}
      <div className="relative overflow-hidden" style={{ aspectRatio: "16/9" }}>
        <img
          src={thumbnail_url}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center bg-gold/90">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-bg" style={{ marginRight: "-3px" }}>
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
        {/* YouTube badge */}
        <div
          className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-xs font-bold text-gold"
          style={{ background: "rgba(17,16,8,0.85)" }}
        >
          يوتيوب
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3
          className={`font-bold leading-snug line-clamp-2 mb-1 group-hover:text-gold transition-colors text-text ${
            size === "lg" ? "text-base" : "text-sm"
          }`}
        >
          {title}
        </h3>
        <p className="text-xs text-text-muted">
          {formatArabicDate(published_at)}
        </p>
      </div>
    </a>
  );
}
