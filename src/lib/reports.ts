export const REPORT_CATEGORIES = ["تقارير", "تقارير فيديو"] as const;
export function isReport(category: string) {
  return REPORT_CATEGORIES.some((value) => value === category);
}
export function articlePath(article: { slug: string; category: string }) {
  return `/${isReport(article.category) ? "reports" : "articles"}/${article.slug}`;
}
