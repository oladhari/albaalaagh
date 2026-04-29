import Link from "next/link";
import { formatArabicDate } from "@/lib/utils";
import type { Article } from "@/types";

export default function ArticleCard({ article }: { article: Article }) {
  return (
    <Link
      href={`/articles/${article.slug}`}
      className="group block rounded-xl overflow-hidden card-hover bg-bg-card border border-border"
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
        <span className="inline-block text-xs px-2 py-0.5 rounded-full mb-2 font-medium bg-gold/12 text-gold">
          {article.category}
        </span>

        {/* Title */}
        <h3 className="font-bold text-base leading-snug line-clamp-2 mb-2 group-hover:text-[#C9A844] transition-colors text-text">
          {article.title}
        </h3>

        {/* Excerpt */}
        <p className="text-sm leading-relaxed line-clamp-3 mb-3 text-text-muted">
          {article.excerpt}
        </p>

        {/* Author + date */}
        <div className="flex items-center gap-2">
          {article.writer?.image_url && (
            <img
              src={article.writer.image_url}
              alt={article.writer.name}
              className="w-7 h-7 rounded-full object-cover border border-border"
            />
          )}
          <div>
            {article.writer && (
              <p className="text-xs font-medium text-gold-light">
                {article.writer.name}
              </p>
            )}
            <p className="text-xs text-text-muted">
              {formatArabicDate(article.published_at)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
