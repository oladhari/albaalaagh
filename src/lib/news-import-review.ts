export const NEWS_IMPORT_DRAFT_FRAGMENT = "#albaalaagh-news-draft";

export type NewsImportMatch = {
  id: string;
  title: string;
  source: string;
  status: "pending" | "approved" | "rejected";
  published_at: string;
  url: string;
  sameUrl: boolean;
};

const COMMON_WORDS = new Set([
  "التونسية", "تونس", "جديد", "جديدة", "قضية", "في", "على", "إلى", "بعد", "قبل",
  "قرار", "السجن", "سجن", "عاما", "سنة", "سنوات", "المحكمة", "الحكم", "حكم",
  "the", "and", "for", "with", "from", "this",
]);

export function newsImportTerms(title: string): string[] {
  const terms = title.toLowerCase().normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .match(/[\p{L}]+/gu) ?? [];
  return [...new Set(terms.filter((word) => word.length >= 3 && !COMMON_WORDS.has(word))
    .map((word) => word.replace(/^(?:لل|ال)(?=.{3})/u, "").replace(/^ل(?=.{4})/u, "")))];
}

export function newsImportUrls(input: string): string[] {
  const url = new URL(input);
  const normalized = url.toString();
  const path = url.pathname.replace(/%[\da-f]{2}/gi, (value) => value.toUpperCase());
  const barePath = path === "/" ? path : path.replace(/\/$/, "");
  const variants = [input, normalized];
  url.hash = "";
  variants.push(url.toString());
  for (const pathname of new Set([barePath, barePath.endsWith("/") ? barePath : barePath + "/"])) {
    url.pathname = pathname;
    variants.push(url.toString());
    url.pathname = pathname.replace(/%[\dA-F]{2}/g, (value) => value.toLowerCase());
    variants.push(url.toString());
  }
  return [...new Set(variants)];
}

export function newsImportDraftUrl(input: string): string {
  const url = new URL(input);
  url.pathname = url.pathname.replace(/%[\da-f]{2}/gi, (value) => value.toUpperCase());
  url.hash = NEWS_IMPORT_DRAFT_FRAGMENT;
  return url.toString();
}

export function newsImportSourceUrl(input: string): string {
  return input.endsWith(NEWS_IMPORT_DRAFT_FRAGMENT)
    ? input.slice(0, -NEWS_IMPORT_DRAFT_FRAGMENT.length)
    : input;
}
