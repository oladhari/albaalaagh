import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { generateNewsImage, generateFacebookImage, generateWriterArticleImage } from "@/lib/ai-image";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const { title, excerpt, target, writerName, writerImageUrl, personPhotos } = await req.json().catch(() => ({}));
  if (!title) {
    return NextResponse.json({ error: "العنوان مطلوب" }, { status: 400 });
  }

  const people = Array.isArray(personPhotos)
    ? personPhotos.filter((p: any) => p && typeof p.name === "string" && typeof p.url === "string")
    : [];

  try {
    let url: string;
    let failedPeople: string[] = [];
    if (target === "facebook") {
      ({ url, failedPeople } = await generateFacebookImage(title, excerpt ?? "", people));
    } else if (target === "writer") {
      if (!writerName) return NextResponse.json({ error: "اسم الكاتب مطلوب" }, { status: 400 });
      url = await generateWriterArticleImage(title, excerpt ?? "", writerName, writerImageUrl ?? null);
    } else {
      ({ url, failedPeople } = await generateNewsImage(title, excerpt ?? "", people));
    }
    return NextResponse.json({ url, failedPeople });
  } catch (err: any) {
    console.error("[images/generate]", err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
