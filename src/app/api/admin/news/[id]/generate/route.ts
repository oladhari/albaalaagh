import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Only generates — does NOT save or post anything.
// The client previews, edits, then calls /publish.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const { id } = await params;

  const { data: news, error } = await supabaseAdmin
    .from("news")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !news) {
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

أجب بهذا التنسيق فقط بدون أي نص خارجه:
<title>العنوان هنا</title>
<excerpt>المقدمة هنا</excerpt>
<content><p>فقرة أولى</p><p>فقرة ثانية</p></content>`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";

    const extract = (tag: string) => {
      const m = text.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
      return m ? m[1].trim() : "";
    };

    const generated = {
      title:   extract("title"),
      excerpt: extract("excerpt"),
      content: extract("content"),
    };

    if (!generated.title || !generated.content) throw new Error("Missing fields in response");

    return NextResponse.json({
      title:     generated.title,
      excerpt:   generated.excerpt,
      content:   generated.content,
      image_url: news.image_url ?? null,
      geo:       news.geo,
      category:  news.category,
    });
  } catch (err: any) {
    console.error("[news/generate]", err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
