import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import { formatArabicDate } from "@/lib/utils";

export default async function WriterArticlesPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: writer } = await supabaseAdmin
    .from("writers")
    .select("id")
    .eq("user_id", user!.id)
    .single();

  const { data: articles } = writer
    ? await supabaseAdmin
        .from("articles")
        .select("id, title, status, category, published_at, created_at")
        .eq("writer_id", writer.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  const statusLabel: Record<string, string> = {
    draft: "مسودة", pending: "بانتظار النشر", published: "منشور",
  };
  const statusColor: Record<string, string> = {
    draft: "#9A9070", pending: "#C9A844", published: "#6BCB77",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black" style={{ color: "#F0EAD6" }}>مقالاتي</h1>
        <Link
          href="/writer/articles/new"
          className="px-5 py-2 rounded-full text-sm font-bold"
          style={{ background: "linear-gradient(135deg, #C9A844, #9A7B28)", color: "#111008" }}
        >
          + مقال جديد
        </Link>
      </div>

      {!articles?.length ? (
        <div className="text-center py-20">
          <p className="text-sm mb-4" style={{ color: "#9A9070" }}>لا توجد مقالات بعد</p>
          <Link
            href="/writer/articles/new"
            className="px-5 py-2 rounded-full text-sm font-bold"
            style={{ background: "linear-gradient(135deg, #C9A844, #9A7B28)", color: "#111008" }}
          >
            اكتب أول مقال
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map((article: any) => (
            <div
              key={article.id}
              className="flex items-center gap-4 p-4 rounded-xl"
              style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: "rgba(201,168,68,0.12)", color: "#C9A844" }}
                  >
                    {article.category}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ color: statusColor[article.status], background: `${statusColor[article.status]}18` }}
                  >
                    {statusLabel[article.status]}
                  </span>
                </div>
                <p className="font-semibold text-sm" style={{ color: "#F0EAD6" }}>{article.title}</p>
                <p className="text-xs mt-0.5" style={{ color: "#9A9070" }}>
                  {formatArabicDate(article.published_at ?? article.created_at)}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                {article.status !== "published" && (
                  <Link
                    href={`/writer/articles/${article.id}/edit`}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                    style={{ borderColor: "#2E2A18", color: "#9A9070" }}
                  >
                    تعديل
                  </Link>
                )}
                {article.status === "published" && (
                  <Link
                    href={`/articles/${article.id}`}
                    target="_blank"
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                    style={{ borderColor: "#2E2A18", color: "#9A9070" }}
                  >
                    عرض ↗
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
