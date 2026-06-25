import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const { data, error } = await supabaseAdmin
    .from("site_videos")
    .select("*")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const { title, description, video_url, thumbnail_url, display_order, playlist_id, published_at, video_type, hashtags } = await req.json();
  if (!title || !video_url) {
    return NextResponse.json({ error: "العنوان ورابط الفيديو مطلوبان" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("site_videos")
    .insert({ title, description: description || null, video_url, thumbnail_url: thumbnail_url || null, display_order: display_order ?? 0, published: true, playlist_id: playlist_id || null, published_at: published_at || null, video_type: video_type || "interview", hashtags: hashtags || null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
