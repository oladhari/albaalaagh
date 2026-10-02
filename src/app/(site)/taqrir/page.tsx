import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import { formatArabicDate } from "@/lib/utils";
import SectionHeader from "@/components/ui/SectionHeader";
import { newsPath } from "@/lib/public-urls";

export const revalidate = 300;

export const metadata = {
  title: "تقارير البلاغ | البلاغ",
  description: "جميع التقارير والمقالات الصحفية الصادرة عن تحرير البلاغ",
  alternates: { canonical: "/taqrir" },
};

const PAGE_SIZE = 24;

async function getEditorials(page: number) {
  const from = (page - 1) * PAGE_SIZE;
  const { data, count } = await supabaseAdmin
    .from("news")
    .select("*, news_citations!inner(id)", { count: "exact" })
    .eq("source", "البلاغ")
    .eq("status", "approved")
    .order("published_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  return {
    editorials: data ?? [],
    totalPages: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
  };
}

export default async function TaqrirListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const { editorials, totalPages } = await getEditorials(page);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SectionHeader
        as="h1"
        title="تقارير البلاغ"
        subtitle={`التقارير الصحفية الموثقة بالمصادر من فريق تحرير البلاغ — الصفحة ${page} من ${totalPages}`}
      />

      {editorials.length === 0 ? (
        <div className="text-center py-20">
          <p style={{ color: "#9A9070" }}>لا توجد تقارير بعد</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {editorials.map((article) => (
            <Link
              key={article.id}
              href={newsPath(article)}
              className="group flex flex-col rounded-xl overflow-hidden transition-all card-hover"
              style={{ background: "#1A1810", border: "1px solid #C9A844" }}
            >
              {article.image_url && (
                <div className="overflow-hidden" style={{ aspectRatio: "16/9" }}>
                  <img
                    src={article.image_url}
                    alt={article.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              )}
              <div className="flex flex-col flex-1 p-4 gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: "rgba(201,168,68,0.15)", color: "#C9A844" }}
                  >
                    تقرير البلاغ
                  </span>
                  {article.category && (
                    <span className="text-xs" style={{ color: "#9A9070" }}>{article.category}</span>
                  )}
                </div>
                <h2 className="text-sm font-bold leading-snug flex-1" style={{ color: "#F0EAD6" }}>
                  {article.title}
                </h2>
                {article.excerpt && (
                  <p className="text-xs line-clamp-2" style={{ color: "#9A9070" }}>
                    {article.excerpt}
                  </p>
                )}
                <p className="text-xs mt-auto pt-2" style={{ color: "#9A9070", borderTop: "1px solid #2E2A18" }}>
                  {formatArabicDate(article.published_at)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-3 mt-10" aria-label="صفحات تقارير البلاغ">
          {page > 1 && (
            <Link
              href={`/taqrir?page=${page - 1}`}
              className="px-5 py-2 rounded-full text-sm font-bold"
              style={{ border: "1px solid #2E2A18", color: "#C9A844" }}
            >
              الصفحة السابقة
            </Link>
          )}
          <span className="text-sm" style={{ color: "#9A9070" }}>
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/taqrir?page=${page + 1}`}
              className="px-5 py-2 rounded-full text-sm font-bold"
              style={{ border: "1px solid #2E2A18", color: "#C9A844" }}
            >
              الصفحة التالية
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
