import Link from "next/link";
import { formatArabicDate } from "@/lib/utils";
import type { Article } from "@/types";

// TODO: fetch from Supabase
const mockArticles: Article[] = Array.from({ length: 6 }, (_, i) => ({
  id: String(i + 1),
  slug: `article-${i + 1}`,
  title: ["أزمة الدولة في تونس", "الفكر الإسلامي والحوكمة", "الاقتصاد السياسي"][i % 3],
  excerpt: "مقال تحليلي معمق...",
  content: "",
  category: ["سياسة", "فكر وفلسفة", "اقتصاد"][i % 3],
  published: i % 3 !== 0,
  published_at: new Date(Date.now() - i * 86400000 * 3).toISOString(),
  created_at: new Date().toISOString(),
  writer: {
    id: `w${i}`, name: ["د. محمد العربي", "الشيخ عبدالله", "أ. سامي"][i % 3],
    title: "كاتب", bio: "", created_at: "",
  },
}));

export default function AdminArticlesPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black" style={{ color: "#F0EAD6" }}>المقالات</h1>
        <Link
          href="/admin/articles/new"
          className="px-5 py-2 rounded-full text-sm font-bold"
          style={{ background: "linear-gradient(135deg, #C9A844, #9A7B28)", color: "#111008" }}
        >
          + إضافة مقال
        </Link>
      </div>

      <div className="space-y-3">
        {mockArticles.map((article) => (
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
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: article.published ? "rgba(107,203,119,0.12)" : "rgba(255,107,107,0.12)",
                    color: article.published ? "#6BCB77" : "#FF6B6B",
                  }}
                >
                  {article.published ? "منشور" : "مسودة"}
                </span>
              </div>
              <p className="font-semibold text-sm" style={{ color: "#F0EAD6" }}>{article.title}</p>
              <div className="flex items-center gap-3 mt-1">
                {article.writer && (
                  <span className="text-xs" style={{ color: "#9A9070" }}>{article.writer.name}</span>
                )}
                <span className="text-xs" style={{ color: "#9A9070" }}>
                  {formatArabicDate(article.published_at)}
                </span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link
                href={`/admin/articles/${article.id}/edit`}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                style={{ borderColor: "#2E2A18", color: "#9A9070" }}
              >
                تعديل
              </Link>
              <Link
                href={`/articles/${article.slug}`}
                target="_blank"
                className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                style={{ borderColor: "#2E2A18", color: "#9A9070" }}
              >
                معاينة ↗
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
