export const NEWS_FRESHNESS_HOURS = 24;
export const NEWS_FRESHNESS_MS = NEWS_FRESHNESS_HOURS * 60 * 60 * 1000;

type NewsSuggestion = {
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

/** Tunisia → Arab → international/general/disaster → technology. */
export function newsTopicRank(item: NewsSuggestion): number {
  if (item.source_topic === "technology" || item.category === "تكنولوجيا") return 3;
  if (item.source_topic === "tunisia" || item.geo === "tunisia") return 0;
  if (item.source_topic === "arab" || item.geo === "arab") return 1;
  return 2;
}

export function sortNewsSuggestions<T extends NewsSuggestion>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const topicDifference = newsTopicRank(a) - newsTopicRank(b);
    if (topicDifference !== 0) return topicDifference;

    const priorityDifference = (b.priority_score ?? 0) - (a.priority_score ?? 0);
    if (priorityDifference !== 0) return priorityDifference;

    const sourceDifference = (SOURCE_PRIORITY[a.source ?? ""] ?? 99)
      - (SOURCE_PRIORITY[b.source ?? ""] ?? 99);
    if (sourceDifference !== 0) return sourceDifference;

    return new Date(b.published_at ?? 0).getTime()
      - new Date(a.published_at ?? 0).getTime();
  });
}
