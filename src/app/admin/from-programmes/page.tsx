import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import { PROGRAMME_ARTICLE_CATEGORY, programmeArticlePath } from "@/lib/programme-articles";
export const dynamic = "force-dynamic";
export default async function AdminProgrammeArticlesPage() {
  const { data, error } = await supabaseAdmin.from("articles").select("id,slug,title,status,category").in("category", [PROGRAMME_ARTICLE_CATEGORY]).order("created_at", { ascending: false });
  if (error) throw new Error("تعذّر تحميل مواد البرامج");
  return <div><h1 className="text-2xl font-bold mb-5">إدارة «من برامجنا»</h1><p className="text-text-muted mb-6">قراءات تحريرية للحلقات، مع نسبة الأقوال لأصحابها وروابط التوقيت. أدرج اسم البرنامج والمشاركين وتاريخ البث في بطاقة الحلقة، وراجع النص قبل النشر.</p><Link className="text-gold" href="/admin/articles/new?category=programme">+ إضافة قراءة في حلقة</Link><div className="mt-6 space-y-4">{data?.map(r => <div key={r.id} className="border border-border rounded-xl p-4"><p className="font-bold mb-3">{r.title}</p><p className="text-sm mb-3">{r.status === "published" ? "منشور" : "مسودة / قيد التحرير"}</p><div className="flex flex-wrap gap-5 text-gold text-sm"><Link href={`${programmeArticlePath(r)}?preview=1`}>معاينة</Link><Link href={`/admin/articles/${r.id}/edit`}>تحرير</Link></div></div>)}</div></div>;
}
