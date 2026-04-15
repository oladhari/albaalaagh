import Link from "next/link";
import { formatArabicDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
import { supabaseAdmin } from "@/lib/supabase";
import PublishButton from "./PublishButton";

async function getArticles(status: string) {
  const { data } = await supabaseAdmin
    .from("articles")
    .select("*, writer:writers(name)")
    .eq("status", status)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "pending" } = await searchParams;
  const articles = await getArticles(tab);

  const tabs = [
    { key: "pending",   label: "بانتظار النشر" },
    { key: "published", label: "منشورة"          },
    { key: "draft",     label: "مسودات"           },
  ];

  const statusColor: Record<string, string> = {
    draft: "#9A9070", pending: "#C9A844", published: "#6BCB77",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black" style={{ color: "#F0EAD6" }}>المقالات</h1>
        <Link
          href="/admin/articles/new"
          className="px-5 py-2 rounded-full text-sm font-bold"
          style={{ background: "linear-gradient(135deg, #C9A844, #9A7B28)", color: "#111008" }}
        >
          + إضافة مقال
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin/articles?tab=${t.key}`}
            className="px-4 py-2 rounded-full text-sm font-medium border transition-all"
            style={{
              borderColor: tab === t.key ? "#C9A844" : "#2E2A18",
              color: tab === t.key ? "#C9A844" : "#9A9070",
              background: tab === t.key ? "rgba(201,168,68,0.08)" : "transparent",
            }}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-sm" style={{ color: "#9A9070" }}>
            {tab === "pending" ? "لا توجد مقالات بانتظار النشر" : "لا توجد مقالات"}
          </p>
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
                <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                    {article.status === "published" ? "منشور" : article.status === "pending" ? "بانتظار النشر" : "مسودة"}
                  </span>
                </div>
                <p className="font-semibold text-sm" style={{ color: "#F0EAD6" }}>{article.title}</p>
                <div className="flex items-center gap-3 mt-1">
                  {article.writer && (
                    <span className="text-xs" style={{ color: "#9A9070" }}>{article.writer.name}</span>
                  )}
                  <span className="text-xs" style={{ color: "#9A9070" }}>
                    {formatArabicDate(article.published_at || article.created_at)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 shrink-0">
                {(tab === "pending" || tab === "draft") && (
                  <PublishButton articleId={article.id} />
                )}
                <Link
                  href={`/admin/articles/${article.id}/edit`}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                  style={{ borderColor: "#2E2A18", color: "#9A9070" }}
                >
                  تعديل
                </Link>
                {article.status === "published" && (
                  <Link
                    href={`/articles/${article.slug}`}
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
