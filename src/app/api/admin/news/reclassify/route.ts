import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { reclassifyNewsBatch } from "@/lib/ai/workflows";
import { AiProviderError, toAdminAiResponse } from "@/lib/ai/provider";

export const maxDuration = 60;

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

  try {
    const results = await reclassifyNewsBatch(candidates);

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
  } catch (err: unknown) {
    if (err instanceof AiProviderError) {
      const response = toAdminAiResponse(err);
      return NextResponse.json({ error: response.error, category: response.category }, { status: response.status });
    }
    console.error(JSON.stringify({ event: "news_reclassification_failed", route: "/api/admin/news/reclassify" }));
    return NextResponse.json({ error: "تعذّر إعادة تصنيف الأخبار." }, { status: 500 });
  }
}
