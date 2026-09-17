const UUID_WITH_DASHES =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_WITHOUT_DASHES = /^[0-9a-f]{32}$/i;

export function compactUuid(id: string): string {
  return id.replaceAll("-", "");
}

export function expandCompactUuid(id: string): string {
  if (!UUID_WITHOUT_DASHES.test(id)) return id;
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
}

export function isDashedUuid(id: string): boolean {
  return UUID_WITH_DASHES.test(id);
}

export function videoPath(id: string): string {
  return `/videos/${compactUuid(id)}`;
}

export function newsPublicId(article: { id: string; slug?: string | null }): string {
  const slug = article.slug?.trim();
  return slug && !slug.includes("-") ? slug : compactUuid(article.id);
}

export function newsPath(article: { id: string; slug?: string | null }): string {
  return `/taqrir/${newsPublicId(article)}`;
}
