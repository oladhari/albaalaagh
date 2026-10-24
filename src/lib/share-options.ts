import { isProgrammeArticle, programmeArticlePublicId } from "./programme-articles";
import { isReport, reportPublicId } from "./reports";

export type ShareContentType = "article" | "news" | "report" | "programme";
export interface ShareOptions {
  title: string;
  excerpt?: string;
  slug: string;
  writerName?: string;
  type: ShareContentType;
  facebook_image?: string | null;
  image?: string | null;
}
export function shareUrl(opts: { type?: ShareContentType; slug: string }): string {
  const section = opts.type === "news" ? "taqrir" : opts.type === "report" ? "reports" : opts.type === "programme" ? "from-programmes" : "articles";
  return `https://www.albaalaagh.com/${section}/${opts.slug}`;
}
export interface ArticleShareRecord {
  id: string;
  title: string;
  excerpt?: string | null;
  slug: string;
  category: string;
  cover_image?: string | null;
  writer?: { name?: string | null } | null;
}
export function articleShareOptions(article: ArticleShareRecord): ShareOptions {
  const report = isReport(article.category);
  const programme = isProgrammeArticle(article.category);
  return {
    title: article.title,
    excerpt: article.excerpt ?? "",
    slug: programme ? programmeArticlePublicId(article) : report ? reportPublicId(article) : article.slug,
    type: programme ? "programme" : report ? "report" : "article",
    writerName: article.writer?.name ?? (report || programme ? "قناة البلاغ الرقمية" : undefined),
    // Editorial sections share their main landscape cover. News keeps its own square asset.
    facebook_image: article.cover_image || null,
    image: article.cover_image || null,
  };
}
export function isPublishedArticle(article: { status: string; published: boolean }): boolean {
  return article.status === "published" && article.published;
}
