import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatArabicDate } from "@/lib/utils";
import ShareButtons from "@/components/ui/ShareButtons";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return {};

  const base = "https://www.albaalaagh.com";
  const ogImage = article.cover_image
    ? `${base}/api/og/news?v=2&title=${encodeURIComponent(article.title)}&img=${encodeURIComponent(article.cover_image)}`
    : `${base}/api/og/news?v=2&title=${encodeURIComponent(article.title)}`;

  return {
    title: `${article.title} | البلاغ`,
    description: article.excerpt ?? article.title,
    openGraph: {
      title: article.title,
      description: `${article.writer?.name ? `بقلم ${article.writer.name} — ` : ""}${article.excerpt ?? article.title}`,
      url: `${base}/articles/${slug}`,
      siteName: "البلاغ",
      locale: "ar_TN",
      type: "article",
      images: [{ url: ogImage, width: 1280, height: 720 }],
      publishedTime: article.published_at,
      authors: article.writer?.name ? [article.writer.name] : ["البلاغ"],
    },
    other: {
      "fb:app_id": process.env.NEXT_PUBLIC_FB_APP_ID ?? "",
      "article:author": article.writer?.name ?? "البلاغ",
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt ?? article.title,
      images: [ogImage],
    },
  };
}

// If content has no HTML tags, wrap each paragraph in <p> tags
function formatContent(content: string): string {
  if (/<[a-z][\s\S]*>/i.test(content)) return content;
  return content
    .split(/\n\n+/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p>${para.replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
}

async function getArticle(slug: string) {
  const { data, error } = await supabase
    .from("articles")
    .select("*, writer:writers(*)")
    .eq("slug", slug)
    .eq("published", true)
    .single();
  if (error || !data) return null;
  return data;
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs mb-6 text-text-muted">
        <Link href="/" className="hover:text-[#C9A844] transition-colors">الرئيسية</Link>
        <span>←</span>
        <Link href="/articles" className="hover:text-[#C9A844] transition-colors">المقالات</Link>
        <span>←</span>
        <span className="line-clamp-1 text-gold">{article.title}</span>
      </nav>

      {/* Category */}
      <span className="inline-block text-xs px-3 py-1 rounded-full font-medium mb-4 bg-gold/12 text-gold">
        {article.category}
      </span>

      {/* Title */}
      <h1 className="text-3xl sm:text-4xl font-black leading-snug mb-4 text-text">
        {article.title}
      </h1>

      {/* Excerpt */}
      {article.excerpt && (
        <p className="text-lg mb-6 text-text-muted" style={{ lineHeight: "1.8" }}>
          {article.excerpt}
        </p>
      )}

      {/* Author + date */}
      <div className="flex items-center gap-4 p-4 rounded-xl mb-8 bg-bg-card border border-border">
        {article.writer?.image_url ? (
          <img
            src={article.writer.image_url}
            alt={article.writer.name}
            className="w-12 h-12 rounded-full object-cover shrink-0 border-2 border-gold"
          />
        ) : (
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 bg-gold/[0.15] text-gold">
            {article.writer?.name?.[0] ?? "ب"}
          </div>
        )}
        <div>
          <p className="font-bold text-sm text-gold-light">
            {article.writer?.name ?? "البلاغ"}
          </p>
          {article.writer?.title && (
            <p className="text-xs text-text-muted">{article.writer.title}</p>
          )}
        </div>
        <div className="mr-auto text-xs text-text-muted">
          {formatArabicDate(article.published_at || article.created_at)}
        </div>
      </div>

      {/* Share buttons */}
      <ShareButtons
        title={article.title}
        url={`https://www.albaalaagh.com/articles/${article.slug}`}
      />

      {/* Cover image */}
      {article.cover_image && (
        <div className="rounded-2xl overflow-hidden mb-8" style={{ aspectRatio: "16/9" }}>
          <img
            src={article.cover_image}
            alt={article.title}
            className="w-full h-full object-cover object-center"
          />
        </div>
      )}

      <hr className="gold-separator mb-8" />

      {/* Article content */}
      <div
        className="article-prose text-text-body"
        dangerouslySetInnerHTML={{ __html: formatContent(article.content) }}
      />

      <hr className="gold-separator mt-12 mb-8" />

      {/* Author bio */}
      {article.writer && (
        <div className="p-6 rounded-xl bg-bg-card border border-border">
          <h3 className="text-sm font-bold mb-3 text-gold">عن الكاتب</h3>
          <div className="flex gap-4 items-start">
            {article.writer.image_url ? (
              <img
                src={article.writer.image_url}
                alt={article.writer.name}
                className="w-16 h-16 rounded-full object-cover shrink-0 border-2 border-gold"
              />
            ) : (
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0 bg-gold/[0.15] text-gold">
                {article.writer.name[0]}
              </div>
            )}
            <div>
              <p className="font-bold text-gold-light">{article.writer.name}</p>
              <p className="text-sm mb-2 text-gold">{article.writer.title}</p>
              {article.writer.bio && (
                <p className="text-sm leading-relaxed text-text-muted">{article.writer.bio}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-8">
        <Link href="/articles" className="text-sm font-medium text-text-muted">
          → العودة إلى المقالات
        </Link>
      </div>
    </div>
  );
}
