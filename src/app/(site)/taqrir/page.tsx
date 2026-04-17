import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import { formatArabicDate } from "@/lib/utils";
import SectionHeader from "@/components/ui/SectionHeader";

export const revalidate = 300;

export const metadata = {
  title: "تقارير البلاغ | البلاغ",
  description: "جميع التقارير والمقالات الصحفية الصادرة عن تحرير البلاغ",
};

async function getEditorials() {
  const { data } = await supabaseAdmin
    .from("news")
    .select("*")
    .eq("source", "البلاغ")
    .eq("status", "approved")
    .order("published_at", { ascending: false });
  return data ?? [];
}

export default async function TaqrirListPage() {
  const editorials = await getEditorials();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SectionHeader
        title="تقارير البلاغ"
        subtitle="جميع التقارير الصحفية الصادرة عن فريق تحرير البلاغ"
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
              href={`/taqrir/${article.slug}`}
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
    </div>
  );
}
