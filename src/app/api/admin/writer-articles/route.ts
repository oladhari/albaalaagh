import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { postArticleToFacebook } from "@/lib/facebook";
import { postToTelegram } from "@/lib/telegram";
import { postToX } from "@/lib/twitter";

export async function GET(req: NextRequest) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;
  const status = req.nextUrl.searchParams.get("status") ?? "pending";

  const { data, error } = await supabaseAdmin
    .from("writer_articles")
    .select("*")
    .eq("status", status)
    .order("published_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;
  const { id, status } = await req.json();

  if (!id || !["approved", "rejected", "pending"].includes(status)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { data: article, error: fetchError } = await supabaseAdmin
    .from("writer_articles")
    .select("title, excerpt, slug, writer_name, status")
    .eq("id", id)
    .single();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const { error } = await supabaseAdmin
    .from("writer_articles")
    .update({ status })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (status === "approved" && article.status !== "approved") {
    const postOpts = {
      title: article.title,
      excerpt: article.excerpt ?? "",
      slug: article.slug,
      writerName: article.writer_name ?? undefined,
      type: "article" as const,
    };
    await Promise.allSettled([
      postArticleToFacebook(postOpts),
      postToTelegram(postOpts),
      postToX(postOpts),
    ]);
  }

  return NextResponse.json({ ok: true });
}
