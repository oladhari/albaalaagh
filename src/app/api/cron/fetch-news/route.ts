import { NextRequest, NextResponse } from "next/server";
import Parser from "rss-parser";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";
import { NEWS_SOURCES } from "@/types";

const parser = new Parser({
  customFields: { item: ["media:content", "media:thumbnail", "enclosure"] },
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
// ONE Haiku call per cron run, all new articles in a single batch.
// ~$0.003 per call, ~$0.36/month at 4 runs/day.

interface Classification {
  geo: "tunisia" | "arab" | "international" | "general";
  category: string;
}

async function classifyBatch(
  articles: { title: string; source: string }[]
): Promise<Classification[]> {
  if (articles.length === 0) return [];

  const numbered = articles
    .map((a, i) => `${i}. "${a.title}" [${a.source}]`)
    .join("\n");

  const prompt = `أنت مصنِّف أخبار عربية. صنِّف كل خبر أدناه:

geo:
- "tunisia"       → الخبر يخصّ تونس بشكل رئيسي
- "arab"          → يخصّ الوطن العربي (غير تونس)
- "international" → عالمي/دولي لا علاقة مباشرة بالعالم العربي
- "general"       → لا يمكن التصنيف

category (اختر واحدة):
سياسة | اقتصاد | قضاء | مجتمع | أمن | دولي | ثقافة | رياضة

أجب بـ JSON فقط، مصفوفة بنفس ترتيب المدخلات:
[{"geo":"...","category":"..."},...]

الأخبار:
${numbered}`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "[]";
    const match = text.match(/\[[\s\S]*?\]/);
    if (!match) throw new Error("No JSON array found");

    const parsed: Classification[] = JSON.parse(match[0]);
    // Ensure same length as input — pad with fallbacks if needed
    while (parsed.length < articles.length) {
      parsed.push({ geo: "general", category: "سياسة" });
    }
    return parsed;
  } catch (err) {
    console.error("[classify-batch] Haiku error:", err);
    // Fallback: rule-based
    return articles.map(({ title, source }) => ({
      geo: detectGeoFallback(title, source),
      category: detectCategoryFallback(title),
    }));
  }
}

// Fallbacks used when Haiku call fails
function detectGeoFallback(title: string, source: string): Classification["geo"] {
  const TUNISIA_SOURCES = ["تيوميديا", "موزاييك FM", "نواة"];
  if (TUNISIA_SOURCES.includes(source)) return "tunisia";
  const t = title;
  if (/تونس|تونسي|قيس سعيد/.test(t)) return "tunisia";
  if (/فلسطين|غزة|إسرائيل|أمريكا|أوروبا|روسيا|الصين/.test(t)) return "international";
  return "arab";
}

function detectCategoryFallback(title: string): string {
  if (/قضاء|محكمة|اعتقال|سجن/.test(title)) return "قضاء";
  if (/اقتصاد|مالية|بنك|ميزانية/.test(title)) return "اقتصاد";
  if (/أمن|عسكر|جيش|إرهاب/.test(title)) return "أمن";
  if (/رياضة|كرة|بطولة/.test(title)) return "رياضة";
  if (/فلسطين|غزة|دولي/.test(title)) return "دولي";
  return "سياسة";
}

// ── Main cron handler ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = { fetched: 0, inserted: 0, skipped: 0, aiCalled: false, errors: [] as string[] };

  // Step 1: collect all new articles from RSS
  const toInsert: {
    title: string; excerpt: string; url: string;
    source: string; image_url?: string; published_at: string;
  }[] = [];

  for (const source of NEWS_SOURCES) {
    try {
      const feed = await parser.parseURL(source.rss);
      results.fetched += feed.items.length;

      for (const item of feed.items.slice(0, 15)) {
        const title = item.title?.trim() || "";
        const url = item.link?.trim() || "";
        if (!url || !title) { results.skipped++; continue; }

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
          published_at: item.isoDate || new Date().toISOString(),
        });
      }
    } catch (e: any) {
      results.errors.push(`${source.name}: ${e.message}`);
    }
  }

  if (toInsert.length === 0) {
    return NextResponse.json({ ...results, message: "No new articles" });
  }

  // Step 2: ONE batch Haiku call to classify all new articles
  results.aiCalled = true;
  const classifications = await classifyBatch(
    toInsert.map((a) => ({ title: a.title, source: a.source }))
  );

  // Step 3: insert with AI classifications
  for (let i = 0; i < toInsert.length; i++) {
    const article = toInsert[i];
    const { geo, category } = classifications[i] ?? { geo: "general", category: "سياسة" };

    const { error } = await supabaseAdmin.from("news").insert({
      ...article,
      status: "pending",
      geo,
      category,
    });

    if (error) results.errors.push(`insert: ${error.message}`);
    else results.inserted++;
  }

  return NextResponse.json(results);
}
