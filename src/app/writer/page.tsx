import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import { formatArabicDate } from "@/lib/utils";

export default async function WriterDashboard() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: writer } = await supabaseAdmin
    .from("writers")
    .select("id, name, title, role")
    .eq("user_id", user!.id)
    .single();

  if (!writer) {
    return (
      <div className="text-center py-20">
        <p className="text-lg mb-2" style={{ color: "#9A9070" }}>لم يتم ربط حسابك بملف كاتب بعد</p>
        <p className="text-sm" style={{ color: "#9A9070" }}>تواصل مع مدير الموقع لإتمام الإعداد</p>
      </div>
    );
  }

  const isEditor = writer.role === "editor";

  const [{ data: articles }, { data: newsItems }] = await Promise.all([
    supabaseAdmin
      .from("articles")
      .select("id, title, status, published_at, created_at, category")
      .eq("writer_id", writer.id)
      .order("created_at", { ascending: false })
      .limit(5),
    isEditor
      ? supabaseAdmin
          .from("news")
          .select("id, title, status, category, created_at")
          .eq("submitted_by", writer.id)
          .order("created_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),
  ]);

  const allArticles = articles ?? [];
  const allNews     = newsItems ?? [];

  const articleStats = {
    published: allArticles.filter((a: any) => a.status === "published").length,
    pending:   allArticles.filter((a: any) => a.status === "pending").length,
    drafts:    allArticles.filter((a: any) => a.status === "draft").length,
  };
  const newsStats = {
    approved: allNews.filter((n: any) => n.status === "approved").length,
    pending:  allNews.filter((n: any) => n.status === "pending").length,
    rejected: allNews.filter((n: any) => n.status === "rejected").length,
  };

  const articleStatusLabel: Record<string, string> = { draft: "مسودة", pending: "بانتظار النشر", published: "منشور" };
  const articleStatusColor: Record<string, string> = { draft: "#9A9070", pending: "#C9A844", published: "#6BCB77" };
  const newsStatusLabel: Record<string, string>    = { pending: "بانتظار المراجعة", approved: "مقبول", rejected: "مرفوض" };
  const newsStatusColor: Record<string, string>    = { pending: "#C9A844", approved: "#6BCB77", rejected: "#FF6B6B" };

  return (
    <div>
      <h1 className="text-2xl font-black mb-1" style={{ color: "#F0EAD6" }}>أهلاً، {writer.name}</h1>
      <p className="text-sm mb-8" style={{ color: "#9A9070" }}>{writer.title}</p>

      {/* Article stats */}
      <h2 className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: "#4A4030" }}>المقالات</h2>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "منشورة",            value: articleStats.published, color: "#6BCB77" },
          { label: "بانتظار المراجعة", value: articleStats.pending,   color: "#C9A844" },
          { label: "مسودات",            value: articleStats.drafts,    color: "#9A9070" },
        ].map((s) => (
          <div key={s.label} className="p-5 rounded-xl text-center" style={{ background: "#1A1810", border: "1px solid #2E2A18" }}>
            <p className="text-3xl font-black mb-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs" style={{ color: "#9A9070" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* News stats — editors only */}
      {isEditor && (
        <>
          <h2 className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: "#4A4030" }}>الأخبار المُرسلة</h2>
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "مقبولة",           value: newsStats.approved, color: "#6BCB77" },
              { label: "بانتظار المراجعة", value: newsStats.pending,  color: "#C9A844" },
              { label: "مرفوضة",           value: newsStats.rejected, color: "#FF6B6B" },
            ].map((s) => (
              <div key={s.label} className="p-5 rounded-xl text-center" style={{ background: "#1A1810", border: "1px solid #2E2A18" }}>
                <p className="text-3xl font-black mb-1" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs" style={{ color: "#9A9070" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Link href="/writer/articles/new" className="px-5 py-2.5 rounded-full text-sm font-bold" style={{ background: "linear-gradient(135deg, #C9A844, #9A7B28)", color: "#111008" }}>
          + كتابة مقال جديد
        </Link>
        {isEditor && (
          <Link href="/writer/news/new" className="px-5 py-2.5 rounded-full text-sm font-bold border" style={{ borderColor: "#4A90E2", color: "#4A90E2", background: "rgba(74,144,226,0.06)" }}>
            + إرسال خبر جديد
          </Link>
        )}
        <Link href="/writer/articles" className="px-5 py-2.5 rounded-full text-sm font-bold border" style={{ borderColor: "#2E2A18", color: "#9A9070" }}>
          جميع مقالاتي
        </Link>
      </div>

      {/* Recent articles */}
      {allArticles.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-bold mb-4" style={{ color: "#C9A844" }}>آخر المقالات</h2>
          <div className="space-y-3">
            {allArticles.map((article: any) => (
              <div key={article.id} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: "#1A1810", border: "1px solid #2E2A18" }}>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: "#F0EAD6" }}>{article.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#9A9070" }}>{formatArabicDate(article.published_at ?? article.created_at)}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ color: articleStatusColor[article.status], background: `${articleStatusColor[article.status]}18` }}>
                  {articleStatusLabel[article.status]}
                </span>
                <Link href={`/writer/articles/${article.id}/edit`} className="text-xs px-3 py-1.5 rounded-lg border shrink-0" style={{ borderColor: "#2E2A18", color: "#9A9070" }}>
                  تعديل
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent news — editors only */}
      {isEditor && allNews.length > 0 && (
        <div>
          <h2 className="text-base font-bold mb-4" style={{ color: "#4A90E2" }}>آخر الأخبار المُرسلة</h2>
          <div className="space-y-3">
            {allNews.map((item: any) => (
              <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: "#1A1810", border: "1px solid #2E2A18" }}>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: "#F0EAD6" }}>{item.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#9A9070" }}>{item.category} · {formatArabicDate(item.created_at)}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full shrink-0 font-medium" style={{ color: newsStatusColor[item.status], background: `${newsStatusColor[item.status]}18` }}>
                  {newsStatusLabel[item.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
