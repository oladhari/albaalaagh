import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") ?? "pending";

  const { data, error } = await supabaseAdmin
    .from("writer_articles")
    .select("*")
    .eq("status", status)
    .order("published_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json();

  if (!id || !["approved", "rejected", "pending"].includes(status)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("writer_articles")
    .update({ status })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
