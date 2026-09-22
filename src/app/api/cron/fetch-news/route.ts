import { NextRequest, NextResponse } from "next/server";
import Parser from "rss-parser";
import { supabaseAdmin } from "@/lib/supabase";
import { NEWS_SOURCES } from "@/types";
import { scoreNewsPriority } from "@/lib/news-priority";
import { classifyNewsBatch, type Classification } from "@/lib/ai/workflows";
import { requireAdmin } from "@/lib/admin-auth";
import { isFreshNewsDate, newsFreshnessCutoff } from "@/lib/news-feed";

const parser = new Parser({
  customFields: { item: ["media:content", "media:thumbnail", "enclosure"] },
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractImage(item: any): string | undefined {
  const url =
    item["media:content"]?.$.url ||
    item["media:thumbnail"]?.$.url ||
    item.enclosure?.url;
  if (!url) return undefined;
  const lower = url.toLowerCase();
  if (lower.includes("logo") || lower.includes("icon") || lower.includes("avatar")) return undefined;
  return url;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// ── AI batch classification ───────────────────────────────────────────────────
// One configurable fast-model call per cron run, with all new articles in one batch.

async function classifyBatch(
  articles: { title: string; source: string }[]
): Promise<Classification[]> {
  if (articles.length === 0) return [];

  try {
    return await classifyNewsBatch(articles);
  } catch {
    console.error(JSON.stringify({ event: "ai_operation_fallback", operation: "rss_classification", route: "/api/cron/fetch-news" }));
    // Fallback: rule-based
    return articles.map(({ title, source }) => ({
      geo: detectGeoFallback(title, source),
      category: detectCategoryFallback(title),
    }));
  }
}

// Deterministic fallbacks used when the configured provider call fails.
function detectGeoFallback(title: string, source: string): Classification["geo"] {
  const t = title;
  // Content takes priority over source
  if (/فلسطين|غزة|إسرائيل|نتنياهو|لبنان|سوريا|إيران|مصر|ليبيا|السعودية|الأردن|العراق|اليمن|المغرب|الجزائر/.test(t)) return "arab";
  if (/أمريكا|أوروبا|روسيا|الصين|ترامب|بايدن|بوتين|واشنطن|باريس|لندن|بروكسل/.test(t)) return "international";
  if (/تونس|تونسي|قيس سعيد|الحكومة التونسية|البرلمان التونسي/.test(t)) return "tunisia";
  // Source as tiebreaker only when title gives no signal
  const TUNISIA_SOURCES = ["تيوميديا", "موزاييك FM", "نواة"];
  if (TUNISIA_SOURCES.includes(source)) return "tunisia";
  return "arab";
}

function detectCategoryFallback(title: string): string {
  if (/technology|artificial intelligence|cyber|software|startup|space|nasa|ذكاء اصطناعي|تكنولوجيا|تقنية/.test(title.toLowerCase())) return "تكنولوجيا";
  if (/earthquake|flood|wildfire|volcano|cyclone|tsunami|زلزال|فيضان|إعصار|بركان/.test(title.toLowerCase())) return "بيئة";
  if (/قضاء|محكمة|اعتقال|سجن/.test(title)) return "قضاء";
  if (/اقتصاد|مالية|بنك|ميزانية/.test(title)) return "اقتصاد";
  if (/أمن|عسكر|جيش|إرهاب/.test(title)) return "أمن";
  if (/رياضة|كرة|بطولة/.test(title)) return "رياضة";
  if (/فلسطين|غزة/.test(title)) return "سياسة";
  return "سياسة";
}

// ── Main cron handler ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const headerSecret = req.headers.get("x-cron-secret");
  const authHeader   = req.headers.get("authorization");
  const isDev = process.env.NODE_ENV === "development";

  const validManual  = Boolean(cronSecret) && headerSecret === cronSecret;
  const validVercel  = Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;

  if (!isDev && !validManual && !validVercel) {
    const unauthed = await requireAdmin();
    if (unauthed) return unauthed;
  }

  const results = {
    fetched: 0,
    inserted: 0,
    skipped: 0,
    stale: 0,
    aiCalled: false,
    dismissed: 0,
    errors: [] as string[],
  };

  // Keep the URL as a tombstone: deleting it would let the RSS feed suggest it again.
  const cutoff = newsFreshnessCutoff();
  const { count: dismissedCount, error: dismissError } = await supabaseAdmin
    .from("news")
    .update({ status: "rejected" }, { count: "exact" })
    .eq("status", "pending")
    .lt("published_at", cutoff);
  results.dismissed = dismissedCount ?? 0;
  if (dismissError) results.errors.push(`dismiss: ${dismissError.message}`);

  // Step 1: collect all new articles from RSS
  const toInsert: {
    title: string; excerpt: string; url: string;
    source: string; image_url?: string; published_at: string;
    source_language: "ar" | "en";
    source_kind: "official" | "agency" | "media" | "emergency" | "science";
    source_topic: "tunisia" | "arab" | "international" | "technology" | "disaster";
  }[] = [];

  for (const source of NEWS_SOURCES) {
    try {
      const feed = await parser.parseURL(source.rss);
      results.fetched += feed.items.length;

      for (const item of feed.items.slice(0, source.maxItems)) {
        const title = item.title?.trim() || "";
        const url = item.link?.trim() || "";
        if (!url || !title) { results.skipped++; continue; }

        const publishedAt = item.isoDate || item.pubDate;
        if (!publishedAt || !isFreshNewsDate(publishedAt)) {
          results.stale++;
          continue;
        }

        // Skip duplicates
        const { data: existing } = await supabaseAdmin
          .from("news").select("id").eq("url", url).single();
        if (existing) { results.skipped++; continue; }

        const rawDesc = stripHtml(
          item.contentSnippet || item.content || (item as any).description || ""
        );

        toInsert.push({
          title,
          excerpt: rawDesc.slice(0, 300),
          url,
          source: source.name,
          image_url: extractImage(item),
          published_at: new Date(publishedAt).toISOString(),
          source_language: source.language,
          source_kind: source.kind,
          source_topic: source.topic,
        });
      }
    } catch (e: any) {
      results.errors.push(`${source.name}: ${e.message}`);
    }
  }

  if (toInsert.length === 0) {
    return NextResponse.json({ ...results, message: "No new articles" });
  }

  // Step 2: one batch AI call to classify all new articles
  results.aiCalled = true;
  const classifications = await classifyBatch(
    toInsert.map((a) => ({ title: a.title, source: a.source }))
  );

  // Step 3: insert with AI classifications + priority scoring
  for (let i = 0; i < toInsert.length; i++) {
    const article = toInsert[i];
    const inferred = classifications[i] ?? { geo: "general", category: "سياسة" };
    const geo = article.source_topic === "tunisia"
      ? "tunisia"
      : article.source_topic === "arab"
        ? "arab"
        : inferred.geo;
    const category = article.source_topic === "technology"
      ? "تكنولوجيا"
      : article.source_topic === "disaster"
        ? "بيئة"
        : inferred.category;
    const priority_score = scoreNewsPriority(article.title, article.excerpt);

    const { error } = await supabaseAdmin.from("news").insert({
      ...article,
      status: "pending",
      geo,
      category,
      priority_score,
    });

    if (error) results.errors.push(`insert: ${error.message}`);
    else results.inserted++;
  }

  return NextResponse.json(results);
}
