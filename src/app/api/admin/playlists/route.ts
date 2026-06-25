import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const { data, error } = await supabaseAdmin
    .from("playlists")
    .select("id, name, description, thumbnail_url, display_order, created_at")
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const { name, description, thumbnail_url, display_order } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "اسم البرنامج مطلوب" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("playlists")
    .insert({ name: name.trim(), description: description || null, thumbnail_url: thumbnail_url || null, display_order: display_order ?? 0 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
