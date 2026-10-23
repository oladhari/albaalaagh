import { reportPath } from "@/lib/reports";
import Link from "next/link";
import { formatReportContent } from "@/lib/sanitize";
import ShareButtons from "@/components/ui/ShareButtons";

export interface ReportRecord {
  id: string; slug: string; title: string; excerpt: string; content: string;
  cover_image?: string | null; category: string; published_at?: string | null;
}
export default function ReportBody({ report, preview = false }: { report: ReportRecord; preview?: boolean }) {
  return (
    <article className="report-page max-w-4xl mx-auto px-4 sm:px-6 py-10" dir="rtl">
      {preview && <aside className="report-draft" role="status">معاينة مسودة — لم يُنشر هذا التقرير. <Link href={`/admin/articles/${report.id}/edit`}>تحرير المسودة</Link></aside>}
      <nav aria-label="مسار الصفحة" className="text-sm text-text-muted mb-6"><Link href="/">الرئيسية</Link> / <Link href="/reports">تقارير</Link></nav>
      <p className="text-gold text-sm mb-3">{report.category === "تقارير فيديو" ? "تقرير فيديو" : "تقرير تحليلي"}</p>
      <h1 className="text-3xl sm:text-4xl font-black leading-snug text-text mb-5">{report.title}</h1>
      <p className="text-lg leading-loose text-text-muted mb-6">{report.excerpt}</p>
      <div className="flex flex-wrap gap-4 text-sm border-y border-border py-4 mb-7"><strong className="text-gold">إعداد: قناة البلاغ الرقمية</strong>{report.published_at && <time dateTime={report.published_at}>{new Date(report.published_at).toLocaleDateString("ar-TN-u-nu-latn")}</time>}</div>
      {!preview && <ShareButtons title={report.title} url={`https://www.albaalaagh.com${reportPath(report)}`} />}
      {report.cover_image && <figure className="mb-9"><img src={report.cover_image} alt={report.title} className="w-full rounded-xl" width={1280} height={720} fetchPriority="high" /></figure>}
      <div className="article-prose report-prose text-text-body" dangerouslySetInnerHTML={{ __html: formatReportContent(report.content) }} />
      <div className="mt-12 border-t border-border pt-6"><Link href="/reports" className="text-gold">العودة إلى التقارير</Link></div>
    </article>
  );
}
