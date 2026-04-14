import { NextRequest, NextResponse } from "next/server";
import Parser from "rss-parser";
import { supabaseAdmin } from "@/lib/supabase";
import { NEWS_SOURCES } from "@/types";

const parser = new Parser({
  customFields: { item: ["media:content", "media:thumbnail", "enclosure"] },
});

const TUNISIA_ONLY_SOURCES = ["تيوميديا", "موزاييك FM", "نواة"];

const TUNISIA_KEYWORDS = [
  "تونس", "تونسي", "تونسية", "قيس سعيد", "البرلمان التونسي",
];

const GENERAL_KEYWORDS = [
  ...TUNISIA_KEYWORDS,
  "سياسة", "برلمان", "حكومة", "وزير", "معارضة",
  "انتخاب", "قانون", "اقتصاد", "حقوق", "حرية",
  "اعتقال", "قضاء", "دستور", "الشرق الأوسط",
];

function isRelevant(title: string, desc: string, sourceName: string): boolean {
  if (TUNISIA_ONLY_SOURCES.includes(sourceName)) return true;
  const text = `${title} ${desc}`;
  if (sourceName.includes("الجزيرة")) {
    return TUNISIA_KEYWORDS.some((kw) => text.includes(kw));
  }
  return GENERAL_KEYWORDS.some((kw) => text.includes(kw));
}

function extractImage(item: any): string | undefined {
  const url =
    item["media:content"]?.$.url ||
    item["media:thumbnail"]?.$.url ||
    item.enclosure?.url;
  if (!url) return undefined;
  // Filter out tiny logos/icons (usually < 5KB URLs with "logo" or "icon")
  const lower = url.toLowerCase();
  if (lower.includes("logo") || lower.includes("icon") || lower.includes("avatar")) return undefined;
  return url;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function detectCategory(text: string): string {
  if (/قضاء|محكمة|اعتقال|سجن|حكم/.test(text)) return "قضاء";
  if (/اقتصاد|مالية|بنك|ميزانية|تضخم|بطالة/.test(text)) return "اقتصاد";
  if (/حقوق|ناشط|منظمة|مدني/.test(text)) return "حقوق";
  if (/برلمان|قانون|تشريع/.test(text)) return "برلمان";
  if (/انتخاب|تصويت/.test(text)) return "انتخابات";
  if (/فلسطين|غزة|إيران|عراق|سوريا|دولي/.test(text)) return "دولي";
  return "سياسة";
}

/**
 * Scrapes RSS feeds and saves raw articles as "pending".
 * Rewriting with Claude is done separately via /api/admin/news/rewrite
 * to keep costs controlled — only rewrite what you actually approve.
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = { fetched: 0, inserted: 0, skipped: 0, errors: [] as string[] };

  for (const source of NEWS_SOURCES) {
    try {
      const feed = await parser.parseURL(source.rss);
      results.fetched += feed.items.length;

      for (const item of feed.items.slice(0, 15)) {
        const title = item.title?.trim() || "";
        const rawDesc = stripHtml(
          item.contentSnippet || item.content || (item as any).description || ""
        );
        const url = item.link?.trim() || "";

        if (!url || !title) { results.skipped++; continue; }
        if (!isRelevant(title, rawDesc, source.name)) { results.skipped++; continue; }

        // Skip duplicates
        const { data: existing } = await supabaseAdmin
          .from("news")
          .select("id")
          .eq("url", url)
          .single();
        if (existing) { results.skipped++; continue; }

        const { error } = await supabaseAdmin.from("news").insert({
          title,                              // raw title — rewrite happens on approval
          excerpt: rawDesc.slice(0, 300),     // raw excerpt
          url,
          source: source.name,
          image_url: extractImage(item),
          published_at: item.isoDate || new Date().toISOString(),
          status: "pending",
          category: detectCategory(title + " " + rawDesc),
        });

        if (error) results.errors.push(`${source.name}: ${error.message}`);
        else results.inserted++;
      }
    } catch (e: any) {
      if (e.message) results.errors.push(`${source.name}: ${e.message}`);
    }
  }

  return NextResponse.json(results);
}
