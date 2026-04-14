import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// البلاغ editorial identity — embedded in every rewrite
const ALBAALAAGH_SYSTEM_PROMPT = `أنت محرر إخباري أول في قناة "البلاغ"، منبر إعلامي تونسي مستقل.

## هويتنا التحريرية:
- نؤمن بالإسلام الوسطي مرجعاً للقيم والأخلاق في الشأن العام
- نرفض انقلاب 25 يوليو 2021 الذي نفّذه قيس سعيد، ونعتبره تجاوزاً صريحاً على الإرادة الشعبية والمسار الديمقراطي
- نقف ضد النظام الإيراني وأذرعه في المنطقة (حزب الله، الحوثيون، الميليشيات المرتبطة بطهران) التي تزعزع استقرار العالم العربي
- ندعم الحقوق السياسية والحريات المدنية وسيادة القانون
- نتبنى قضية الشعب الفلسطيني ونرفض التطبيع مع الاحتلال
- أسلوبنا: جاد، رصين، موضوعي في نقل الوقائع، مع وضوح في الموقف حين يقتضي السياق

## مهمتك:
تحويل الخبر المُدخَل إلى تقرير إخباري بأسلوب البلاغ الخاص. أعد صياغة العنوان والمقتطف بشكل كامل بلغتك أنت. الحقائق والأرقام تبقى دقيقة، لكن الأسلوب والصياغة يكونان صوت البلاغ الخاص. لا تذكر اسم المصدر الأصلي في النص.`;

interface RewriteResult {
  title: string;
  excerpt: string;
  category: string;
}

export async function rewriteNewsItem(
  originalTitle: string,
  originalExcerpt: string,
  sourceUrl: string
): Promise<RewriteResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      title: originalTitle,
      excerpt: originalExcerpt.slice(0, 250),
      category: "سياسة",
    };
  }

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: ALBAALAAGH_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `أعد صياغة هذا الخبر بأسلوب البلاغ:

العنوان: ${originalTitle}
التفاصيل: ${originalExcerpt.slice(0, 500)}

أجب بهذا التنسيق الحرفي فقط:
TITLE: [عنوان البلاغ المعاد صياغته]
EXCERPT: [مقتطف من جملتين بأسلوب البلاغ]
CATEGORY: [فئة واحدة من: سياسة، قضاء، اقتصاد، حقوق، برلمان، انتخابات، دولي، مجتمع]`,
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const titleMatch   = text.match(/TITLE:\s*(.+)/);
    const excerptMatch = text.match(/EXCERPT:\s*([\s\S]+?)(?=\nCATEGORY:|$)/);
    const catMatch     = text.match(/CATEGORY:\s*(.+)/);

    return {
      title:    titleMatch?.[1]?.trim()   || originalTitle,
      excerpt:  excerptMatch?.[1]?.trim().slice(0, 350) || originalExcerpt.slice(0, 250),
      category: catMatch?.[1]?.trim()     || "سياسة",
    };
  } catch (e) {
    console.error("Rewriter error:", e);
    return {
      title: originalTitle,
      excerpt: originalExcerpt.slice(0, 250),
      category: "سياسة",
    };
  }
}
