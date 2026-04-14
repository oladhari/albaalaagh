import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import { formatArabicDate } from "@/lib/utils";

export default async function WriterDashboard() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: writer } = await supabaseAdmin
    .from("writers")
    .select("id, name, title")
    .eq("user_id", user!.id)
    .single();

  if (!writer) {
    return (
      <div className="text-center py-20">
        <p className="text-lg mb-2" style={{ color: "#9A9070" }}>
          لم يتم ربط حسابك بملف كاتب بعد
        </p>
        <p className="text-sm" style={{ color: "#9A9070" }}>
          تواصل مع مدير الموقع لإتمام الإعداد
        </p>
      </div>
    );
  }

  const { data: articles } = await supabaseAdmin
    .from("articles")
    .select("id, title, status, published_at, created_at, category")
    .eq("writer_id", writer.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const all = articles ?? [];
  const published = all.filter((a: any) => a.status === "published").length;
  const pending   = all.filter((a: any) => a.status === "pending").length;
  const drafts    = all.filter((a: any) => a.status === "draft").length;

  const statusLabel: Record<string, string> = {
    draft: "مسودة", pending: "بانتظار النشر", published: "منشور",
  };
  const statusColor: Record<string, string> = {
    draft: "#9A9070", pending: "#C9A844", published: "#6BCB77",
  };

  return (
    <div>
      <h1 className="text-2xl font-black mb-1" style={{ color: "#F0EAD6" }}>
        أهلاً، {writer.name}
      </h1>
      <p className="text-sm mb-8" style={{ color: "#9A9070" }}>{writer.title}</p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {[
          { label: "منشورة", value: published, color: "#6BCB77" },
          { label: "بانتظار المراجعة", value: pending, color: "#C9A844" },
          { label: "مسودات", value: drafts, color: "#9A9070" },
        ].map((s) => (
          <div
            key={s.label}
            className="p-5 rounded-xl text-center"
            style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
          >
            <p className="text-3xl font-black mb-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs" style={{ color: "#9A9070" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quick action */}
      <div className="flex gap-3 mb-8">
        <Link
          href="/writer/articles/new"
          className="px-5 py-2.5 rounded-full text-sm font-bold"
          style={{ background: "linear-gradient(135deg, #C9A844, #9A7B28)", color: "#111008" }}
        >
          + كتابة مقال جديد
        </Link>
        <Link
          href="/writer/articles"
          className="px-5 py-2.5 rounded-full text-sm font-bold border"
          style={{ borderColor: "#2E2A18", color: "#9A9070" }}
        >
          جميع مقالاتي
        </Link>
      </div>

      {/* Recent articles */}
      {all.length > 0 && (
        <div>
          <h2 className="text-base font-bold mb-4" style={{ color: "#C9A844" }}>آخر المقالات</h2>
          <div className="space-y-3">
            {all.map((article: any) => (
              <div
                key={article.id}
                className="flex items-center gap-4 p-4 rounded-xl"
                style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: "#F0EAD6" }}>
                    {article.title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#9A9070" }}>
                    {formatArabicDate(article.published_at ?? article.created_at)}
                  </p>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full shrink-0"
                  style={{ color: statusColor[article.status], background: `${statusColor[article.status]}18` }}
                >
                  {statusLabel[article.status]}
                </span>
                <Link
                  href={`/writer/articles/${article.id}/edit`}
                  className="text-xs px-3 py-1.5 rounded-lg border shrink-0"
                  style={{ borderColor: "#2E2A18", color: "#9A9070" }}
                >
                  تعديل
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
