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
  return {
    title: `${article.title} | البلاغ`,
    description: article.excerpt ?? article.title,
    openGraph: {
      title: article.title,
      description: `${article.writer?.name ? `بقلم ${article.writer.name} — ` : ""}${article.excerpt ?? article.title}`,
      url: `https://www.albaalaagh.com/articles/${slug}`,
      siteName: "البلاغ",
      locale: "ar_TN",
      type: "article",
      ...(article.cover_image ? { images: [{ url: article.cover_image, width: 1280, height: 720 }] } : {}),
      publishedTime: article.published_at,
      authors: article.writer?.name ? [article.writer.name] : ["البلاغ"],
    },
    other: {
      "fb:app_id": process.env.NEXT_PUBLIC_FB_APP_ID ?? "",
      "article:author": article.writer?.name ?? "البلاغ",
    },
    twitter: {
      card: article.cover_image ? "summary_large_image" : "summary",
      title: article.title,
      description: article.excerpt ?? article.title,
      ...(article.cover_image ? { images: [article.cover_image] } : {}),
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
      <nav className="flex items-center gap-2 text-xs mb-6" style={{ color: "#9A9070" }}>
        <Link href="/" className="hover:text-[#C9A844] transition-colors">الرئيسية</Link>
        <span>←</span>
        <Link href="/articles" className="hover:text-[#C9A844] transition-colors">المقالات</Link>
        <span>←</span>
        <span className="line-clamp-1" style={{ color: "#C9A844" }}>{article.title}</span>
      </nav>

      {/* Category */}
      <span
        className="inline-block text-xs px-3 py-1 rounded-full font-medium mb-4"
        style={{ background: "rgba(201,168,68,0.12)", color: "#C9A844" }}
      >
        {article.category}
      </span>

      {/* Title */}
      <h1 className="text-3xl sm:text-4xl font-black leading-snug mb-4" style={{ color: "#F0EAD6" }}>
        {article.title}
      </h1>

      {/* Excerpt */}
      {article.excerpt && (
        <p className="text-lg mb-6" style={{ color: "#9A9070", lineHeight: "1.8" }}>
          {article.excerpt}
        </p>
      )}

      {/* Author + date */}
      <div
        className="flex items-center gap-4 p-4 rounded-xl mb-8"
        style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
      >
        {article.writer?.image_url ? (
          <img
            src={article.writer.image_url}
            alt={article.writer.name}
            className="w-12 h-12 rounded-full object-cover shrink-0"
            style={{ border: "2px solid #C9A844" }}
          />
        ) : (
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
            style={{ background: "rgba(201,168,68,0.15)", color: "#C9A844" }}
          >
            {article.writer?.name?.[0] ?? "ب"}
          </div>
        )}
        <div>
          <p className="font-bold text-sm" style={{ color: "#E8D5A3" }}>
            {article.writer?.name ?? "البلاغ"}
          </p>
          {article.writer?.title && (
            <p className="text-xs" style={{ color: "#9A9070" }}>{article.writer.title}</p>
          )}
        </div>
        <div className="mr-auto text-xs" style={{ color: "#9A9070" }}>
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
        <div className="rounded-2xl overflow-hidden mb-8" style={{ aspectRatio: "16/7" }}>
          <img
            src={article.cover_image}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <hr className="gold-separator mb-8" />

      {/* Article content */}
      <div
        className="article-prose"
        style={{ color: "#D4C9A8" }}
        dangerouslySetInnerHTML={{ __html: formatContent(article.content) }}
      />

      <hr className="gold-separator mt-12 mb-8" />

      {/* Author bio */}
      {article.writer && (
        <div
          className="p-6 rounded-xl"
          style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
        >
          <h3 className="text-sm font-bold mb-3" style={{ color: "#C9A844" }}>عن الكاتب</h3>
          <div className="flex gap-4 items-start">
            {article.writer.image_url ? (
              <img
                src={article.writer.image_url}
                alt={article.writer.name}
                className="w-16 h-16 rounded-full object-cover shrink-0"
                style={{ border: "2px solid #C9A844" }}
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
                style={{ background: "rgba(201,168,68,0.15)", color: "#C9A844" }}
              >
                {article.writer.name[0]}
              </div>
            )}
            <div>
              <p className="font-bold" style={{ color: "#E8D5A3" }}>{article.writer.name}</p>
              <p className="text-sm mb-2" style={{ color: "#C9A844" }}>{article.writer.title}</p>
              {article.writer.bio && (
                <p className="text-sm leading-relaxed" style={{ color: "#9A9070" }}>{article.writer.bio}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-8">
        <Link href="/articles" className="text-sm font-medium" style={{ color: "#9A9070" }}>
          → العودة إلى المقالات
        </Link>
      </div>
    </div>
  );
}
