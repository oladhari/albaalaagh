import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { postToTelegram } from "@/lib/telegram";
import { postToX } from "@/lib/twitter";
import slugify from "slugify";

const BASE   = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.albaalaagh.com";
const BUCKET = (process.env.SUPABASE_STORAGE_BUCKET ?? "media").trim();

async function copyImageToBucket(sourceUrl: string): Promise<string | null> {
  try {
    const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) return null;
    const ext = contentType.split("/")[1]?.split(";")[0] ?? "jpg";
    const buffer = Buffer.from(await res.arrayBuffer());
    const filename = `news/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filename, buffer, { contentType, upsert: false });
    if (error) return null;
    // Use filename directly — more reliable than data.path
    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(filename);
    return urlData.publicUrl;
  } catch {
    return null;
  }
}

async function postToFacebook(title: string, excerpt: string, slug: string) {
  const PAGES = [
    { id: process.env.FB_PAGE1_ID, token: process.env.FB_PAGE1_TOKEN },
    { id: process.env.FB_PAGE2_ID, token: process.env.FB_PAGE2_TOKEN },
  ].filter((p) => p.id && p.token);
  if (PAGES.length === 0) return;

  const url     = `${BASE}/taqrir/${slug}`;
  const message = [
    title,
    excerpt ? `\n${excerpt}` : null,
    `\n🔗 اقرأ التقرير كاملاً: ${url}`,
    "\n\n#البلاغ #تونس",
  ].filter(Boolean).join("\n");

  await Promise.allSettled(
    PAGES.map((page) =>
      fetch(`https://graph.facebook.com/${page.id}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, link: url, access_token: page.token }),
      })
    )
  );
}

// POST — publish a new البلاغ article into the news table
export async function POST(
  req: NextRequest,
  _ctx: { params: Promise<{ id: string }> }
) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const { title, excerpt, content, image_url, geo, category } = await req.json();
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
    image_url:    ownedImageUrl ?? image_url ?? null,
    source:       "البلاغ",
    url,
    status:       "approved",
    geo:          geo       ?? "general",
    category:     category  ?? "سياسة",
    published_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await postToFacebook(title, excerpt, slug).catch(console.error);
  await postToTelegram({ title, excerpt, slug, type: "news" }).catch(console.error);
  await postToX({ title, excerpt, slug, type: "news" }).catch(console.error);

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
  const { title, excerpt, content, image_url, published_at } = await req.json();

  const patch: Record<string, unknown> = {};
  if (title        !== undefined) patch.title        = title;
  if (excerpt      !== undefined) patch.excerpt      = excerpt;
  if (content      !== undefined) patch.content      = content;
  if (image_url    !== undefined) patch.image_url    = image_url || null;
  if (published_at !== undefined) patch.published_at = new Date(published_at).toISOString();

  const { error } = await supabaseAdmin.from("news").update(patch).eq("id", id).eq("source", "البلاغ");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
