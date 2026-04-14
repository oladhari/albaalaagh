import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Priority order for sources — Tunisia first, then Arab regional, then others
const SOURCE_PRIORITY: Record<string, number> = {
  "تيوميديا":      1,
  "موزاييك FM":    2,
  "نواة":          3,
  "عربي21":        4,
  "الجزيرة":       5,
  "العربي الجديد": 6,
  "القدس العربي":  7,
};

export async function PATCH(req: NextRequest) {
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
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "pending";

  const { data, error } = await supabaseAdmin
    .from("news")
    .select("*")
    .eq("status", status)
    .order("published_at", { ascending: false })
    .limit(60);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sort by source priority then date
  const sorted = (data ?? []).sort((a: any, b: any) => {
    const pa = SOURCE_PRIORITY[a.source] ?? 99;
    const pb = SOURCE_PRIORITY[b.source] ?? 99;
    if (pa !== pb) return pa - pb;
    return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
  });

  return NextResponse.json(sorted);
}
