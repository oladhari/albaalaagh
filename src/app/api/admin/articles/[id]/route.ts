import { NextRequest, NextResponse, after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { articleShareOptions, isPublishedArticle } from "@/lib/share-options";
import { shareToAll } from "@/lib/share";

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
  const { status, published, title, excerpt, content, cover_image, category, published_at, writer_id } = body;

  if (status !== undefined && !["draft", "pending", "published"].includes(status)) {
    return NextResponse.json({ error: "حالة النشر غير صالحة" }, { status: 400 });
  }
  if (published !== undefined && typeof published !== "boolean") {
    return NextResponse.json({ error: "حالة النشر غير صالحة" }, { status: 400 });
  }
  if (status !== undefined && published !== undefined && (status === "published") !== published) {
    return NextResponse.json({ error: "حالتا النشر غير متطابقتين" }, { status: 400 });
  }
  const { data: before, error: beforeError } = await supabaseAdmin.from("articles")
    .select("status,published,published_at").eq("id", id).single();
  if (beforeError || !before) return NextResponse.json({ error: "المادة غير موجودة" }, { status: 404 });

  const updates: Record<string, unknown> = {};
  const visibilityChanged = status !== undefined || published !== undefined;
  if (visibilityChanged) {
    const nextStatus = status ?? (published ? "published" : "draft");
    const nextPublished = nextStatus === "published";
    updates.status = nextStatus;
    updates.published = nextPublished;
    updates.published_at = nextPublished
      ? (published_at ? new Date(published_at).toISOString() : before.published_at ?? new Date().toISOString())
      : null;
  } else if (published_at !== undefined && isPublishedArticle(before)) {
    updates.published_at = new Date(published_at).toISOString();
  }
  if (writer_id !== undefined) updates.writer_id = writer_id || null;
  if (title !== undefined)       updates.title = title;
  if (excerpt !== undefined)     updates.excerpt = excerpt;
  if (content !== undefined)     updates.content = content;
  if (cover_image !== undefined) updates.cover_image = cover_image || null;
  if (category !== undefined)    updates.category = category;

  // Compare visibility state to avoid duplicate SNS dispatch from concurrent publish requests.
  const { data, error } = await supabaseAdmin
    .from("articles").update(updates).eq("id", id)
    .eq("status", before.status).eq("published", before.published)
    .select("*, writer:writers(name)").single();
  if (error || !data) return NextResponse.json({ error: "تعذّر الحفظ؛ أعد تحميل المادة للتحقق من حالتها" }, { status: 409 });

  if (isPublishedArticle(data) && !isPublishedArticle(before)) {
    const postOpts = articleShareOptions(data);
    after(() => shareToAll(postOpts).catch(console.error));
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
