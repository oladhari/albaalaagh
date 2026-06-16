import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { generateNewsImage, generateFacebookImage, generateWriterArticleImage } from "@/lib/ai-image";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const { title, excerpt, target, writerName, writerImageUrl } = await req.json().catch(() => ({}));
  if (!title) {
    return NextResponse.json({ error: "العنوان مطلوب" }, { status: 400 });
  }

  try {
    let url: string;
    if (target === "facebook") {
      url = await generateFacebookImage(title, excerpt ?? "");
    } else if (target === "writer") {
      if (!writerName) return NextResponse.json({ error: "اسم الكاتب مطلوب" }, { status: 400 });
      url = await generateWriterArticleImage(title, excerpt ?? "", writerName, writerImageUrl ?? null);
    } else {
      url = await generateNewsImage(title, excerpt ?? "");
    }
    return NextResponse.json({ url });
  } catch (err: any) {
    console.error("[images/generate]", err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
