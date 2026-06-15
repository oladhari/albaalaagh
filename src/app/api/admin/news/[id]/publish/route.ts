import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { shareToAll } from "@/lib/share";
import { uploadToR2 } from "@/lib/r2";
import slugify from "slugify";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.albaalaagh.com";

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
  _ctx: { params: Promise<{ id: string }> }
) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const { title, excerpt, content, image_url, facebook_image, geo, category } = await req.json();
  if (!title || !content) {
    return NextResponse.json({ error: "العنوان والمحتوى مطلوبان" }, { status: 400 });
  }

  const slug = slugify(title, { locale: "ar", lower: true, strict: true }) + "-" + Date.now().toString(36);
  const url  = `${BASE}/taqrir/${slug}`;

  // Copy RSS image to our bucket so we own it permanently
  const ownedImageUrl = image_url ? await copyImageToBucket(image_url) : null;

  const { error } = await supabaseAdmin.from("news").insert({
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
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fire-and-forget — don't block the response waiting for social APIs
  shareToAll({ title, excerpt, slug, type: "news", facebook_image: facebook_image || null, image: (ownedImageUrl ?? image_url) || null }).catch(console.error);

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
  const { title, excerpt, content, image_url, published_at, geo, category } = await req.json();

  const patch: Record<string, unknown> = {};
  if (title        !== undefined) patch.title        = title;
  if (excerpt      !== undefined) patch.excerpt      = excerpt;
  if (content      !== undefined) patch.content      = content;
  if (image_url    !== undefined) patch.image_url    = image_url || null;
  if (published_at !== undefined) patch.published_at = new Date(published_at).toISOString();
  if (geo          !== undefined) patch.geo          = geo;
  if (category     !== undefined) patch.category     = category;

  const { data: updated, error } = await supabaseAdmin
    .from("news")
    .update(patch)
    .eq("id", id)
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated?.length) return NextResponse.json({ error: "لم يتم العثور على المقال" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
