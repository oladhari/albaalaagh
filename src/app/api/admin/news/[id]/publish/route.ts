import { NextRequest, NextResponse, after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { shareToAll } from "@/lib/share";
import { uploadToR2 } from "@/lib/r2";
import type { NewsCitation } from "@/types";
const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.albaalaagh.com";

function cleanCitations(value: unknown): NewsCitation[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Partial<NewsCitation>;
    if (!row.name?.trim() || !row.url?.trim()) return [];
    try {
      const url = new URL(row.url);
      if (!["http:", "https:"].includes(url.protocol)) return [];
      return [{
        name: row.name.trim(),
        url: url.toString(),
        kind: ["official", "agency", "media", "document", "interview"].includes(row.kind ?? "")
          ? row.kind as NewsCitation["kind"]
          : "media",
        is_primary: Boolean(row.is_primary),
        published_at: row.published_at ?? null,
      }];
    } catch {
      return [];
    }
  });
}

async function replaceCitations(newsId: string, citations: NewsCitation[]) {
  await supabaseAdmin.from("news_citations").delete().eq("news_id", newsId);
  if (citations.length === 0) return null;
  const { error } = await supabaseAdmin.from("news_citations").insert(
    citations.map((citation, index) => ({
      news_id: newsId,
      name: citation.name,
      url: citation.url,
      kind: citation.kind,
      is_primary: citation.is_primary || index === 0,
      published_at: citation.published_at ?? null,
    })),
  );
  return error;
}

async function copyImageToBucket(sourceUrl: string): Promise<string | null> {
  try {
    const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) return null;
    const ext = contentType.split("/")[1]?.split(";")[0] ?? "jpg";
    const buffer = Buffer.from(await res.arrayBuffer());
    const key = `news/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    return await uploadToR2(key, buffer, contentType);
  } catch {
    return null;
  }
}

// POST — publish a new البلاغ article into the news table
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const { id } = await params;
  const { title, excerpt, content, image_url, facebook_image, geo, category, citations: rawCitations } = await req.json();
  const citations = cleanCitations(rawCitations);
  if (!title || !content) {
    return NextResponse.json({ error: "العنوان والمحتوى مطلوبان" }, { status: 400 });
  }
  if (citations.length === 0) {
    return NextResponse.json({ error: "يجب إضافة مصدر موثوق واحد على الأقل" }, { status: 400 });
  }

  const slug = Date.now().toString(36);
  const url  = `${BASE}/taqrir/${slug}`;

  // Copy RSS image to our bucket so we own it permanently
  const ownedImageUrl = image_url ? await copyImageToBucket(image_url) : null;

  const citationError = await replaceCitations(id, citations);
  if (citationError) return NextResponse.json({ error: citationError.message }, { status: 500 });

  const { error } = await supabaseAdmin.from("news").update({
    slug,
    content,
    title,
    excerpt,
    image_url:      ownedImageUrl ?? image_url ?? null,
    facebook_image: facebook_image || null,
    source:         "البلاغ",
    url,
    status:         "approved",
    geo:            geo       ?? "general",
    category:       category  ?? "سياسة",
    published_at:   new Date().toISOString(),
    updated_at:     new Date().toISOString(),
  }).eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Run after response is sent — after() keeps the function alive on Vercel until done
  after(() => shareToAll({ title, excerpt, slug, type: "news", facebook_image: facebook_image || null, image: (ownedImageUrl ?? image_url) || null }).catch(console.error));

  return NextResponse.json({ ok: true, slug, url });
}

// PATCH — edit an already-published البلاغ article
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const { id } = await params;
  const { title, excerpt, content, image_url, published_at, geo, category, citations: rawCitations } = await req.json();
  const citations = cleanCitations(rawCitations);
  if (citations.length === 0) {
    return NextResponse.json({ error: "يجب إضافة مصدر موثوق واحد على الأقل" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (title        !== undefined) patch.title        = title;
  if (excerpt      !== undefined) patch.excerpt      = excerpt;
  if (content      !== undefined) patch.content      = content;
  if (image_url    !== undefined) patch.image_url    = image_url || null;
  if (published_at !== undefined) patch.published_at = new Date(published_at).toISOString();
  if (geo          !== undefined) patch.geo          = geo;
  if (category     !== undefined) patch.category     = category;
  patch.updated_at = new Date().toISOString();

  const { data: updated, error } = await supabaseAdmin
    .from("news")
    .update(patch)
    .eq("id", id)
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated?.length) return NextResponse.json({ error: "لم يتم العثور على المقال" }, { status: 404 });

  const citationError = await replaceCitations(id, citations);
  if (citationError) return NextResponse.json({ error: citationError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
