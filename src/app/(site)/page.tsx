import Link from "next/link";
import { fetchLatestVideos } from "@/lib/youtube";
import { supabaseAdmin } from "@/lib/supabase";
import VideoCard from "@/components/ui/VideoCard";
import ArticleCard from "@/components/ui/ArticleCard";
import NewsCard from "@/components/ui/NewsCard";
import SectionHeader from "@/components/ui/SectionHeader";
import SocialBar from "@/components/sections/SocialBar";
import NewsTicker from "@/components/sections/NewsTicker";

export const revalidate = 300;

async function getLatestNews() {
  const { data } = await supabaseAdmin
    .from("news")
    .select("*")
    .neq("status", "rejected")
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

export default async function HomePage() {
  const [videos, news, articles] = await Promise.all([
    fetchLatestVideos(7),
    getLatestNews(),
    getLatestArticles(),
  ]);

  const [featuredVideo, ...restVideos] = videos as {
    id: string; youtube_id: string; title: string;
    thumbnail_url: string; published_at: string;
  }[];

  const tickerItems = news.length > 0
    ? news.map((n: any) => n.title)
    : ["مرحباً بكم في البلاغ — منبر سياسي تونسي مستقل"];

  return (
    <>
      {/* News Ticker */}
      <NewsTicker items={tickerItems} />

      {/* ── Hero ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Featured video */}
          <div className="lg:col-span-2">
            <a
              href={`https://www.youtube.com/watch?v=${featuredVideo.youtube_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-2xl overflow-hidden relative card-hover"
              style={{ border: "1px solid #2E2A18" }}
            >
              <div className="relative" style={{ aspectRatio: "16/9" }}>
                <img
                  src={featuredVideo.thumbnail_url}
                  alt={featuredVideo.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(to top, rgba(17,16,8,0.95) 0%, rgba(17,16,8,0.3) 60%, transparent 100%)",
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                    style={{ background: "rgba(201,168,68,0.9)", boxShadow: "0 0 40px rgba(201,168,68,0.4)" }}
                  >
                    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current" style={{ color: "#111008", marginRight: "-4px" }}>
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </div>
                <div className="absolute bottom-0 right-0 left-0 p-5">
                  <span
                    className="inline-block text-xs px-2 py-1 rounded-full mb-2 font-bold"
                    style={{ background: "rgba(201,168,68,0.9)", color: "#111008" }}
                  >
                    آخر المقابلات
                  </span>
                  <h2 className="text-xl font-black leading-snug" style={{ color: "#F0EAD6" }}>
                    {featuredVideo.title}
                  </h2>
                </div>
              </div>
            </a>
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

      {/* ── Latest Videos ── */}
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
            <p className="text-sm mb-3" style={{ color: "#9A9070" }}>لا توجد مقالات منشورة بعد</p>
            <Link
              href="/admin/articles/new"
              className="text-sm font-medium"
              style={{ color: "#C9A844" }}
            >
              أضف أول مقال ←
            </Link>
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
