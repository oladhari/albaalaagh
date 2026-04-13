import Link from "next/link";
import { formatArabicDate } from "@/lib/utils";
import type { Article } from "@/types";

export default function ArticleCard({ article }: { article: Article }) {
  return (
    <Link
      href={`/articles/${article.slug}`}
      className="group block rounded-xl overflow-hidden card-hover"
      style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
    >
      {/* Cover image */}
      {article.cover_image && (
        <div className="overflow-hidden" style={{ aspectRatio: "16/9" }}>
          <img
            src={article.cover_image}
            alt={article.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      )}

      <div className="p-4">
        {/* Category */}
        <span
          className="inline-block text-xs px-2 py-0.5 rounded-full mb-2 font-medium"
          style={{ background: "rgba(201,168,68,0.12)", color: "#C9A844" }}
        >
          {article.category}
        </span>

        {/* Title */}
        <h3
          className="font-bold text-base leading-snug line-clamp-2 mb-2 group-hover:text-[#C9A844] transition-colors"
          style={{ color: "#F0EAD6" }}
        >
          {article.title}
        </h3>

        {/* Excerpt */}
        <p className="text-sm leading-relaxed line-clamp-3 mb-3" style={{ color: "#9A9070" }}>
          {article.excerpt}
        </p>

        {/* Author + date */}
        <div className="flex items-center gap-2">
          {article.writer?.image_url && (
            <img
              src={article.writer.image_url}
              alt={article.writer.name}
              className="w-7 h-7 rounded-full object-cover"
              style={{ border: "1px solid #2E2A18" }}
            />
          )}
          <div>
            {article.writer && (
              <p className="text-xs font-medium" style={{ color: "#E8D5A3" }}>
                {article.writer.name}
              </p>
            )}
            <p className="text-xs" style={{ color: "#9A9070" }}>
              {formatArabicDate(article.published_at)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
