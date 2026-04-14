import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createServerSupabase } from "@/lib/supabase-server";
import slugify from "slugify";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, excerpt, content, cover_image, category, writer_id, submit } = body;

  if (!title || !content) {
    return NextResponse.json({ error: "العنوان والمحتوى مطلوبان" }, { status: 400 });
  }

  // Verify writer_id belongs to this user
  const { data: writer } = await supabaseAdmin
    .from("writers").select("id").eq("id", writer_id).eq("user_id", user.id).single();
  if (!writer) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const slug = slugify(title, { locale: "ar", lower: true, strict: true }) +
    "-" + Date.now().toString(36);

  const status = submit ? "pending" : "draft";

  const { data, error } = await supabaseAdmin
    .from("articles")
    .insert({
      slug, title, excerpt, content,
      cover_image: cover_image || null,
      category,
      writer_id,
      status,
      published: false,
      published_at: null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
