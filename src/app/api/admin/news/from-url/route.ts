import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { generateUrlDraft, type NewsDraft } from "@/lib/ai/workflows";
import { AiProviderError, toAdminAiResponse } from "@/lib/ai/provider";
import { fetchNewsSource, NewsSourceError } from "@/lib/news-source";

export const maxDuration = 90;

export async function POST(req: NextRequest) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const { url } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "رابط غير صالح" }, { status: 400 });
  }
  let article: Awaited<ReturnType<typeof fetchNewsSource>>;
  try {
    article = await fetchNewsSource(url);
  } catch (error) {
    return NextResponse.json({ error: error instanceof NewsSourceError ? error.message : "تعذّر جلب المصدر" }, { status: 422 });
  }
  const parsedUrl = new URL(url);
  const sourceTitle = article.title || "خبر من رابط خارجي";
  const sourceDesc = article.description;
  const ogImage = article.image;

  // 3. Generate and validate the complete draft before any database mutation.
  let generated: NewsDraft;
  try {
    generated = await generateUrlDraft({
      original_title: sourceTitle,
      source_name: parsedUrl.hostname.replace("www.", ""),
      source_url: url,
      description: sourceDesc,
      article_text: article.articleText,
    });
  } catch (err: unknown) {
    if (err instanceof AiProviderError) {
      const response = toAdminAiResponse(err);
      return NextResponse.json({ error: response.error, category: response.category }, { status: response.status });
    }
    console.error(JSON.stringify({ event: "url_news_generation_failed", route: "/api/admin/news/from-url" }));
    return NextResponse.json({ error: "تعذّر إنشاء مسودة صالحة من الرابط." }, { status: 500 });
  }

  // 4. Insert placeholder news row so the publish flow can use its ID
  const { data: row, error: insertErr } = await supabaseAdmin
    .from("news")
    .insert({
      title:       sourceTitle,
      excerpt:     sourceDesc,
      content:     null,
      image_url:   ogImage || null,
      source:      new URL(url).hostname.replace("www.", ""),
      url,
      status:      "pending",
      geo:         "general",
      category:    "عام",
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertErr || !row) {
    console.error("[from-url] DB insert error:", insertErr);
    if (insertErr?.code === "23505") {
      const { data: existing } = await supabaseAdmin
        .from("news")
        .select("id, status")
        .eq("url", url)
        .maybeSingle();
      return NextResponse.json(
        { error: "هذا الخبر موجود مسبقاً في قاعدة البيانات", existingId: existing?.id ?? null },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "خطأ في قاعدة البيانات" }, { status: 500 });
  }

  return NextResponse.json({
    newsId:    row.id,
    title:     generated.title,
    excerpt:   generated.excerpt,
    content:   generated.content,
    needs_internal_review: generated.needs_internal_review,
    image_url: ogImage || null,
    geo:       "general",
    category:  "عام",
    citations: [{
      name: parsedUrl.hostname.replace("www.", ""),
      url,
      kind: "media",
      is_primary: true,
      published_at: null,
    }],
  });
}
