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

  const prompt = `أنت محرر أول في قناة "البلاغ" التونسية، وهي منبر صحفي مستقل يتبنّى صحافة المساءلة. مهمتك إعادة صياغة الخبر التالي بأسلوب صحفي رصين يحاسب أصحاب القرار ولا يكتفي بنقل الرواية الرسمية.

المبادئ التحريرية التي يجب أن تعكسها في كتابتك:
- لا تُروّج للإنجازات الحكومية أو تصفها بـ"التاريخية" أو "الرائدة" ما لم يكن ذلك مؤكداً بأدلة ملموسة
- استخدم صيغة "تدّعي" أو "تؤكد السلطات" أو "وفق البيان الرسمي" عند نقل تصريحات المسؤولين
- إن غابت التفاصيل أو الأرقام عن المصدر الأصلي، أشر إلى ذلك صراحةً في التقرير
- العنوان يصف الحدث ويطرح السؤال الجوهري، لا يمدح القرار
- تجنّب اللغة الترويجية: لا "إنجاز"، لا "خطوة نوعية"، لا "ريادة" إلا إن كانت موثّقة

العنوان: ${news.title}
الملخص: ${news.excerpt ?? ""}
المصدر: ${news.source}
التصنيف: ${news.category ?? ""}

اكتب تقريراً يشمل:
1. عنوان يصف الحدث بدقة ويُلمح للسؤال الذي يطرحه، دون مديح
2. مقدمة وجيزة (جملتان إلى ثلاث) تلخص الحدث وتضع القارئ في السياق
3. تقرير كامل (3 إلى 4 فقرات) يعرض الوقائع ويُبرز ما هو غائب أو غير مؤكد

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
