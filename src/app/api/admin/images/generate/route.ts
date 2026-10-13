import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { generateNewsImage, generateFacebookImage, generateWriterArticleImage, type PersonPhoto } from "@/lib/ai-image";
import { normalizeAiProviderError, toAdminAiResponse } from "@/lib/ai/provider";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const { title, excerpt, target, writerName, writerImageUrl, personPhotos } = await req.json().catch(() => ({}));
  if (!title) {
    return NextResponse.json({ error: "العنوان مطلوب" }, { status: 400 });
  }

  const people = Array.isArray(personPhotos)
    ? personPhotos.filter((p: unknown): p is PersonPhoto => (
        typeof p === "object" && p !== null
        && "name" in p && typeof p.name === "string"
        && "url" in p && typeof p.url === "string"
      ))
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
  } catch (err: unknown) {
    const normalized = normalizeAiProviderError(err);
    const response = toAdminAiResponse(normalized);
    console.error(JSON.stringify({
      event: "image_generation_failed",
      route: "/api/admin/images/generate",
      target: target ?? "news",
      httpStatus: normalized.status,
      errorCategory: normalized.category,
    }));
    return NextResponse.json({ error: response.error, category: response.category }, { status: response.status });
  }
}
