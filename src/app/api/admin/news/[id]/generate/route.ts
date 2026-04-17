import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { postArticleToFacebook } from "@/lib/facebook";
import slugify from "slugify";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function getOrCreateEditorialWriter(): Promise<string> {
  const { data } = await supabaseAdmin
    .from("writers")
    .select("id")
    .eq("name", "تحرير البلاغ")
    .single();

  if (data?.id) return data.id;

  const { data: created, error } = await supabaseAdmin
    .from("writers")
    .insert({ name: "تحرير البلاغ", title: "الفريق التحريري", bio: "الفريق التحريري لقناة البلاغ التونسية" })
    .select("id")
    .single();

  if (error) throw new Error(`writer creation failed: ${error.message}`);
  return created.id;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const { id } = await params;

  const { data: news, error: newsErr } = await supabaseAdmin
    .from("news")
    .select("*")
    .eq("id", id)
    .single();

  if (newsErr || !news) {
    return NextResponse.json({ error: "الخبر غير موجود" }, { status: 404 });
  }

  const prompt = `أنت محرر أول في قناة "البلاغ" التونسية. اكتب تقريراً صحفياً احترافياً بالعربية الفصحى بناءً على الخبر التالي:

العنوان: ${news.title}
الملخص: ${news.excerpt ?? ""}
المصدر: ${news.source}
التصنيف: ${news.category ?? ""}

اكتب تقريراً يشمل:
1. عنوان تحريري جذاب ومختلف عن العنوان الأصلي
2. مقدمة وجيزة (جملتان إلى ثلاث) تلخص الحدث
3. تقرير كامل بأسلوب صحفي موضوعي (3 إلى 4 فقرات)

أجب بـ JSON فقط بدون أي نص خارجه:
{"title":"...","excerpt":"...","content":"<p>...</p><p>...</p>"}`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });

    const text  = msg.content[0].type === "text" ? msg.content[0].text : "";
    const start = text.indexOf("{");
    const end   = text.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("No JSON in response");

    const generated = JSON.parse(text.slice(start, end + 1)) as {
      title: string;
      excerpt: string;
      content: string;
    };

    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.albaalaagh.com";

    const writerId = await getOrCreateEditorialWriter();
    const slug = slugify(generated.title, { locale: "ar", lower: true, strict: true }) + "-" + Date.now().toString(36);

    const { data: article, error: articleErr } = await supabaseAdmin
      .from("articles")
      .insert({
        slug,
        title: generated.title,
        excerpt: generated.excerpt,
        content: generated.content,
        // Use RSS image directly so it displays in the article.
        // Admin can replace with a Supabase image via the article editor.
        cover_image: news.image_url ?? null,
        category: news.category ?? "سياسة",
        writer_id: writerId,
        published: true,
        status: "published",
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (articleErr) throw new Error(articleErr.message);

    postArticleToFacebook({
      title: generated.title,
      excerpt: generated.excerpt,
      slug: article.slug,
    }).catch(console.error);

    return NextResponse.json({
      ok: true,
      slug: article.slug,
      title: generated.title,
      url: `${base}/articles/${article.slug}`,
    });
  } catch (err: any) {
    console.error("[news/generate]", err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
