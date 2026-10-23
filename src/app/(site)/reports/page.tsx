import { supabaseAdmin } from "@/lib/supabase";
import { REPORT_CATEGORIES } from "@/lib/reports";
import ArticleCard from "@/components/ui/ArticleCard";
import SectionHeader from "@/components/ui/SectionHeader";
export const metadata = { title: "تقارير | البلاغ", description: "تقارير مكتوبة ومرئية من قناة البلاغ الرقمية: شرح وتحليل وبيانات ومصادر", alternates: { canonical: "/reports" } };
export const revalidate = 60;
export default async function ReportsPage() {
  const { data, error } = await supabaseAdmin.from("articles").select("*,writer:writers(*)").in("category", [...REPORT_CATEGORIES]).eq("published", true).eq("status", "published").order("published_at", { ascending: false }).limit(60);
  if (error) throw new Error("تعذّر تحميل التقارير");
  return <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10"><SectionHeader as="h1" title="تقارير" subtitle="تقارير مكتوبة ومرئية، بالشرح والبيانات والمصادر" />{data?.length ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{data.map(report => <ArticleCard key={report.id} article={report} />)}</div> : <p className="text-text-muted text-center py-16">نعمل على إعداد تقارير جديدة. ستظهر هنا بعد نشرها.</p>}</div>;
}
