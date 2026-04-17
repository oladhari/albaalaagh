import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import { formatArabicDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getStats() {
  const [pendingNews, approvedNews, editorials, articles, writers, guests] = await Promise.all([
    supabaseAdmin.from("news").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabaseAdmin.from("news").select("id", { count: "exact", head: true }).eq("status", "approved").neq("source", "البلاغ"),
    supabaseAdmin.from("news").select("id", { count: "exact", head: true }).eq("source", "البلاغ"),
    supabaseAdmin.from("articles").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabaseAdmin.from("writers").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("guests").select("id", { count: "exact", head: true }),
  ]);
  return {
    pendingNews:  pendingNews.count  ?? 0,
    approvedNews: approvedNews.count ?? 0,
    editorials:   editorials.count   ?? 0,
    articles:     articles.count     ?? 0,
    writers:      writers.count      ?? 0,
    guests:       guests.count       ?? 0,
  };
}

async function getRecentActivity() {
  const [recentNews, recentArticles, recentEditorials] = await Promise.all([
    supabaseAdmin
      .from("news")
      .select("id, title, source, published_at, status")
      .eq("status", "approved")
      .neq("source", "البلاغ")
      .order("published_at", { ascending: false })
      .limit(4),
    supabaseAdmin
      .from("articles")
      .select("id, title, slug, published_at, writer:writers(name)")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(3),
    supabaseAdmin
      .from("news")
      .select("id, title, slug, published_at")
      .eq("source", "البلاغ")
      .order("published_at", { ascending: false })
      .limit(3),
  ]);
  return {
    news:       recentNews.data       ?? [],
    articles:   recentArticles.data   ?? [],
    editorials: recentEditorials.data ?? [],
  };
}

const QUICK_ACTIONS = [
  { label: "إضافة مقال جديد", href: "/admin/articles/new", primary: true },
  { label: "تقارير البلاغ",   href: "/admin/news",         primary: true },
  { label: "إضافة كاتب",      href: "/admin/writers/new",  primary: false },
  { label: "مراجعة الأخبار",  href: "/admin/news",         primary: false },
];

export default async function AdminDashboard() {
  const [stats, activity] = await Promise.all([getStats(), getRecentActivity()]);

  const STATS = [
    { label: "أخبار بانتظار الموافقة", value: String(stats.pendingNews),  href: "/admin/news",     color: stats.pendingNews > 0 ? "#FF6B6B" : "#9A9070" },
    { label: "أخبار منشورة",           value: String(stats.approvedNews), href: "/admin/news?status=approved", color: "#C9A844" },
    { label: "تقارير البلاغ",          value: String(stats.editorials),   href: "/admin/news?status=approved", color: "#4D96FF" },
    { label: "مقالات منشورة",          value: String(stats.articles),     href: "/admin/articles", color: "#6BCB77" },
    { label: "كتّاب مسجّلون",          value: String(stats.writers),      href: "/admin/writers",  color: "#C9A844" },
    { label: "ضيوف مسجّلون",           value: String(stats.guests),       href: "/admin/guests",   color: "#9A9070" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-black mb-8" style={{ color: "#F0EAD6" }}>لوحة التحكم</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-10">
        {STATS.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="p-4 rounded-xl card-hover"
            style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
          >
            <p className="text-3xl font-black mb-1" style={{ color: stat.color }}>
              {stat.value}
            </p>
            <p className="text-xs leading-snug" style={{ color: "#9A9070" }}>{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="p-5 rounded-xl mb-8" style={{ background: "#1A1810", border: "1px solid #2E2A18" }}>
        <h2 className="text-xs font-bold mb-3" style={{ color: "#C9A844" }}>إجراءات سريعة</h2>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="px-4 py-2 rounded-full text-sm font-bold transition-all"
              style={
                action.primary
                  ? { background: "linear-gradient(135deg, #C9A844, #9A7B28)", color: "#111008" }
                  : { border: "1px solid #2E2A18", color: "#9A9070" }
              }
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Pending news alert */}
        {stats.pendingNews > 0 && (
          <div className="p-4 rounded-xl lg:col-span-3" style={{ background: "rgba(255,107,107,0.06)", border: "1px solid rgba(255,107,107,0.25)" }}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold" style={{ color: "#FF6B6B" }}>
                ⚠️ {stats.pendingNews} خبر بانتظار مراجعتك
              </span>
              <Link href="/admin/news" className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: "rgba(255,107,107,0.15)", color: "#FF6B6B" }}>
                مراجعة الآن ←
              </Link>
            </div>
          </div>
        )}

        {/* Recent editorials */}
        <div className="p-4 rounded-xl" style={{ background: "#1A1810", border: "1px solid #2E2A18" }}>
          <h3 className="text-xs font-bold mb-3" style={{ color: "#4D96FF" }}>آخر تقارير البلاغ</h3>
          {activity.editorials.length === 0 ? (
            <p className="text-xs" style={{ color: "#9A9070" }}>لا توجد تقارير بعد</p>
          ) : (
            <div className="space-y-2">
              {activity.editorials.map((e: any) => (
                <div key={e.id}>
                  <a
                    href={`/taqrir/${e.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium line-clamp-2 hover:text-[#C9A844] transition-colors"
                    style={{ color: "#F0EAD6" }}
                  >
                    {e.title} ↗
                  </a>
                  <p className="text-xs mt-0.5" style={{ color: "#9A9070" }}>{formatArabicDate(e.published_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent articles */}
        <div className="p-4 rounded-xl" style={{ background: "#1A1810", border: "1px solid #2E2A18" }}>
          <h3 className="text-xs font-bold mb-3" style={{ color: "#6BCB77" }}>آخر مقالات الكتّاب</h3>
          {activity.articles.length === 0 ? (
            <p className="text-xs" style={{ color: "#9A9070" }}>لا توجد مقالات بعد</p>
          ) : (
            <div className="space-y-2">
              {activity.articles.map((a: any) => (
                <div key={a.id}>
                  <a
                    href={`/articles/${a.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium line-clamp-2 hover:text-[#C9A844] transition-colors"
                    style={{ color: "#F0EAD6" }}
                  >
                    {a.title} ↗
                  </a>
                  <p className="text-xs mt-0.5" style={{ color: "#9A9070" }}>
                    {a.writer?.name} · {formatArabicDate(a.published_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent approved news */}
        <div className="p-4 rounded-xl" style={{ background: "#1A1810", border: "1px solid #2E2A18" }}>
          <h3 className="text-xs font-bold mb-3" style={{ color: "#C9A844" }}>آخر الأخبار المنشورة</h3>
          {activity.news.length === 0 ? (
            <p className="text-xs" style={{ color: "#9A9070" }}>لا توجد أخبار منشورة</p>
          ) : (
            <div className="space-y-2">
              {activity.news.map((n: any) => (
                <div key={n.id}>
                  <p className="text-xs font-medium line-clamp-2" style={{ color: "#F0EAD6" }}>{n.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#9A9070" }}>
                    {n.source} · {formatArabicDate(n.published_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
