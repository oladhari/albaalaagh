import { compactUuid } from "./public-urls";

export const PROGRAMME_ARTICLE_CATEGORY = "من برامجنا";
export function isProgrammeArticle(category: string) {
  return category === PROGRAMME_ARTICLE_CATEGORY;
}
export function programmeArticlePublicId(article: { id: string; slug?: string | null }) {
  const slug = article.slug?.trim();
  return slug && /^[a-zA-Z0-9]+$/.test(slug) ? slug : compactUuid(article.id);
}

export function programmeArticlePath(article: { id: string; slug?: string | null }) {
  return `/from-programmes/${programmeArticlePublicId(article)}`;
}
