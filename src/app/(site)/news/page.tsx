import NewsCard from "@/components/ui/NewsCard";
import SectionHeader from "@/components/ui/SectionHeader";
import type { NewsArticle } from "@/types";

export const metadata = {
  title: "الأخبار | البلاغ",
  description: "آخر الأخبار التونسية والعربية المنتقاة من البلاغ",
};

// TODO: Replace with Supabase query: supabase.from('news').select('*').eq('status','approved').order('published_at',{ascending:false})
const mockNews: NewsArticle[] = Array.from({ length: 12 }, (_, i) => ({
  id: String(i + 1),
  title: [
    "تونس: اجتماع طارئ للحكومة لمناقشة الأوضاع الاقتصادية",
    "منظمات حقوق الإنسان تطالب بالإفراج عن المعتقلين السياسيين",
    "البرلمان يصادق على مشروع قانون الميزانية التكميلية",
    "الاتحاد الأوروبي يعبر عن قلقه إزاء الأوضاع في تونس",
    "انتخابات محلية مرتقبة وسط جدل واسع حول قانون الانتخابات",
    "حركة النهضة تدعو إلى حوار وطني شامل",
    "الأزمة الاقتصادية تتفاقم وسط ارتفاع نسب التضخم",
    "المحكمة الدستورية تنظر في طعون المعارضة",
    "تصريحات رئاسية جديدة حول ملف الإصلاح السياسي",
    "نشطاء يتحدون قرار حل الأحزاب السياسية",
    "الجزيرة: تقرير موسع عن المشهد السياسي التونسي",
    "خبراء يحذرون من تدهور الأوضاع الاجتماعية",
  ][i],
  excerpt: "",
  url: "#",
  source: ["الجزيرة", "موزاييك FM", "نواة", "بزنس نيوز", "العربي الجديد"][i % 5],
  image_url: i % 3 === 0 ? `https://picsum.photos/seed/${i + 10}/400/250` : undefined,
  published_at: new Date(Date.now() - i * 3600000 * 2).toISOString(),
  status: "approved",
  category: ["سياسة", "اقتصاد", "حقوق", "برلمان"][i % 4],
  created_at: new Date().toISOString(),
}));

const SOURCES = ["الكل", "الجزيرة", "موزاييك FM", "نواة", "بزنس نيوز", "العربي الجديد"];
const CATEGORIES = ["الكل", "سياسة", "اقتصاد", "حقوق", "برلمان"];

export default function NewsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SectionHeader
        title="الأخبار"
        subtitle="أخبار منتقاة من تونس والعالم العربي"
      />

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters sidebar */}
        <aside className="lg:w-52 shrink-0">
          <div
            className="rounded-xl p-4 sticky top-20"
            style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
          >
            <h3 className="text-xs font-bold mb-3" style={{ color: "#C9A844" }}>المصادر</h3>
            <ul className="space-y-1 mb-5">
              {SOURCES.map((s) => (
                <li key={s}>
                  <button
                    className="w-full text-right px-3 py-1.5 rounded-lg text-sm transition-colors"
                    style={{ color: s === "الكل" ? "#C9A844" : "#9A9070" }}
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
            <hr style={{ borderColor: "#2E2A18" }} className="mb-4" />
            <h3 className="text-xs font-bold mb-3" style={{ color: "#C9A844" }}>الأقسام</h3>
            <ul className="space-y-1">
              {CATEGORIES.map((c) => (
                <li key={c}>
                  <button
                    className="w-full text-right px-3 py-1.5 rounded-lg text-sm transition-colors"
                    style={{ color: "#9A9070" }}
                  >
                    {c}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* News list */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {mockNews.map((article) => (
            <NewsCard key={article.id} article={article} />
          ))}
        </div>
      </div>
    </div>
  );
}
