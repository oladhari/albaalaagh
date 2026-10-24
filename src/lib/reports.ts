import { isProgrammeArticle, programmeArticlePath } from "./programme-articles";
import { compactUuid } from "./public-urls";

export const REPORT_CATEGORIES = ["تقارير", "تقارير فيديو"] as const;
export function isReport(category: string) {
  return REPORT_CATEGORIES.some((value) => value === category);
}
export function reportPublicId(report: { id: string; slug?: string | null }): string {
  const slug = report.slug?.trim();
  return slug && /^[a-zA-Z0-9]+$/.test(slug) ? slug : compactUuid(report.id);
}
export function reportPath(report: { id: string; slug?: string | null }): string {
  return `/reports/${reportPublicId(report)}`;
}
export function articlePath(article: { id: string; slug: string; category: string }) {
  if (isProgrammeArticle(article.category)) return programmeArticlePath(article);
  return isReport(article.category) ? reportPath(article) : `/articles/${article.slug}`;
}
