import { supabaseAdmin } from "@/lib/supabase";
import { PROGRAMME_ARTICLE_CATEGORY } from "@/lib/programme-articles";
import ArticleCard from "@/components/ui/ArticleCard";
import SectionHeader from "@/components/ui/SectionHeader";
export const metadata = { title: "من برامجنا | البلاغ", description: "قراءات تحريرية في برامج البلاغ وحواراتها: الأفكار والحجج ومقاطع الحلقة الأصلية", alternates: { canonical: "/from-programmes" } };
export const revalidate = 60;
export default async function ProgrammeArticlesPage() {
  const { data, error } = await supabaseAdmin.from("articles").select("*,writer:writers(*)").in("category", [PROGRAMME_ARTICLE_CATEGORY]).eq("published", true).eq("status", "published").order("published_at", { ascending: false }).limit(60);
  if (error) throw new Error("تعذّر تحميل مواد البرامج");
  return <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10"><SectionHeader as="h1" title="من برامجنا" subtitle="أبرز الأفكار من حواراتنا، في مقالات تقرؤها وتشاهد معها الحلقة الأصلية" />{data?.length ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{data.map(report => <ArticleCard key={report.id} article={report} />)}</div> : <p className="text-text-muted text-center py-16">نعمل على إعداد قراءات في برامجنا. ستظهر هنا بعد نشرها.</p>}</div>;
}
