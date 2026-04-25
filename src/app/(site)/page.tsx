import Link from "next/link";
import { fetchLiveStreams, fetchFeaturedPlaylists, fetchChannelStats, fetchActiveLiveStream } from "@/lib/youtube";
import { supabaseAdmin } from "@/lib/supabase";
import VideoCard from "@/components/ui/VideoCard";
import ArticleCard from "@/components/ui/ArticleCard";
import NewsCard from "@/components/ui/NewsCard";
import SectionHeader from "@/components/ui/SectionHeader";
import SocialBar from "@/components/sections/SocialBar";
import NewsTicker from "@/components/sections/NewsTicker";
import LiveBanner from "@/components/sections/LiveBanner";

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
  const [videos, playlists, news, articles, channelStats, articlesCount, liveStream] = await Promise.all([
    fetchLiveStreams(20),
    fetchFeaturedPlaylists(),
    getLatestNews(),
    getLatestArticles(),
    fetchChannelStats(),
    getArticlesCount(),
    fetchActiveLiveStream(),
  ]);

  const restVideos = videos;

  const tickerItems = news.length > 0
    ? news.map((n: any) => n.title)
    : ["مرحباً بكم في البلاغ — منبر سياسي تونسي مستقل"];

  return (
    <>
      {/* News Ticker */}
      <NewsTicker items={tickerItems} />

      {/* Live Stream Banner — only visible when a live broadcast is active */}
      <LiveBanner liveStream={liveStream} />

      {/* ── Hero ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Site summary hero */}
          <div className="lg:col-span-2">
            <div
              className="rounded-2xl overflow-hidden relative flex flex-col justify-between"
              style={{
                background: "linear-gradient(135deg, #1A1810 0%, #111008 100%)",
                border: "1px solid #2E2A18",
                minHeight: "340px",
                padding: "40px",
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
                  className="text-5xl sm:text-6xl font-black mb-5"
                  style={{
                    background: "linear-gradient(135deg, #E8D5A3, #C9A844)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    paddingBottom: "0.15em",
                    lineHeight: "1.2",
                  }}
                >
                  البلاغ
                </h1>
                <p className="text-base leading-relaxed mb-6" style={{ color: "#9A9070", maxWidth: "480px" }}>
                  منبر إعلامي تونسي مستقل يؤمن بحرية الكلمة — نُجري حوارات معمقة مع شخصيات سياسية وفكرية بارزة، ونواكب الحدث التونسي والعربي والدولي.
                </p>

                {/* Section links */}
                <div className="flex flex-wrap gap-3">
                  {[
                    { href: "/interviews",    label: "📺 المقابلات" },
                    { href: "/news",          label: "📰 الأخبار" },
                    { href: "/articles",      label: "✍️ المقالات" },
                    { href: "/qadaya-sharia", label: "☪️ قضايا شرعية" },
                    { href: "/guests",        label: "👤 الضيوف" },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="px-4 py-2 rounded-full text-sm font-bold transition-all hover:opacity-80"
                      style={{ background: "rgba(201,168,68,0.12)", color: "#C9A844", border: "1px solid rgba(201,168,68,0.3)" }}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Stats row */}
              <div className="relative flex gap-8 mt-8 pt-6" style={{ borderTop: "1px solid #2E2A18" }}>
                {[
                  { label: "فيديو على يوتيوب", value: channelStats.videoCount > 0 ? channelStats.videoCount + "+" : "..." },
                  { label: "مشترك يوتيوب",     value: channelStats.subscriberCount > 0 ? formatCount(channelStats.subscriberCount) : "..." },
                  { label: "مقال",              value: articlesCount > 0 ? articlesCount + "+" : "قريباً" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="text-2xl font-black" style={{ color: "#C9A844" }}>{stat.value}</p>
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

      {/* ── Latest Live Streams ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SectionHeader
          title="أحدث المقابلات"
          subtitle="حوارات سياسية وفكرية معمقة"
          linkHref="/interviews"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {restVideos.slice(0, 6).map((video) => (
            <VideoCard key={video.id} {...video} />
          ))}
        </div>
      </section>

      {/* ── Featured Playlists ── */}
      {playlists.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <SectionHeader
            title="أبرز برامجنا"
            subtitle="برامج متخصصة تُغطي السياسة والفكر والذكاء الاصطناعي"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {playlists.map((playlist) => (
              <a
                key={playlist.id}
                href={`https://www.youtube.com/playlist?list=${playlist.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-2xl overflow-hidden card-hover flex flex-col"
                style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
              >
                {/* Thumbnail from latest video */}
                <div className="relative overflow-hidden" style={{ aspectRatio: "16/9" }}>
                  <img
                    src={playlist.latestVideo?.thumbnail_url || playlist.thumbnail_url}
                    alt={playlist.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(to top, rgba(17,16,8,0.85) 0%, transparent 60%)" }}
                  />
                  {/* Playlist icon */}
                  <div
                    className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold"
                    style={{ background: "rgba(201,168,68,0.9)", color: "#111008" }}
                  >
                    <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
                      <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h10v2H4z"/>
                    </svg>
                    قائمة تشغيل
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 flex flex-col flex-1">
                  <h3
                    className="font-black text-base mb-2 group-hover:text-[#C9A844] transition-colors"
                    style={{ color: "#F0EAD6" }}
                  >
                    {playlist.title}
                  </h3>
                  {playlist.description && (
                    <p
                      className="text-xs leading-relaxed line-clamp-3 mb-3 flex-1"
                      style={{ color: "#9A9070", lineHeight: "1.8" }}
                    >
                      {playlist.description}
                    </p>
                  )}
                  {playlist.latestVideo && (
                    <div
                      className="mt-auto pt-3 flex items-start gap-2"
                      style={{ borderTop: "1px solid #2E2A18" }}
                    >
                      <img
                        src={playlist.latestVideo.thumbnail_url}
                        alt=""
                        className="w-14 h-9 rounded object-cover shrink-0"
                      />
                      <p className="text-xs line-clamp-2" style={{ color: "#9A9070" }}>
                        آخر حلقة: {playlist.latestVideo.title}
                      </p>
                    </div>
                  )}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

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
