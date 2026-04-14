import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createServerSupabase } from "@/lib/supabase-server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership: article must belong to a writer owned by this user
  const { data: article } = await supabaseAdmin
    .from("articles")
    .select("id, status, writer:writers!inner(user_id)")
    .eq("id", id)
    .single();

  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const writerData = Array.isArray(article.writer) ? article.writer[0] : article.writer;
  if ((writerData as any)?.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Can only edit drafts
  if (article.status === "published") {
    return NextResponse.json({ error: "لا يمكن تعديل مقال منشور" }, { status: 400 });
  }

  const body = await req.json();
  const { title, excerpt, content, cover_image, category, submit } = body;

  const status = submit ? "pending" : "draft";

  const { data, error } = await supabaseAdmin
    .from("articles")
    .update({ title, excerpt, content, cover_image: cover_image || null, category, status })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
