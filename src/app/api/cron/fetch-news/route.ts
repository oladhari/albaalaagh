import { NextRequest, NextResponse } from "next/server";
import Parser from "rss-parser";
import { supabaseAdmin } from "@/lib/supabase";
import { NEWS_SOURCES } from "@/types";

const parser = new Parser({
  customFields: {
    item: ["media:content", "media:thumbnail", "enclosure"],
  },
});

// Keywords to filter articles (keeps only relevant political/news content)
const RELEVANT_KEYWORDS = [
  "تونس", "تونسي", "سياسة", "سياسي", "برلمان", "حكومة", "رئيس",
  "معارضة", "انتخاب", "قانون", "وزير", "نهضة", "اقتصاد", "حقوق",
  "حرية", "اعتقال", "احتجاج", "قضاء", "دستور", "إصلاح",
  "إيران", "عالم عربي", "الشرق الأوسط",
];

function isRelevant(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  return RELEVANT_KEYWORDS.some((kw) => text.includes(kw));
}

function extractImage(item: any): string | undefined {
  return (
    item["media:content"]?.$.url ||
    item["media:thumbnail"]?.$.url ||
    item.enclosure?.url ||
    undefined
  );
}

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = { fetched: 0, inserted: 0, skipped: 0, errors: [] as string[] };

  for (const source of NEWS_SOURCES) {
    try {
      const feed = await parser.parseURL(source.rss);
      results.fetched += feed.items.length;

      for (const item of feed.items.slice(0, 20)) {
        const title = item.title || "";
        const description = item.contentSnippet || item.content || "";

        if (!isRelevant(title, description)) {
          results.skipped++;
          continue;
        }

        const url = item.link || "";
        if (!url) { results.skipped++; continue; }

        // Check for duplicates by URL
        const { data: existing } = await supabaseAdmin
          .from("news")
          .select("id")
          .eq("url", url)
          .single();

        if (existing) { results.skipped++; continue; }

        const { error } = await supabaseAdmin.from("news").insert({
          title,
          excerpt: description.slice(0, 300),
          url,
          source: source.name,
          image_url: extractImage(item),
          published_at: item.isoDate || new Date().toISOString(),
          status: "pending",
        });

        if (error) {
          results.errors.push(`${source.name}: ${error.message}`);
        } else {
          results.inserted++;
        }
      }
    } catch (e: any) {
      results.errors.push(`${source.name}: ${e.message}`);
    }
  }

  return NextResponse.json(results);
}
