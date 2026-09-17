import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { shareToAll } from "@/lib/share";

// Priority order for sources — Tunisia first, then Arab regional, then others
const SOURCE_PRIORITY: Record<string, number> = {
  "رئاسة الحكومة التونسية": 1,
  "موزاييك FM": 2,
  "أخبار الأمم المتحدة": 4,
  "الجزيرة": 5,
  "الأناضول": 6,
  "DW عربية": 7,
  "فرانس 24 عربي": 8,
  "USGS": 9,
  "GDACS": 10,
  "BBC World": 11,
  "BBC Technology": 12,
  "MIT Technology Review": 13,
  "Ars Technica": 14,
  "TechCrunch": 15,
  "NASA": 16,
};

export async function POST(req: NextRequest) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const body = await req.json();
  const { title, excerpt, content, image_url, facebook_image, category, geo, published_at, source_name, source_url } = body;

  if (!title || !content) {
    return NextResponse.json({ error: "العنوان والمحتوى مطلوبان" }, { status: 400 });
  }
  if (!source_name || !source_url) {
    return NextResponse.json({ error: "المصدر الأساسي مطلوب" }, { status: 400 });
  }
  try {
    const parsed = new URL(source_url);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Invalid protocol");
  } catch {
    return NextResponse.json({ error: "رابط المصدر غير صالح" }, { status: 400 });
  }

  const slug = Date.now().toString(36);

  const { data, error } = await supabaseAdmin
    .from("news")
    .insert({
      slug,
      title,
      excerpt:      excerpt || null,
      content,
      image_url:      image_url || null,
      facebook_image: facebook_image || null,
      url:          `https://www.albaalaagh.com/taqrir/${slug}`,
      source:       "البلاغ",
      status:       "approved",
      category:     category || "عام",
      geo:          geo || "tunisia",
      published_at: published_at ? new Date(published_at).toISOString() : new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { error: citationError } = await supabaseAdmin.from("news_citations").insert({
    news_id: data.id,
    name: source_name.trim(),
    url: source_url.trim(),
    kind: "media",
    is_primary: true,
    published_at: published_at ? new Date(published_at).toISOString() : new Date().toISOString(),
  });
  if (citationError) {
    await supabaseAdmin.from("news").delete().eq("id", data.id);
    return NextResponse.json({ error: citationError.message }, { status: 500 });
  }

  await shareToAll({ title, excerpt, slug: data.slug, type: "news", facebook_image: facebook_image || null, image: image_url || null });

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { error } = await supabaseAdmin.from("news").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;
  const { id, status } = await req.json();

  if (!id || !["approved", "rejected", "pending"].includes(status)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Just update status — no rewriting, show news as-is from source
  const { error } = await supabaseAdmin
    .from("news")
    .update({ status })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "pending";

  const { data, error } = await supabaseAdmin
    .from("news")
    .select("*, submitted_by_writer:writers!submitted_by(name), news_citations(*)")
    .eq("status", status)
    .order("published_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sort: priority_score DESC → source priority → date DESC
  const sorted = (data ?? []).sort((a: any, b: any) => {
    const scoreA = a.priority_score ?? 0;
    const scoreB = b.priority_score ?? 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    const pa = SOURCE_PRIORITY[a.source] ?? 99;
    const pb = SOURCE_PRIORITY[b.source] ?? 99;
    if (pa !== pb) return pa - pb;
    return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
  });

  return NextResponse.json(sorted);
}
