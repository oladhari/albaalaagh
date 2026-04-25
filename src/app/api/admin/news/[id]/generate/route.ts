import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type Tone = "accountability" | "neutral" | "positive";

function buildPrompt(news: any, tone: Tone): string {
  const source = `العنوان: ${news.title}
الملخص: ${news.excerpt ?? ""}
المصدر: ${news.source}
التصنيف: ${news.category ?? ""}`;

  const format = `أجب بهذا التنسيق فقط بدون أي نص خارجه:
<title>العنوان هنا</title>
<excerpt>المقدمة هنا</excerpt>
<content><p>فقرة أولى</p><p>فقرة ثانية</p></content>`;

  if (tone === "accountability") {
    return `أنت محرر أول في قناة "البلاغ" التونسية، وهي منبر صحفي مستقل يتبنّى صحافة المساءلة. مهمتك إعادة صياغة الخبر التالي بأسلوب صحفي رصين يحاسب أصحاب القرار ولا يكتفي بنقل الرواية الرسمية.

المبادئ التحريرية:
- لا تُروّج للإنجازات الحكومية أو تصفها بـ"التاريخية" أو "الرائدة" ما لم يكن ذلك مؤكداً بأدلة ملموسة
- استخدم صيغة "تدّعي" أو "تؤكد السلطات" أو "وفق البيان الرسمي" عند نقل تصريحات المسؤولين
- إن غابت التفاصيل أو الأرقام، أشر إلى ذلك صراحةً
- العنوان يصف الحدث ويطرح السؤال الجوهري، لا يمدح القرار
- تجنّب اللغة الترويجية: لا "إنجاز"، لا "خطوة نوعية"، لا "ريادة" إلا إن كانت موثّقة

${source}

اكتب تقريراً يشمل:
1. عنوان يصف الحدث بدقة ويُلمح للسؤال الذي يطرحه، دون مديح
2. مقدمة وجيزة (جملتان إلى ثلاث) تلخص الحدث وتضع القارئ في السياق
3. تقرير كامل (3 إلى 4 فقرات) يعرض الوقائع ويُبرز ما هو غائب أو غير مؤكد

${format}`;
  }

  if (tone === "neutral") {
    return `أنت محرر أول في قناة "البلاغ" التونسية. مهمتك صياغة تقرير صحفي محايد وموضوعي بالعربية الفصحى بناءً على الخبر التالي.

المبادئ التحريرية:
- انقل الوقائع كما هي دون تعليق أو موقف
- استخدم لغة وصفية محايدة: لا انتقاد ولا مدح
- اذكر الأطراف المعنية وتصريحاتها بصيغة محايدة ("أعلن"، "أكد"، "أشار")
- ضع الحدث في سياقه الموضوعي إن أمكن

${source}

اكتب تقريراً يشمل:
1. عنوان وصفي دقيق يعكس الحدث بحياد
2. مقدمة وجيزة (جملتان إلى ثلاث) تلخص الحدث
3. تقرير كامل (3 إلى 4 فقرات) يعرض الوقائع والأطراف بأسلوب موضوعي

${format}`;
  }

  // positive
  return `أنت محرر أول في قناة "البلاغ" التونسية. مهمتك صياغة تقرير صحفي يُبرز الجانب الإيجابي والبنّاء للخبر التالي بالعربية الفصحى.

المبادئ التحريرية:
- أبرز الأثر الإيجابي للحدث على المواطنين أو البلد
- استخدم لغة بنّاءة تُرحّب بالخطوة دون مبالغة أو تملّق
- يمكن الإشارة إلى التحديات المتبقية في سياق إيجابي ("خطوة في الاتجاه الصحيح"، "بداية مشجّعة")
- تجنّب التشكيك أو الانتقاد ما لم يكن ضرورياً لفهم الحدث

${source}

اكتب تقريراً يشمل:
1. عنوان يُبرز الجانب الإيجابي للحدث بصدق
2. مقدمة وجيزة (جملتان إلى ثلاث) تُرحّب بالخبر وتضعه في سياقه
3. تقرير كامل (3 إلى 4 فقرات) يعرض الحدث ويُبرز انعكاساته الإيجابية

${format}`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      messages: [{ role: "user", content: buildPrompt(news, tone) }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const extract = (tag: string) => {
      const m = text.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
      return m ? m[1].trim() : "";
    };

    const generated = { title: extract("title"), excerpt: extract("excerpt"), content: extract("content") };
    if (!generated.title || !generated.content) throw new Error("Missing fields in response");

    return NextResponse.json({
      ...generated,
      image_url: news.image_url ?? null,
      geo:       news.geo,
      category:  news.category,
    });
  } catch (err: any) {
    console.error("[news/generate]", err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
