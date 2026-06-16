import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { generateNewsImage } from "@/lib/ai-image";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const { title, excerpt } = await req.json().catch(() => ({}));
  if (!title) {
    return NextResponse.json({ error: "العنوان مطلوب" }, { status: 400 });
  }

  try {
    const url = await generateNewsImage(title, excerpt ?? "");
    return NextResponse.json({ url });
  } catch (err: any) {
    console.error("[images/generate]", err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
