import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import { REPORT_CATEGORIES, reportPath } from "@/lib/reports";
export const dynamic = "force-dynamic";
export default async function AdminReportsPage() {
  const { data, error } = await supabaseAdmin.from("articles").select("id,slug,title,status,category").in("category", [...REPORT_CATEGORIES]).order("created_at", { ascending: false });
  if (error) throw new Error("تعذّر تحميل التقارير");
  return <div><h1 className="text-2xl font-bold mb-5">إدارة التقارير</h1><p className="text-text-muted mb-6">استعمل محرر المقالات واختر «تقارير» أو «تقارير فيديو». يمكن إضافة الصور والجداول والمصادر وملفات PDF داخل المحتوى.</p><Link className="text-gold" href="/admin/articles/new?category=report">+ إضافة تقرير</Link><div className="mt-6 space-y-4">{data?.map(r => <div key={r.id} className="border border-border rounded-xl p-4"><p className="font-bold mb-3">{r.title}</p><p className="text-sm mb-3">{r.status === "published" ? "منشور" : "مسودة / قيد التحرير"}</p><div className="flex flex-wrap gap-5 text-gold text-sm"><Link href={`${reportPath(r)}?preview=1`}>معاينة</Link><Link href={`/admin/articles/${r.id}/edit`}>تحرير</Link></div></div>)}</div></div>;
}
