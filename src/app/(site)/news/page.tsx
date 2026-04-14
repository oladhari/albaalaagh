import NewsCard from "@/components/ui/NewsCard";
import SectionHeader from "@/components/ui/SectionHeader";
import { supabaseAdmin } from "@/lib/supabase";

export const metadata = {
  title: "الأخبار | البلاغ",
  description: "آخر الأخبار التونسية والعربية",
};

export const revalidate = 300;

const TUNISIA_SOURCES  = ["تيوميديا", "موزاييك FM", "نواة"];
const ARAB_SOURCES     = ["عربي21", "الجزيرة", "العربي الجديد", "القدس العربي"];

async function getNews() {
  const { data } = await supabaseAdmin
    .from("news")
    .select("*")
    .neq("status", "rejected")   // show everything except manually rejected
    .order("published_at", { ascending: false })
    .limit(60);

  const all = data ?? [];

  // Split into groups
  const tunisia  = all.filter((n: any) => TUNISIA_SOURCES.includes(n.source));
  const arab     = all.filter((n: any) => ARAB_SOURCES.includes(n.source));
  const other    = all.filter((n: any) => !TUNISIA_SOURCES.includes(n.source) && !ARAB_SOURCES.includes(n.source));

  return { tunisia, arab, other, all };
}

export default async function NewsPage() {
  const { tunisia, arab, other, all } = await getNews();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SectionHeader
        title="الأخبار"
        subtitle="أخبار منتقاة من تونس والعالم العربي"
      />

      {all.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-lg mb-2" style={{ color: "#9A9070" }}>لا توجد أخبار منشورة بعد</p>
          <p className="text-sm" style={{ color: "#9A9070" }}>
            توجه إلى{" "}
            <a href="/admin/news" style={{ color: "#C9A844" }}>لوحة الإدارة</a>
            {" "}للموافقة على الأخبار
          </p>
        </div>
      ) : (
        <div className="space-y-12">

          {/* ── Tunisia news ── */}
          {tunisia.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <span className="text-lg">🇹🇳</span>
                <h2 className="text-xl font-black" style={{ color: "#C9A844" }}>أخبار تونس</h2>
                <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, #2E2A18, transparent)" }} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tunisia.map((article: any) => (
                  <NewsCard key={article.id} article={article} />
                ))}
              </div>
            </div>
          )}

          {/* ── Arab world news ── */}
          {arab.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <span className="text-lg">🌍</span>
                <h2 className="text-xl font-black" style={{ color: "#C9A844" }}>أخبار العالم العربي</h2>
                <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, #2E2A18, transparent)" }} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {arab.map((article: any) => (
                  <NewsCard key={article.id} article={article} />
                ))}
              </div>
            </div>
          )}

          {/* ── Other ── */}
          {other.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <span className="text-lg">🌐</span>
                <h2 className="text-xl font-black" style={{ color: "#C9A844" }}>أخبار دولية</h2>
                <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, #2E2A18, transparent)" }} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {other.map((article: any) => (
                  <NewsCard key={article.id} article={article} />
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
