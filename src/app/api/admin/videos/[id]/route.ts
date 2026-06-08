import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;
  const { id } = await params;
  const body = await req.json();

  const updates: Record<string, unknown> = {};
  if (body.title       !== undefined) updates.title        = body.title;
  if (body.description !== undefined) updates.description  = body.description;
  if (body.video_url   !== undefined) updates.video_url    = body.video_url;
  if (body.thumbnail_url !== undefined) updates.thumbnail_url = body.thumbnail_url || null;
  if (body.published   !== undefined) updates.published    = body.published;
  if (body.display_order !== undefined) updates.display_order = body.display_order;

  const { data, error } = await supabaseAdmin
    .from("site_videos")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;
  const { id } = await params;

  const { error } = await supabaseAdmin.from("site_videos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
