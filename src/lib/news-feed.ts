import { scoreNewsPriority } from "./news-priority";

export const NEWS_FRESHNESS_HOURS = 24;
export const NEWS_FRESHNESS_MS = NEWS_FRESHNESS_HOURS * 60 * 60 * 1000;

type NewsSuggestion = {
  title?: string | null;
  excerpt?: string | null;
  url?: string | null;
  submitted_by?: string | null;
  published_at?: string | null;
  source?: string | null;
  source_topic?: string | null;
  geo?: string | null;
  category?: string | null;
  priority_score?: number | null;
};

// Source order only breaks ties inside the same editorial topic.
const SOURCE_PRIORITY: Record<string, number> = {
  "رئاسة الحكومة التونسية": 1,
  "موزاييك FM": 2,
  "نواة": 3,
  "الجزيرة": 4,
  "الأناضول": 5,
  "أخبار الأمم المتحدة": 6,
  "DW عربية": 7,
  "فرانس 24 عربي": 8,
  "BBC عربي": 8,
  "USGS": 9,
  "GDACS": 10,
  "BBC World": 11,
  "BBC Technology": 12,
  "MIT Technology Review": 13,
  "Ars Technica": 14,
  "TechCrunch": 15,
  "NASA": 16,
};

export function newsFreshnessCutoff(now = Date.now()): string {
  return new Date(now - NEWS_FRESHNESS_MS).toISOString();
}

export function isFreshNewsDate(
  publishedAt: string | null | undefined,
  now = Date.now()
): boolean {
  if (!publishedAt) return false;
  const timestamp = new Date(publishedAt).getTime();
  return Number.isFinite(timestamp) && timestamp >= now - NEWS_FRESHNESS_MS;
}

/** Publisher location is a fallback, not the location of every story it carries. */
export function resolveNewsGeo(item: NewsSuggestion): string {
  const title = (item.title ?? "").toLowerCase();
  if (/تونس|تونسي|قيس سعيد|\btunisia\b/.test(title)) return "tunisia";
  if (/فلسطين|غزة|إسرائيل|اسرائيل|نتنياهو|نتانياهو|لبنان|سوريا|إيران|ايران|مصر(?![ء-ي])|ليبيا|السعودية|الأردن|العراق|اليمن|المغرب|الجزائر|السودان|غزه|gaza|israel|lebanon|iran|yemen|sudan/.test(title)) return "arab";
  if (/أمريكا|امريكا|أوروبا|اوروبا|روسيا|الصين|أوكرانيا|اوكرانيا|فرنسا|إيطاليا|ايطاليا|الهند|سويسرا|بريطانيا|ألمانيا|المانيا|إسبانيا|اسبانيا|اليابان|باكستان|أفغانستان|افغانستان|ترامب|بوتين|واشنطن|باريس|لندن|بروكسل|مجلس الأمن|موناكو|ukraine|russia|france|united states|security council|\bindia\b|switzerland/.test(title)) return "international";
  const fallback = item.geo || item.source_topic || "general";
  return ["tunisia", "arab", "international", "general"].includes(fallback) ? fallback : "general";
}

/** Tunisia → Arab → international/general/disaster → technology. */
export function newsTopicRank(item: NewsSuggestion): number {
  if (item.source_topic === "technology" || item.category === "تكنولوجيا") return 3;
  const geo = resolveNewsGeo(item);
  if (geo === "tunisia") return 0;
  if (geo === "arab") return 1;
  return 2;
}

export function sortNewsSuggestions<T extends NewsSuggestion>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const topicDifference = newsTopicRank(a) - newsTopicRank(b);
    if (topicDifference !== 0) return topicDifference;

    const priorityDifference = suggestionPriority(b) - suggestionPriority(a);
    if (priorityDifference !== 0) return priorityDifference;

    const sourceDifference = (SOURCE_PRIORITY[a.source ?? ""] ?? 99)
      - (SOURCE_PRIORITY[b.source ?? ""] ?? 99);
    if (sourceDifference !== 0) return sourceDifference;

    return new Date(b.published_at ?? 0).getTime()
      - new Date(a.published_at ?? 0).getTime();
  });
}

// Re-score existing pending rows as well as freshly fetched items; no backfill or
// edits to published articles are needed when the editorial rules improve.
export function suggestionPriority(item: NewsSuggestion): number {
  if (item.source === "GDACS" && /\bgreen\b|أخضر/i.test(item.title ?? "")) return 0;
  if (item.source === "USGS") return Math.max(8, item.priority_score ?? 0);
  return Math.max(item.priority_score ?? 0, scoreNewsPriority(item.title ?? "", item.excerpt ?? ""));
}

function headlineTokens(value: string): Set<string> {
  return new Set(value.toLowerCase().normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/)
    .filter((word) => (word.length > 2 || /^\p{N}+$/u.test(word)) && !["على", "الى", "إلى", "بعد", "قبل", "عاجل", "مباشر", "the", "and", "for", "with"].includes(word)));
}

/** A short balanced shortlist; technology/science and manual submissions stay available. */
export function selectImportantNews<T extends NewsSuggestion>(items: T[], perRegion = 12): T[] {
  // Pick by impact and recency across the whole world pool before arranging
  // the results by region; a busy regional feed must not crowd out a bigger event.
  const sorted = [...items].sort((a, b) => suggestionPriority(b) - suggestionPriority(a)
    || new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime());
  const selected: T[] = [];
  const seen: { region: number; tokens: Set<string> }[] = [];
  const counts = [0, 0];
  for (const item of sorted) {
    const rank = newsTopicRank(item);
    if (rank === 3 || item.submitted_by || item.source === "البلاغ") { selected.push(item); continue; }
    const region = rank === 0 ? 0 : 1;
    if (suggestionPriority(item) < 5 || counts[region] >= perRegion) continue;
    const tokens = headlineTokens(item.title ?? "");
    if (tokens.size >= 4 && seen.some((other) => {
      if (other.region !== region) return false;
      const intersection = [...tokens].filter((word) => other.tokens.has(word)).length;
      return intersection / (tokens.size + other.tokens.size - intersection) === 1;
    })) continue;
    selected.push(item); seen.push({ region, tokens }); counts[region]++;
  }
  return sortNewsSuggestions(selected);
}
