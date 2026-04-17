import SectionHeader from "@/components/ui/SectionHeader";
import { supabaseAdmin } from "@/lib/supabase";
import NewsGrid from "./NewsGrid";

export const metadata = {
  title: "الأخبار | البلاغ",
  description: "آخر الأخبار التونسية والعربية",
};

export const revalidate = 300;

async function getNews() {
  const [regularRes, editorialsRes] = await Promise.all([
    supabaseAdmin
      .from("news")
      .select("*")
      .neq("status", "rejected")
      .neq("source", "البلاغ")
      .order("published_at", { ascending: false })
      .limit(90),
    supabaseAdmin
      .from("news")
      .select("*")
      .eq("source", "البلاغ")
      .eq("status", "approved")
      .order("published_at", { ascending: false }),
  ]);
  return {
    regular:    regularRes.data    ?? [],
    editorials: editorialsRes.data ?? [],
  };
}

export default async function NewsPage() {
  const { regular, editorials } = await getNews();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SectionHeader
        title="الأخبار"
        subtitle="أخبار منتقاة من تونس والعالم العربي"
      />
      <NewsGrid articles={regular} editorials={editorials} />
    </div>
  );
}
