import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createServerSupabase } from "@/lib/supabase-server";
import slugify from "slugify";

async function getEditor() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: writer } = await supabaseAdmin
    .from("writers")
    .select("id, role")
    .eq("user_id", user.id)
    .single();
  if (!writer || writer.role !== "editor") return null;
  return writer;
}

export async function GET() {
  const editor = await getEditor();
  if (!editor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabaseAdmin
    .from("news")
    .select("id, title, status, category, created_at")
    .eq("submitted_by", editor.id)
    .order("created_at", { ascending: false });

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const editor = await getEditor();
  if (!editor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, excerpt, content, image_url, category, geo } = await req.json();
  if (!title || !excerpt)
    return NextResponse.json({ error: "العنوان والمقدمة مطلوبان" }, { status: 400 });

  const slug =
    slugify(title, { locale: "ar", lower: true, strict: true }) +
    "-" + Date.now().toString(36);

  const { data, error } = await supabaseAdmin
    .from("news")
    .insert({
      slug,
      title,
      excerpt,
      content:      content || null,
      image_url:    image_url || null,
      url:          `https://www.albaalaagh.com/taqrir/${slug}`,
      source:       "البلاغ",
      status:       "pending",
      category:     category || "عام",
      geo:          geo || "tunisia",
      published_at: new Date().toISOString(),
      submitted_by: editor.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
