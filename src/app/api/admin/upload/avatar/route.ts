import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

const BUCKET = (process.env.SUPABASE_STORAGE_BUCKET ?? "media").trim();

export async function POST(req: NextRequest) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());

  // Resize to 400x400 square, convert to JPEG, quality 85
  const processed = await sharp(buffer)
    .resize(400, 400, { fit: "cover", position: "centre" })
    .jpeg({ quality: 85 })
    .toBuffer();

  const filename = `avatars/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(filename, processed, { contentType: "image/jpeg", upsert: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(filename);
  return NextResponse.json({ url: urlData.publicUrl });
}
