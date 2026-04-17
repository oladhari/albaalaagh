import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

export const maxDuration = 60;

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
  hasMore: boolean;
  nextOffset: number;
  total: number;
}

const CATEGORIES = "وزير|برلماني|ناشط|مفكر|صحفي|أكاديمي|رجل دين|رئيس دولة|دبلوماسي|قاضٍ|آخر";

export async function POST(req: NextRequest) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const { searchParams } = new URL(req.url);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);
  const limit  = 50;

  const { data: guests, error } = await supabaseAdmin
    .from("guests")
    .select("id, name, title, category")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!guests?.length) return NextResponse.json({ updates: [], duplicates: [], uncertain: [], hasMore: false, nextOffset: 0, total: 0 });

  const chunk = guests.slice(offset, offset + limit);
  const hasMore = offset + limit < guests.length;

  const list = chunk
    .map((g) => `[${g.id}] "${g.name}" | صفة: "${g.title ?? ""}" | تصنيف: "${g.category ?? ""}"`)
    .join("\n");

  // For duplicates we need full names list even in chunk mode
  const allNames = guests.map((g) => `[${g.id}] ${g.name}`).join(", ");

  const prompt = `أنت خبير في الشخصيات السياسية والفكرية التونسية والعربية والدولية.
راجع هؤلاء الضيوف من قناة "البلاغ" التونسية:

التصنيفات المتاحة: ${CATEGORIES}

لكل ضيف في القائمة أدناه:
1. إذا اسمه مكتوب بالعربية لكنه أجنبي (غربي، إسرائيلي، تركي...) → أعد اسمه بلغته الأصلية
2. إذا صفته غير دقيقة أو فارغة → صحّح
3. إذا تصنيفه خاطئ → صحّح من قائمة التصنيفات أعلاه
4. إذا قد يكون مكرراً مع ضيف آخر (من القائمة الكاملة: ${allNames}) → أشر إليه
5. إذا لا تعرفه → ضعه في uncertain

أجب بـ JSON فقط:
{
  "updates": [{"id":"...","name":"(فقط إذا يختلف)","title":"(فقط إذا يختلف)","category":"(فقط إذا يختلف)","reason":"..."}],
  "duplicates": [{"ids":["id1","id2"],"names":["اسم1","اسم2"],"reason":"..."}],
  "uncertain": [{"id":"...","name":"...","reason":"..."}]
}

الضيوف للمراجعة:
${list}`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 6000,
      messages: [{ role: "user", content: prompt }],
    });

    const text  = msg.content[0].type === "text" ? msg.content[0].text : "";
    const start = text.indexOf("{");
    const end   = text.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("No JSON in Sonnet response");

    const raw: ReviewResult = JSON.parse(text.slice(start, end + 1));

    // Enrich updates with current values for UI diff
    const guestMap = new Map(guests.map((g) => [g.id, g]));
    const updates = (raw.updates ?? [])
      .filter((u) => guestMap.has(u.id))
      .map((u) => {
        const g = guestMap.get(u.id)!;
        return { ...u, current_name: g.name, current_title: g.title ?? "", current_category: g.category ?? "" };
      });

    return NextResponse.json({
      updates,
      duplicates: raw.duplicates ?? [],
      uncertain:  raw.uncertain  ?? [],
      hasMore,
      nextOffset: offset + limit,
      total: guests.length,
    });
  } catch (err: any) {
    console.error("[guests/review]", err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
