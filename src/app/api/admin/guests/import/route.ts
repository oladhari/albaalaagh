import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { fetchAllVideosWithDescriptions } from "@/lib/youtube";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ExtractedGuest {
  name: string;
  title: string;
  category: string;
}

function normalizeArabicName(name: string): string {
  return name
    .replace(/^(الدكتور|الأستاذ|الشيخ|السيد|المحامي|الأستاذة|الدكتورة|السيدة)\s+/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function extractGuestsFromBatch(
  videos: { youtube_id: string; title: string; description: string }[]
): Promise<ExtractedGuest[]> {
  const numbered = videos
    .map((v, i) => `${i}. العنوان: "${v.title}"\nالوصف: "${v.description.slice(0, 400)}"`)
    .join("\n\n");

  const prompt = `أنت مساعد متخصص في استخراج بيانات الضيوف من قناة سياسية تونسية تدعى "البلاغ".

لكل فيديو أدناه، استخرج أسماء الضيوف المذكورين (المدعوّين في الحوار، ليس مقدم البرنامج).
لكل ضيف أعطِ:
- name: الاسم الكامل بدون ألقاب فخرية (بدون "الدكتور"، "الأستاذ"، "الشيخ" إلخ)
- title: صفته أو منصبه (مثال: "محامٍ وناشط حقوقي"، "وزير سابق"، "نائب برلماني"، "رئيس حركة النهضة")
- category: واحدة من: وزير | برلماني | ناشط | مفكر | صحفي | أكاديمي | آخر

إذا لم يكن الفيديو مقابلة أو لا يوجد ضيف واضح، أعد مصفوفة فارغة للفيديو.
إذا كان هناك أكثر من ضيف، أدرج جميعهم.

أجب بـ JSON فقط — مصفوفة بنفس طول المدخلات، كل عنصر مصفوفة من الضيوف:
[[{"name":"...","title":"...","category":"..."}], [], ...]

الفيديوهات:
${numbered}`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "[]";
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];

    const parsed: ExtractedGuest[][] = JSON.parse(match[0]);
    return parsed.flat().filter((g) => g.name && g.name.length > 2);
  } catch (err) {
    console.error("[guests/import] Haiku error:", err);
    return [];
  }
}

export async function POST(req: NextRequest) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const results = { fetched: 0, extracted: 0, inserted: 0, skipped: 0, errors: [] as string[] };

  try {
    // 1. Fetch all videos with full descriptions
    const videos = await fetchAllVideosWithDescriptions();
    results.fetched = videos.length;

    if (videos.length === 0) {
      return NextResponse.json({ ...results, message: "No videos found" });
    }

    // 2. Load existing guest names for deduplication
    const { data: existingGuests } = await supabaseAdmin
      .from("guests")
      .select("name");
    const existingNames = new Set(
      (existingGuests ?? []).map((g: any) => normalizeArabicName(g.name))
    );

    // 3. Process in batches of 20 videos per Haiku call
    const BATCH = 20;
    const allExtracted: ExtractedGuest[] = [];

    for (let i = 0; i < videos.length; i += BATCH) {
      const batch = videos.slice(i, i + BATCH);
      const guests = await extractGuestsFromBatch(batch);
      allExtracted.push(...guests);
    }

    results.extracted = allExtracted.length;

    // 4. Deduplicate within extracted list + against DB
    const seen = new Set<string>();
    const toInsert: ExtractedGuest[] = [];

    for (const guest of allExtracted) {
      const normalized = normalizeArabicName(guest.name);
      if (seen.has(normalized) || existingNames.has(normalized)) {
        results.skipped++;
        continue;
      }
      seen.add(normalized);
      toInsert.push({ ...guest, name: normalized });
    }

    // 5. Insert new guests
    for (const guest of toInsert) {
      const { error } = await supabaseAdmin.from("guests").insert({
        name: guest.name,
        title: guest.title,
        category: guest.category,
      });
      if (error) results.errors.push(`${guest.name}: ${error.message}`);
      else results.inserted++;
    }

    return NextResponse.json(results);
  } catch (err: any) {
    return NextResponse.json({ ...results, error: err.message }, { status: 500 });
  }
}
