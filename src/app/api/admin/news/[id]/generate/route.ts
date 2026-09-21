import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { generateNewsDraft, type Tone } from "@/lib/ai/workflows";
import { AiProviderError, toAdminAiResponse } from "@/lib/ai/provider";

export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const tone: Tone = ["accountability", "neutral", "positive"].includes(body.tone)
    ? body.tone
    : "accountability";

  const { data: news, error } = await supabaseAdmin
    .from("news")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !news) {
    return NextResponse.json({ error: "الخبر غير موجود" }, { status: 404 });
  }

  try {
    const generated = await generateNewsDraft({
      title: news.title,
      excerpt: news.excerpt ?? "",
      source: news.source,
      url: news.url,
      source_language: news.source_language ?? "ar",
      source_kind: news.source_kind ?? "media",
      category: news.category ?? "",
    }, tone);

    // Generation only returns an editable preview. Publication remains a separate,
    // authenticated action in /api/admin/news/[id]/publish.
    return NextResponse.json({
      title: generated.title,
      excerpt: generated.excerpt,
      content: generated.content,
      needs_internal_review: generated.needs_internal_review,
      image_url: news.image_url ?? null,
      geo: news.geo,
      category: news.category,
      citations: [{
        name: news.source,
        url: news.url,
        kind: news.source_kind === "official" ? "official" : news.source_kind === "agency" ? "agency" : "media",
        is_primary: true,
        published_at: news.published_at,
      }],
    });
  } catch (err: unknown) {
    if (err instanceof AiProviderError) {
      const response = toAdminAiResponse(err);
      return NextResponse.json({ error: response.error, category: response.category }, { status: response.status });
    }
    console.error(JSON.stringify({ event: "news_generation_failed", route: "/api/admin/news/[id]/generate" }));
    return NextResponse.json({ error: "تعذّر إنشاء مسودة الخبر." }, { status: 500 });
  }
}
