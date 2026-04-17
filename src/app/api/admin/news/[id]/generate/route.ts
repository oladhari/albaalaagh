import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "media";

async function copyImageToBucket(sourceUrl: string): Promise<string | null> {
  try {
    const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) return null;
    const ext = contentType.split("/")[1]?.split(";")[0] ?? "jpg";
    const buffer = Buffer.from(await res.arrayBuffer());
    const filename = `news/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filename, buffer, { contentType, upsert: false });
    if (error) return null;
    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(data.path);
    return urlData.publicUrl;
  } catch {
    return null;
  }
}

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

أجب بـ JSON فقط بدون أي نص خارجه:
{"title":"...","excerpt":"...","content":"<p>...</p><p>...</p>"}`;

  try {
    // Run AI generation and image copy in parallel
    const [msg, ownedImageUrl] = await Promise.all([
      anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }],
      }),
      news.image_url ? copyImageToBucket(news.image_url) : Promise.resolve(null),
    ]);

    const text  = msg.content[0].type === "text" ? msg.content[0].text : "";
    const start = text.indexOf("{");
    const end   = text.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("No JSON in response");

    const generated = JSON.parse(text.slice(start, end + 1)) as {
      title: string;
      excerpt: string;
      content: string;
    };

    return NextResponse.json({
      title:     generated.title,
      excerpt:   generated.excerpt,
      content:   generated.content,
      image_url: ownedImageUrl ?? news.image_url ?? null,
      geo:       news.geo,
      category:  news.category,
    });
  } catch (err: any) {
    console.error("[news/generate]", err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
