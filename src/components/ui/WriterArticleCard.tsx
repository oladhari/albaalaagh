import { timeAgo } from "@/lib/utils";
import type { WriterArticle } from "@/types";

export default function WriterArticleCard({ article }: { article: WriterArticle }) {
  const initial = article.writer_name.split(" ").pop()?.[0] ?? "ك";

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-xl overflow-hidden card-hover"
      style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
    >
      {/* Cover image or gradient placeholder */}
      <div className="overflow-hidden shrink-0" style={{ aspectRatio: "16/9" }}>
        {article.image_url ? (
          <img
            src={article.image_url}
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              const parent = (e.currentTarget as HTMLImageElement).parentElement;
              if (parent) {
                parent.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1A1810,#2E2A18);font-size:2.5rem;font-weight:900;color:#C9A844">${initial}</div>`;
              }
            }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-5xl font-black"
            style={{ background: "linear-gradient(135deg, #1A1810, #2E2A18)", color: "#C9A844" }}
          >
            {initial}
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        {/* Writer + source */}
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: "rgba(201,168,68,0.12)", color: "#C9A844" }}
          >
            {article.writer_name}
          </span>
          <span className="text-xs" style={{ color: "#9A9070" }}>
            {timeAgo(article.published_at)}
          </span>
        </div>

        {/* Title */}
        <h3
          className="font-bold text-sm leading-snug line-clamp-3 mb-2 group-hover:text-[#C9A844] transition-colors flex-1"
          style={{ color: "#F0EAD6" }}
        >
          {article.title}
        </h3>

        {/* Source domain */}
        {article.source && (
          <p className="text-xs mt-auto" style={{ color: "#9A9070" }}>
            {article.source} ↗
          </p>
        )}
      </div>
    </a>
  );
}
