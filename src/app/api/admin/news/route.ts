import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { shareToAll } from "@/lib/share";
import { publishedAtOrNow } from "@/lib/utils";
import { newsFreshnessCutoff, sortNewsSuggestions } from "@/lib/news-feed";

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
      published_at: publishedAtOrNow(published_at),
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
    published_at: publishedAtOrNow(published_at),
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

  let query = supabaseAdmin
    .from("news")
    .select("*, submitted_by_writer:writers!submitted_by(name), news_citations(*)")
    .eq("status", status);

  if (status === "pending") {
    query = query.gte("published_at", newsFreshnessCutoff());
  }

  const { data, error } = await query
    .order("published_at", { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(sortNewsSuggestions(data ?? []));
}
