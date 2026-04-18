import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { postArticleToFacebook } from "@/lib/facebook";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;
  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from("articles")
    .select("*, writer:writers(name)")
    .eq("id", id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;
  const { id } = await params;
  const body = await req.json();
  const { status, published, title, excerpt, content, cover_image, category, published_at } = body;

  const updates: Record<string, unknown> = {};
  if (status !== undefined) updates.status = status;
  if (published !== undefined) {
    updates.published = published;
    if (published) {
      updates.published_at = published_at
        ? new Date(published_at).toISOString()
        : new Date().toISOString();
    }
  }
  if (title !== undefined)       updates.title = title;
  if (excerpt !== undefined)     updates.excerpt = excerpt;
  if (content !== undefined)     updates.content = content;
  if (cover_image !== undefined) updates.cover_image = cover_image || null;
  if (category !== undefined)    updates.category = category;

  // Fetch current status before updating to detect fresh publish
  const { data: before } = await supabaseAdmin
    .from("articles")
    .select("status")
    .eq("id", id)
    .single();

  const { data, error } = await supabaseAdmin
    .from("articles")
    .update(updates)
    .eq("id", id)
    .select("*, writer:writers(name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Only post to Facebook on first publish (not on edits to already-published articles)
  const wasAlreadyPublished = before?.status === "published";
  if (status === "published" && !wasAlreadyPublished && data) {
    postArticleToFacebook({
      title: data.title,
      excerpt: data.excerpt,
      slug: data.slug,
      writerName: (data.writer as any)?.name,
    }).catch(console.error);
  }

  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;
  const { id } = await params;
  const { error } = await supabaseAdmin.from("articles").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
