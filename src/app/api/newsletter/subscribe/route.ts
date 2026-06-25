import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { email, name } = await req.json();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "بريد إلكتروني غير صالح" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("newsletter_subscribers")
    .upsert({ email: email.toLowerCase().trim(), name: name?.trim() || null, status: "active" }, { onConflict: "email" });

  if (error) {
    return NextResponse.json({ error: "حدث خطأ، حاول مجدداً" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
