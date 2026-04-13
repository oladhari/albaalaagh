import { timeAgo } from "@/lib/utils";
import type { NewsArticle } from "@/types";

export default function NewsCard({ article }: { article: NewsArticle }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-3 p-3 rounded-xl card-hover"
      style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
    >
      {/* Image */}
      {article.image_url && (
        <div className="shrink-0 w-20 h-16 rounded-lg overflow-hidden">
          <img
            src={article.image_url}
            alt={article.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: "rgba(201,168,68,0.12)", color: "#C9A844" }}
          >
            {article.source}
          </span>
          {article.category && (
            <span className="text-xs" style={{ color: "#9A9070" }}>
              {article.category}
            </span>
          )}
        </div>
        <h3
          className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-[#C9A844] transition-colors"
          style={{ color: "#F0EAD6" }}
        >
          {article.title}
        </h3>
        <p className="text-xs mt-1" style={{ color: "#9A9070" }}>
          {timeAgo(article.published_at)}
        </p>
      </div>
    </a>
  );
}
