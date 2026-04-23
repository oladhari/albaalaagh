import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function extractMeta(html: string, property: string): string {
  const m =
    html.match(new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i")) ??
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, "i"));
  return m ? m[1].trim() : "";
}

function extractText(html: string): string {
  // Strip scripts, styles, nav, header, footer, aside
  const clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<(nav|header|footer|aside|figure|figcaption)[^>]*>[\s\S]*?<\/\1>/gi, "");

  // Extract <p> tag content
  const paragraphs: string[] = [];
  const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match;
  while ((match = pRe.exec(clean)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, "").trim();
    if (text.length > 60) paragraphs.push(text);
  }
  return paragraphs.slice(0, 20).join("\n\n");
}

export async function POST(req: NextRequest) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const { url } = await req.json();
  if (!url || !url.startsWith("http")) {
    return NextResponse.json({ error: "رابط غير صالح" }, { status: 400 });
  }

  // 1. Fetch the page
  let html = "";
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AlBaalaagh/1.0)" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return NextResponse.json({ error: "تعذّر جلب الصفحة" }, { status: 400 });
    html = await res.text();
  } catch {
    return NextResponse.json({ error: "تعذّر الوصول إلى الرابط" }, { status: 400 });
  }

  // 2. Extract metadata
  const ogTitle   = extractMeta(html, "og:title")   || extractMeta(html, "twitter:title");
  const ogDesc    = extractMeta(html, "og:description") || extractMeta(html, "twitter:description");
  const ogImage   = extractMeta(html, "og:image")   || extractMeta(html, "twitter:image");
  const bodyText  = extractText(html);

  if (!ogTitle && !bodyText) {
    return NextResponse.json({ error: "لم نتمكن من استخراج محتوى الصفحة" }, { status: 400 });
  }

  const sourceTitle = ogTitle || "خبر من رابط خارجي";
  const sourceDesc  = ogDesc  || "";

  // 3. Generate article with Claude
  const prompt = `أنت محرر أول في قناة "البلاغ" التونسية، وهي منبر صحفي مستقل يتبنّى صحافة المساءلة. مهمتك إعادة صياغة الخبر التالي بأسلوب صحفي رصين يحاسب أصحاب القرار ولا يكتفي بنقل الرواية الرسمية.

المبادئ التحريرية التي يجب أن تعكسها في كتابتك:
- لا تُروّج للإنجازات الحكومية أو تصفها بـ"التاريخية" أو "الرائدة" ما لم يكن ذلك مؤكداً بأدلة ملموسة
- استخدم صيغة "تدّعي" أو "تؤكد السلطات" أو "وفق البيان الرسمي" عند نقل تصريحات المسؤولين
- إن غابت التفاصيل أو الأرقام عن المصدر الأصلي، أشر إلى ذلك صراحةً في التقرير
- العنوان يصف الحدث ويطرح السؤال الجوهري، لا يمدح القرار
- تجنّب اللغة الترويجية: لا "إنجاز"، لا "خطوة نوعية"، لا "ريادة" إلا إن كانت موثّقة

العنوان الأصلي: ${sourceTitle}
الوصف: ${sourceDesc}
محتوى المقال:
${bodyText.slice(0, 3000)}

اكتب تقريراً يشمل:
1. عنوان يصف الحدث بدقة ويُلمح للسؤال الذي يطرحه، دون مديح
2. مقدمة وجيزة (جملتان إلى ثلاث) تلخص الحدث وتضع القارئ في السياق
3. تقرير كامل (3 إلى 4 فقرات) يعرض الوقائع ويُبرز ما هو غائب أو غير مؤكد

أجب بهذا التنسيق فقط بدون أي نص خارجه:
<title>العنوان هنا</title>
<excerpt>المقدمة هنا</excerpt>
<content><p>فقرة أولى</p><p>فقرة ثانية</p></content>`;

  let generated = { title: sourceTitle, excerpt: sourceDesc, content: "" };

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

    const t = extract("title");
    const e = extract("excerpt");
    const c = extract("content");
    if (t && c) generated = { title: t, excerpt: e, content: c };
  } catch (err) {
    console.error("[from-url] Claude error:", err);
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
    image_url: ogImage || null,
    geo:       "general",
    category:  "عام",
  });
}
