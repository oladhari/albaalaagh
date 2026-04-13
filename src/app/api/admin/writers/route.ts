import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { name, title, bio, image_url } = await req.json();

  if (!name || !title) {
    return NextResponse.json({ error: "الاسم والصفة مطلوبان" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("writers")
    .insert({ name, title, bio: bio || "", image_url: image_url || null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("writers")
    .select("*")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
