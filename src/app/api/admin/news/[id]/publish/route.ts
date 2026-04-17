import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import slugify from "slugify";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.albaalaagh.com";

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
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const { title, excerpt, content, image_url, geo, category } = await req.json();
  if (!title || !content) {
    return NextResponse.json({ error: "العنوان والمحتوى مطلوبان" }, { status: 400 });
  }

  const slug = slugify(title, { locale: "ar", lower: true, strict: true }) + "-" + Date.now().toString(36);
  const url  = `${BASE}/taqrir/${slug}`;

  const { error } = await supabaseAdmin.from("news").insert({
    slug,
    content,
    title,
    excerpt,
    image_url:    image_url || null,
    source:       "البلاغ",
    url,
    status:       "approved",
    geo:          geo       ?? "general",
    category:     category  ?? "سياسة",
    published_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  postToFacebook(title, excerpt, slug).catch(console.error);

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
  const { title, excerpt, content, image_url } = await req.json();

  const patch: Record<string, unknown> = {};
  if (title     !== undefined) patch.title     = title;
  if (excerpt   !== undefined) patch.excerpt   = excerpt;
  if (content   !== undefined) patch.content   = content;
  if (image_url !== undefined) patch.image_url = image_url || null;

  const { error } = await supabaseAdmin.from("news").update(patch).eq("id", id).eq("source", "البلاغ");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
