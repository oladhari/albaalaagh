import SectionHeader from "@/components/ui/SectionHeader";
import { supabaseAdmin } from "@/lib/supabase";
import NewsGrid from "./NewsGrid";

export const metadata = {
  title: "أخبار البلاغ | البلاغ",
  description: "أخبار تونس والعالم العربي من تحرير البلاغ",
};

export const revalidate = 300;

async function getNews() {
  const { data } = await supabaseAdmin
    .from("news")
    .select("*")
    .eq("source", "البلاغ")
    .eq("status", "approved")
    .order("published_at", { ascending: false });
  return data ?? [];
}

export default async function NewsPage() {
  const articles = await getNews();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SectionHeader
        title="أخبار البلاغ"
        subtitle="أخبار تونس والعالم العربي من تحرير البلاغ"
      />
      <NewsGrid articles={articles} />
    </div>
  );
}
