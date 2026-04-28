import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { uploadToR2 } from "@/lib/r2";

export async function POST(req: NextRequest) {
  try {
    const unauthed = await requireAdmin();
    if (unauthed) return unauthed;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `covers/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
    const url = await uploadToR2(key, buffer, "image/jpeg");
    return NextResponse.json({ url });
  } catch (err: any) {
    console.error("cover upload error:", err);
    return NextResponse.json({ error: err.message ?? "Upload failed" }, { status: 500 });
  }
}
