import SectionHeader from "@/components/ui/SectionHeader";
import { supabaseAdmin } from "@/lib/supabase";
import NewsGrid from "./NewsGrid";

export const metadata = {
  title: "الأخبار | البلاغ",
  description: "آخر الأخبار التونسية والعربية",
};

export const revalidate = 300;

async function getNews() {
  const { data } = await supabaseAdmin
    .from("news")
    .select("*")
    .neq("status", "rejected")
    .order("published_at", { ascending: false })
    .limit(90);
  return data ?? [];
}

export default async function NewsPage() {
  const all = await getNews();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SectionHeader
        title="الأخبار"
        subtitle="أخبار منتقاة من تونس والعالم العربي"
      />
      <NewsGrid articles={all} />
    </div>
  );
}
