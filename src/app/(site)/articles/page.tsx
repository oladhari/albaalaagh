import ArticleCard from "@/components/ui/ArticleCard";
import SectionHeader from "@/components/ui/SectionHeader";
import type { Article } from "@/types";
import { ARTICLE_CATEGORIES } from "@/types";

export const metadata = {
  title: "المقالات | البلاغ",
  description: "مقالات وتحليلات من أقلام كتّاب ومفكرين متميزين",
};

// TODO: Replace with Supabase query
const mockArticles: Article[] = Array.from({ length: 9 }, (_, i) => ({
  id: String(i + 1),
  slug: `article-${i + 1}`,
  title: [
    "أزمة الدولة في تونس: المشروعية والسلطة",
    "الفكر الإسلامي وإشكاليات الحوكمة المعاصرة",
    "الاقتصاد السياسي وأثره في صناعة القرار",
    "تجربة الديمقراطية التونسية: دروس وعبر",
    "دور العلماء في مواجهة الاستبداد عبر التاريخ",
    "المعارضة السياسية: الأخلاق والاستراتيجية",
    "تونس والربيع العربي: قراءة في المسار",
    "الهوية والانتماء في زمن العولمة",
    "مستقبل العلاقات التونسية الأوروبية",
  ][i],
  excerpt: "مقال تحليلي معمق يتناول أبرز التحولات والإشكاليات السياسية والفكرية في المشهد التونسي والعربي الراهن...",
  content: "",
  cover_image: i % 2 === 0 ? `https://picsum.photos/seed/${i + 20}/800/450` : undefined,
  category: (ARTICLE_CATEGORIES as unknown as string[])[i % ARTICLE_CATEGORIES.length],
  published: true,
  published_at: new Date(Date.now() - i * 86400000 * 2).toISOString(),
  created_at: new Date().toISOString(),
  writer: {
    id: `w${i + 1}`,
    name: ["د. محمد العربي", "الشيخ عبدالله التونسي", "أ. سامي الوسلاتي", "د. فاطمة الزهراء"][i % 4],
    title: ["أستاذ العلوم السياسية", "عالم وفقيه", "خبير اقتصادي", "باحثة في الفكر الإسلامي"][i % 4],
    bio: "",
    created_at: "",
  },
}));

export default function ArticlesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SectionHeader
        title="المقالات"
        subtitle="قراءات وتحليلات من أقلام كتّاب ومفكرين متميزين"
      />

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          className="px-4 py-1.5 rounded-full text-sm font-medium border"
          style={{ borderColor: "#C9A844", color: "#C9A844", background: "rgba(201,168,68,0.08)" }}
        >
          الكل
        </button>
        {ARTICLE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            className="px-4 py-1.5 rounded-full text-sm font-medium border transition-colors"
            style={{ borderColor: "#2E2A18", color: "#9A9070" }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Articles grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockArticles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
}
