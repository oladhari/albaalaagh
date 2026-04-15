import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import slugify from "slugify";
import { requireAdmin } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;
  const body = await req.json();
  const { title, excerpt, content, cover_image, category, writer_id, published, published_at } = body;

  if (!title || !content) {
    return NextResponse.json({ error: "العنوان والمحتوى مطلوبان" }, { status: 400 });
  }

  const slug = slugify(title, { locale: "ar", lower: true, strict: true }) +
    "-" + Date.now().toString(36);

  const resolvedPublishedAt = published
    ? (published_at ? new Date(published_at).toISOString() : new Date().toISOString())
    : null;

  const { data, error } = await supabaseAdmin
    .from("articles")
    .insert({
      slug,
      title,
      excerpt,
      content,
      cover_image: cover_image || null,
      category,
      writer_id: writer_id || null,
      published,
      published_at: resolvedPublishedAt,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}

export async function GET() {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;
  const { data, error } = await supabaseAdmin
    .from("articles")
    .select("*, writer:writers(*)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
