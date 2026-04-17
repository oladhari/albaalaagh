"use client";

import { timeAgo } from "@/lib/utils";
import type { NewsArticle } from "@/types";

function isValidNewsImage(url?: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (lower.includes("logo") || lower.includes("avatar") || lower.includes("icon")) return false;
  if (lower.includes("picsum") || lower.includes("placeholder") || lower.includes("pravatar")) return false;
  return true;
}

export default function NewsCard({ article }: { article: NewsArticle }) {
  const validImage = isValidNewsImage(article.image_url) ? article.image_url : undefined;
  const isInternal = article.source === "البلاغ";

  return (
    <a
      href={article.url}
      target={isInternal ? "_self" : "_blank"}
      rel={isInternal ? undefined : "noopener noreferrer"}
      className="group flex gap-3 p-3 rounded-xl card-hover"
      style={{ background: "#1A1810", border: `1px solid ${isInternal ? "rgba(201,168,68,0.25)" : "#2E2A18"}` }}
    >
      {validImage && (
        <div className="shrink-0 w-24 h-16 rounded-lg overflow-hidden">
          <img
            src={validImage}
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          {article.source && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: "rgba(201,168,68,0.12)", color: "#C9A844" }}
            >
              {article.source}
            </span>
          )}
          {article.category && (
            <span className="text-xs" style={{ color: "#9A9070" }}>{article.category}</span>
          )}
          <span className="text-xs mr-auto" style={{ color: "#9A9070" }}>
            {timeAgo(article.published_at)}
          </span>
        </div>
        <h3
          className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-[#C9A844] transition-colors"
          style={{ color: "#F0EAD6" }}
        >
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="text-xs mt-1 line-clamp-2" style={{ color: "#9A9070" }}>
            {article.excerpt}
          </p>
        )}
      </div>
    </a>
  );
}
