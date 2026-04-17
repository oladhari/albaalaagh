import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const { updates } = await req.json() as {
    updates: { id: string; name?: string; title?: string; category?: string }[];
  };

  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  let applied = 0;
  const errors: string[] = [];

  for (const u of updates) {
    const patch: Record<string, string> = {};
    if (u.name)     patch.name     = u.name;
    if (u.title)    patch.title    = u.title;
    if (u.category) patch.category = u.category;
    if (Object.keys(patch).length === 0) continue;

    const { error } = await supabaseAdmin
      .from("guests")
      .update(patch)
      .eq("id", u.id);

    if (error) errors.push(`${u.id}: ${error.message}`);
    else applied++;
  }

  return NextResponse.json({ applied, errors });
}
