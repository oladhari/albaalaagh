import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;
  const { data, error } = await supabaseAdmin
    .from("guests")
    .select("*")
    .order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;
  const body = await req.json();
  const { name, title, bio, image_url, category, tier, is_staff, program_name } = body;

  if (!name || !title || !category) {
    return NextResponse.json({ error: "الاسم والصفة والتصنيف مطلوبة" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("guests")
    .insert({
      name,
      title,
      bio:          bio          ?? "",
      image_url:    image_url    ?? null,
      category,
      tier:         tier         ?? "guest",
      is_staff:     is_staff     ?? false,
      program_name: program_name ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;
  const { id, tier, is_staff, is_active, program_name, program_names, host_id, program_ids, roles } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (tier          !== undefined) patch.tier          = tier;
  if (is_staff      !== undefined) patch.is_staff      = is_staff;
  if (program_name  !== undefined) patch.program_name  = program_name || null;
  if (host_id       !== undefined) patch.host_id       = host_id || null;
  if (program_names !== undefined) patch.program_names = program_names ?? [];
  if (program_ids   !== undefined) patch.program_ids   = program_ids  ?? [];
  if (roles         !== undefined) patch.roles         = roles        ?? [];
  if (is_active     !== undefined) patch.is_active     = is_active;

  const { data: updated, error } = await supabaseAdmin.from("guests").update(patch).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, is_active: updated?.is_active });
}

export async function DELETE(req: NextRequest) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabaseAdmin.from("guests").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
