import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Fix articles wrongly tagged as "tunisia" when they're about Palestine/Arab world
export async function POST() {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  // Fetch articles tagged as "tunisia" that likely aren't Tunisian by content
  const { data: articles, error } = await supabaseAdmin
    .from("news")
    .select("id, title, source, geo")
    .eq("geo", "tunisia")
    .order("published_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!articles?.length) return NextResponse.json({ fixed: 0, message: "No articles to check" });

  // Keywords that strongly indicate non-Tunisian content
  const NON_TUNISIA = /فلسطين|غزة|إسرائيل|ترامب|أوروبا|روسيا|الصين|لبنان|سوريا|إيران|مصر|ليبيا|السعودية|الأردن|العراق|اليمن|المغرب|الجزائر|نتنياهو|بايدن|بوتين|واشنطن|باريس|لندن|بروكسل/;
  const TUNISIA_KW  = /تونس|تونسي|قيس سعيد|الحكومة التونسية|البرلمان التونسي|صفاقس|سوسة|القيروان|بنزرت|نابل/;

  const candidates = articles.filter((a) => {
    const isNonTunisia = NON_TUNISIA.test(a.title);
    const isTunisia    = TUNISIA_KW.test(a.title);
    return isNonTunisia && !isTunisia;
  });

  if (candidates.length === 0) {
    return NextResponse.json({ fixed: 0, message: "All Tunisia articles look correct" });
  }

  // Batch reclassify with Haiku
  const numbered = candidates.map((a, i) => `${i}. "${a.title}" [${a.source}]`).join("\n");

  const prompt = `صنِّف جغرافياً كل خبر (موضوعه وليس مصدره):
- "arab"          → يخصّ دولة عربية (فلسطين، مصر، لبنان، ليبيا، السعودية...)
- "international" → دولي غير عربي (أمريكا، أوروبا، روسيا...)
- "tunisia"       → يخصّ تونس فعلاً

أجب بـ JSON فقط: [{"geo":"..."},...]
الأخبار:
${numbered}`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text  = msg.content[0].type === "text" ? msg.content[0].text : "[]";
    const start = text.indexOf("[");
    const end   = text.lastIndexOf("]");
    if (start === -1 || end === -1) throw new Error("No JSON");

    const results: { geo: string }[] = JSON.parse(text.slice(start, end + 1));

    let fixed = 0;
    for (let i = 0; i < candidates.length; i++) {
      const newGeo = results[i]?.geo;
      if (!newGeo || newGeo === "tunisia") continue;
      const { error: updateErr } = await supabaseAdmin
        .from("news")
        .update({ geo: newGeo })
        .eq("id", candidates[i].id);
      if (!updateErr) fixed++;
    }

    return NextResponse.json({ checked: candidates.length, fixed });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
