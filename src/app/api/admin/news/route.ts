import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

// Priority order for sources — Tunisia first, then Arab regional, then others
const SOURCE_PRIORITY: Record<string, number> = {
  "تيوميديا":      1,
  "موزاييك FM":    2,
  "نواة":          3,
  "ديوان FM":      4,
  "تونس تلغراف":  5,
  "عربي21":        6,
  "الجزيرة":       7,
  "العربي الجديد": 8,
  "القدس العربي":  9,
  "الأناضول":      10,
};

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

  const { data, error } = await supabaseAdmin
    .from("news")
    .select("*")
    .eq("status", status)
    .order("published_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sort: priority_score DESC → source priority → date DESC
  const sorted = (data ?? []).sort((a: any, b: any) => {
    const scoreA = a.priority_score ?? 0;
    const scoreB = b.priority_score ?? 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    const pa = SOURCE_PRIORITY[a.source] ?? 99;
    const pb = SOURCE_PRIORITY[b.source] ?? 99;
    if (pa !== pb) return pa - pb;
    return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
  });

  return NextResponse.json(sorted);
}
