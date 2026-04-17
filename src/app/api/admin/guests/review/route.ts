import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

export const maxDuration = 120;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface GuestUpdate {
  id: string;
  current_name: string;
  current_title: string;
  current_category: string;
  name?: string;
  title?: string;
  category?: string;
  reason: string;
}

export interface GuestDuplicate {
  ids: string[];
  names: string[];
  reason: string;
}

export interface GuestUncertain {
  id: string;
  name: string;
  reason: string;
}

export interface ReviewResult {
  updates: GuestUpdate[];
  duplicates: GuestDuplicate[];
  uncertain: GuestUncertain[];
}

export async function POST(req: NextRequest) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const { data: guests, error } = await supabaseAdmin
    .from("guests")
    .select("id, name, title, category")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!guests?.length) return NextResponse.json({ updates: [], duplicates: [], uncertain: [] });

  const list = guests
    .map((g, i) => `${i}. [${g.id}] الاسم: "${g.name}" | الصفة: "${g.title ?? ""}" | التصنيف: "${g.category ?? ""}"`)
    .join("\n");

  const prompt = `أنت خبير في الشخصيات السياسية والفكرية التونسية والعربية والدولية.
لديك قائمة ضيوف من قناة "البلاغ" التونسية السياسية. راجع كل ضيف وأعطِ:

1. **تعديلات مقترحة** للضيوف الذين:
   - اسمهم مكتوب بالعربية لكنهم أجانب (أوروبيون، أمريكيون، إسرائيليون...) → أعد الاسم بلغته الأصلية
   - صفتهم غير دقيقة أو فارغة → صحّح بناءً على معرفتك
   - تصنيفهم خاطئ → صحّح (الخيارات: وزير|برلماني|ناشط|مفكر|صحفي|أكاديمي|آخر)
   - لا تقترح تعديلاً إذا كانت المعلومات صحيحة

2. **مكررات محتملة**: أشخاص في القائمة قد يكونون نفس الشخص (اسم مختلف، لقب مختلف، ترجمة مختلفة)

3. **غير متأكد**: ضيوف لا تعرف عنهم معلومات كافية

أجب بـ JSON فقط بهذا الشكل:
{
  "updates": [
    {
      "id": "uuid-من-القائمة",
      "name": "الاسم المصحح (فقط إذا يختلف عن الحالي)",
      "title": "الصفة المصححة (فقط إذا تختلف)",
      "category": "التصنيف المصحح (فقط إذا يختلف)",
      "reason": "سبب التعديل بالعربية"
    }
  ],
  "duplicates": [
    {
      "ids": ["id1", "id2"],
      "names": ["الاسم الأول", "الاسم الثاني"],
      "reason": "سبب الاعتقاد بأنهما نفس الشخص"
    }
  ],
  "uncertain": [
    {
      "id": "uuid",
      "name": "اسم الضيف",
      "reason": "سبب عدم التأكد"
    }
  ]
}

القائمة:
${list}`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const start = text.indexOf("{");
    const end   = text.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("No JSON in response");

    const result: ReviewResult = JSON.parse(text.slice(start, end + 1));

    // Enrich updates with current values for the UI diff
    const guestMap = new Map(guests.map((g) => [g.id, g]));
    result.updates = (result.updates ?? [])
      .filter((u) => guestMap.has(u.id))
      .map((u) => {
        const g = guestMap.get(u.id)!;
        return {
          ...u,
          current_name:     g.name,
          current_title:    g.title ?? "",
          current_category: g.category ?? "",
        };
      });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[guests/review]", err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
