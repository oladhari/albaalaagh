import ArticleCard from "@/components/ui/ArticleCard";
import SectionHeader from "@/components/ui/SectionHeader";
import { supabaseAdmin } from "@/lib/supabase";

export const metadata = {
  title: "المقالات | البلاغ",
  description: "مقالات وتحليلات من أقلام كتّاب ومفكرين متميزين",
};

export const revalidate = 300;

async function getArticles() {
  const { data } = await supabaseAdmin
    .from("articles")
    .select("*, writer:writers(*)")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(60);
  return data ?? [];
}

export default async function ArticlesPage() {
  const articles = await getArticles();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SectionHeader
        title="المقالات"
        subtitle="قراءات وتحليلات من أقلام كتّاب ومفكرين متميزين"
      />

      {articles.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-lg mb-2" style={{ color: "#9A9070" }}>لا توجد مقالات منشورة بعد</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article: any) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
