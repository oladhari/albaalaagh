import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("site_settings")
    .select("value")
    .eq("key", key)
    .single();

  if (error) return NextResponse.json({ value: null });
  return NextResponse.json({ value: data.value });
}

export async function PATCH(req: NextRequest) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const { key, value } = await req.json();
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("site_settings")
    .upsert({ key, value: String(value) }, { onConflict: "key" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
