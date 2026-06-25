import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import ArticleCard from "@/components/ui/ArticleCard";
import NewsCard from "@/components/ui/NewsCard";
import SectionHeader from "@/components/ui/SectionHeader";
import SocialBar from "@/components/sections/SocialBar";
import NewsTicker from "@/components/sections/NewsTicker";
import LiveBanner from "@/components/sections/LiveBanner";
import PlaylistsSection from "@/components/sections/PlaylistsSection";

export const revalidate = 120;

async function getLatestNews() {
  const { data } = await supabaseAdmin
    .from("news")
    .select("*")
    .eq("source", "البلاغ")
    .eq("status", "approved")
    .order("published_at", { ascending: false })
    .limit(6);
  return data ?? [];
}

async function getLatestArticles() {
  const { data } = await supabaseAdmin
    .from("articles")
    .select("*, writer:writers(*)")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(3);
  return data ?? [];
}

async function getPlaylistsWithVideos() {
  const [{ data: playlists }, { data: videos }] = await Promise.all([
    supabaseAdmin.from("playlists").select("id, name").order("display_order", { ascending: true }),
    supabaseAdmin
      .from("site_videos")
      .select("id, playlist_id, thumbnail_url, published_at")
      .eq("published", true)
      .order("published_at", { ascending: false, nullsFirst: false }),
  ]);

  if (!playlists || !videos) return [];

  // Group videos by playlist_id
  const byPlaylist = new Map<string, { thumbnail: string | null; count: number }>();
  for (const v of videos) {
    if (!v.playlist_id) continue;
    if (!byPlaylist.has(v.playlist_id)) {
      byPlaylist.set(v.playlist_id, { thumbnail: v.thumbnail_url, count: 0 });
    }
    byPlaylist.get(v.playlist_id)!.count++;
  }

  return playlists
    .filter(p => byPlaylist.has(p.id))
    .map(p => ({
      id: p.id,
      name: p.name,
      thumbnail: byPlaylist.get(p.id)!.thumbnail,
      count: byPlaylist.get(p.id)!.count,
    }));
}

async function getArticlesCount() {
  const { count } = await supabaseAdmin
    .from("articles")
    .select("id", { count: "exact", head: true })
    .eq("status", "published");
  return count ?? 0;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

export default async function HomePage() {
  // YouTube channel suspended — skip YouTube API calls to avoid errors
  const [news, articles, articlesCount, playlistsWithVideos] = await Promise.all([
    getLatestNews(),
    getLatestArticles(),
    getArticlesCount(),
    getPlaylistsWithVideos(),
  ]);

  const tickerItems = news.length > 0
    ? news.map((n: any) => n.title)
    : ["مرحباً بكم في البلاغ — منبر سياسي تونسي مستقل"];

  return (
    <>
      {/* News Ticker */}
      <NewsTicker items={tickerItems} />

      {/* Live Stream Banner — Twitch embed, always visible */}
      <LiveBanner />

      {/* ── Hero ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Site summary hero */}
          <div className="lg:col-span-2">
            <div
              className="rounded-2xl overflow-hidden relative flex flex-col justify-between p-6 sm:p-8 lg:p-10 min-h-[280px] sm:min-h-[340px]"
              style={{
                background: "linear-gradient(135deg, #1A1810 0%, #111008 100%)",
                border: "1px solid #2E2A18",
              }}
            >
              {/* Decorative corner */}
              <div
                className="absolute top-0 left-0 w-40 h-40 opacity-10 rounded-br-full"
                style={{ background: "radial-gradient(circle, #C9A844, transparent)" }}
              />
              <div
                className="absolute bottom-0 right-0 w-60 h-60 opacity-5 rounded-tl-full"
                style={{ background: "radial-gradient(circle, #C9A844, transparent)" }}
              />

              {/* Logo + tagline */}
              <div className="relative">
                <h1
                  className="logo-3d text-4xl sm:text-5xl lg:text-6xl font-black mb-4 sm:mb-5"
                  style={{ paddingBottom: "0.15em", lineHeight: "1.2" }}
                >
                  البلاغ
                </h1>
                <p className="text-sm sm:text-base leading-relaxed mb-5 sm:mb-6" style={{ color: "#9A9070", maxWidth: "480px" }}>
                  منبر إعلامي تونسي مستقل يؤمن بحرية الكلمة — نُجري حوارات معمقة مع شخصيات سياسية وفكرية بارزة، ونواكب الحدث التونسي والعربي والدولي.
                </p>

                {/* Section links */}
                <div className="flex flex-wrap gap-3">
                  {[
                    {
                      href: "/interviews", label: "المقابلات",
                      icon: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current shrink-0"><path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm6.5 9a1 1 0 0 1 1 1 7.5 7.5 0 0 1-6.5 7.42V21h3a1 1 0 0 1 0 2H8a1 1 0 0 1 0-2h3v-2.58A7.5 7.5 0 0 1 4.5 11a1 1 0 0 1 2 0 5.5 5.5 0 0 0 11 0 1 1 0 0 1 1-1z"/></svg>,
                    },
                    {
                      href: "/news", label: "الأخبار",
                      icon: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current shrink-0"><path d="M20 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1zm-1 16H5V5h14v14zM7 7h10v2H7zm0 4h10v2H7zm0 4h7v2H7z"/></svg>,
                    },
                    {
                      href: "/articles", label: "المقالات",
                      icon: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current shrink-0"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>,
                    },
                    {
                      href: "/qadaya-sharia", label: "قضايا شرعية",
                      icon: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current shrink-0"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>,
                    },
                    {
                      href: "/guests", label: "الضيوف",
                      icon: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current shrink-0"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>,
                    },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all hover:opacity-80"
                      style={{ background: "rgba(201,168,68,0.12)", color: "#C9A844", border: "1px solid rgba(201,168,68,0.3)" }}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Stats row */}
              <div className="relative flex flex-wrap gap-6 sm:gap-8 mt-6 sm:mt-8 pt-6" style={{ borderTop: "1px solid #2E2A18" }}>
                {[
                  { label: "مقال", value: articlesCount > 0 ? articlesCount + "+" : "قريباً" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="text-xl sm:text-2xl font-black" style={{ color: "#C9A844" }}>{stat.value}</p>
                    <p className="text-xs" style={{ color: "#9A9070" }}>{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Latest news sidebar */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold" style={{ color: "#C9A844" }}>آخر الأخبار</h3>
              <Link href="/news" className="text-xs" style={{ color: "#9A9070" }}>عرض الكل ←</Link>
            </div>
            {news.length > 0 ? (
              news.slice(0, 4).map((article: any) => (
                <NewsCard key={article.id} article={article} />
              ))
            ) : (
              <div
                className="rounded-xl p-4 text-center text-sm"
                style={{ background: "#1A1810", border: "1px solid #2E2A18", color: "#9A9070" }}
              >
                لا توجد أخبار منشورة بعد
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Playlists ── */}
      <PlaylistsSection playlists={playlistsWithVideos} />

      {/* Playlists section removed while YouTube channel is suspended */}

      {/* ── Divider ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <hr className="gold-separator" />
      </div>

      {/* ── Latest Articles ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SectionHeader
          title="أحدث المقالات"
          subtitle="قراءات وتحليلات من أقلام متميزة"
          linkHref="/articles"
        />
        {articles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {articles.map((article: any) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <div
            className="rounded-xl p-8 text-center"
            style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
          >
            <p className="text-sm" style={{ color: "#9A9070" }}>لا توجد مقالات منشورة بعد</p>
          </div>
        )}
      </section>

      {/* ── About banner ── */}
      <section
        className="py-12"
        style={{ background: "#1A1810", borderTop: "1px solid #2E2A18", borderBottom: "1px solid #2E2A18" }}
      >
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2
            className="text-3xl font-black mb-4"
            style={{
              background: "linear-gradient(135deg, #E8D5A3, #C9A844)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            البلاغ
          </h2>
          <p className="text-base leading-loose mb-6" style={{ color: "#9A9070" }}>
            منبر إعلامي تونسي مستقل يؤمن بحرية الكلمة وقيم الإسلام الوسطي. نُجري حوارات معمقة مع شخصيات سياسية وفكرية متنوعة، ساعين إلى تقديم محتوى راقٍ يخدم المواطن التونسي والعربي.
          </p>
          <Link href="/about" className="btn-gold-outline inline-block px-6 py-2.5 rounded-full text-sm font-bold">
            اعرف أكثر عنا
          </Link>
        </div>
      </section>

      {/* ── Social Platforms ── */}
      <SocialBar />
    </>
  );
}
