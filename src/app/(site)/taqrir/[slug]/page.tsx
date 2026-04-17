import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { formatArabicDate } from "@/lib/utils";
import ShareButtons from "@/components/ui/ShareButtons";
import SectionHeader from "@/components/ui/SectionHeader";

export const revalidate = 60;

async function getArticle(slug: string) {
  const { data } = await supabaseAdmin
    .from("news")
    .select("*")
    .eq("slug", slug)
    .eq("source", "البلاغ")
    .single();
  return data ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return {};

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.albaalaagh.com";
  const ogImage = article.image_url
    ? `${base}/api/og/news?title=${encodeURIComponent(article.title)}&img=${encodeURIComponent(article.image_url)}`
    : `${base}/api/og/news?title=${encodeURIComponent(article.title)}`;

  return {
    title: `${article.title} | البلاغ`,
    description: article.excerpt ?? article.title,
    openGraph: {
      title: article.title,
      description: article.excerpt ?? article.title,
      url: `${base}/taqrir/${slug}`,
      siteName: "البلاغ",
      locale: "ar_TN",
      type: "article",
      images: [{ url: ogImage, width: 1280, height: 720 }],
      publishedTime: article.published_at,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt ?? article.title,
      images: [ogImage],
    },
  };
}

function formatContent(content: string): string {
  if (/<[a-z][\s\S]*>/i.test(content)) return content;
  return content
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
}

export default async function TaqrirPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.albaalaagh.com";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {/* Breadcrumb */}
      <nav className="text-xs mb-6 flex items-center gap-2" style={{ color: "#9A9070" }}>
        <a href="/" style={{ color: "#9A9070" }}>الرئيسية</a>
        <span>›</span>
        <a href="/news" style={{ color: "#9A9070" }}>الأخبار</a>
        <span>›</span>
        <span style={{ color: "#C9A844" }}>تقرير البلاغ</span>
      </nav>

      {/* Category + meta */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {article.category && (
          <span
            className="text-xs px-3 py-1 rounded-full font-medium"
            style={{ background: "rgba(201,168,68,0.12)", color: "#C9A844" }}
          >
            {article.category}
          </span>
        )}
        <span
          className="text-xs px-3 py-1 rounded-full font-bold"
          style={{ background: "rgba(201,168,68,0.2)", color: "#C9A844" }}
        >
          تقرير البلاغ
        </span>
      </div>

      {/* Title */}
      <h1 className="text-2xl sm:text-3xl font-black leading-tight mb-4" style={{ color: "#F0EAD6" }}>
        {article.title}
      </h1>

      {/* Excerpt */}
      {article.excerpt && (
        <p className="text-base leading-relaxed mb-6" style={{ color: "#9A9070" }}>
          {article.excerpt}
        </p>
      )}

      {/* Author + date */}
      <div
        className="flex items-center gap-4 p-4 rounded-xl mb-6"
        style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
          style={{ background: "rgba(201,168,68,0.15)", color: "#C9A844" }}
        >
          ب
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: "#F0EAD6" }}>تحرير البلاغ</p>
          <p className="text-xs" style={{ color: "#9A9070" }}>الفريق التحريري</p>
        </div>
        <span className="mr-auto text-xs" style={{ color: "#9A9070" }}>
          {formatArabicDate(article.published_at)}
        </span>
      </div>

      {/* Share */}
      <div className="mb-6">
        <ShareButtons url={`${base}/taqrir/${slug}`} title={article.title} />
      </div>

      {/* Cover image */}
      {article.image_url && (
        <div className="mb-8 rounded-xl overflow-hidden">
          <img
            src={article.image_url}
            alt={article.title}
            className="w-full object-cover max-h-96"
          />
        </div>
      )}

      {/* Content */}
      <div
        className="prose-ar leading-relaxed"
        style={{ color: "#D4CCBA", fontSize: 16, lineHeight: 1.9 }}
        dangerouslySetInnerHTML={{ __html: formatContent(article.content ?? "") }}
      />
    </div>
  );
}
