import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { requireAdmin } from "@/lib/admin-auth";
import { uploadToR2 } from "@/lib/r2";

export async function POST(req: NextRequest) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());

  const processed = await sharp(buffer)
    .resize(1280, 720, { fit: "cover", position: "centre" })
    .jpeg({ quality: 88 })
    .toBuffer();

  const key = `covers/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  const url = await uploadToR2(key, processed, "image/jpeg");
  return NextResponse.json({ url });
}
