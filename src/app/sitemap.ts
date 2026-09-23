import { supabaseAdmin } from "@/lib/supabase";
import { newsPath, videoPath } from "@/lib/public-urls";
import { MetadataRoute } from "next";

const BASE = "https://www.albaalaagh.com";
const SUPABASE_PAGE_SIZE = 1000;

export const revalidate = 3600;

type SitemapNews = {
  id: string;
  slug: string | null;
  published_at: string;
  news_citations: { id: string }[] | null;
};

type SitemapArticle = {
  slug: string;
  published_at: string;
};

type SitemapVideo = {
  id: string;
  published_at: string | null;
  created_at: string;
};

async function getAllPublishedVideos(): Promise<SitemapVideo[]> {
  const videos: SitemapVideo[] = [];

  for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
    const { data, error } = await supabaseAdmin
      .from("site_videos")
      .select("id, published_at, created_at")
      .eq("published", true)
      .order("id", { ascending: true })
      .range(from, from + SUPABASE_PAGE_SIZE - 1);

    if (error) throw new Error(`Unable to build video sitemap: ${error.message}`);

    const page = (data ?? []) as SitemapVideo[];
    videos.push(...page);
    if (page.length < SUPABASE_PAGE_SIZE) break;
  }

  return videos;
}

function latestDate(rows: Array<{ published_at?: string | null; created_at?: string | null }>) {
  const timestamps = rows
    .flatMap((row) => [row.published_at, row.created_at])
    .filter((value): value is string => Boolean(value))
    .map((value) => Date.parse(value))
    .filter(Number.isFinite);

  return timestamps.length ? new Date(Math.max(...timestamps)) : undefined;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ data: newsData, error: newsError }, { data: articleData, error: articleError }, videos] = await Promise.all([
    supabaseAdmin
      .from("news")
      .select("id, slug, published_at, news_citations(id)")
      .eq("source", "البلاغ")
      .eq("status", "approved")
      .order("published_at", { ascending: false }),
    supabaseAdmin
      .from("articles")
      .select("slug, published_at")
      .eq("published", true)
      .order("published_at", { ascending: false }),
    getAllPublishedVideos(),
  ]);

  if (newsError) throw new Error(`Unable to build news sitemap: ${newsError.message}`);
  if (articleError) throw new Error(`Unable to build article sitemap: ${articleError.message}`);

  const news = (newsData ?? []) as SitemapNews[];
  const articles = (articleData ?? []) as SitemapArticle[];
  const latestNews = latestDate(news);
  const latestArticle = latestDate(articles);
  const latestVideo = latestDate(videos);
  const latestSiteContent = latestDate([...news, ...articles, ...videos]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE,                         ...(latestSiteContent ? { lastModified: latestSiteContent } : {}), changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE}/news`,               ...(latestNews ? { lastModified: latestNews } : {}),               changeFrequency: "daily",   priority: 0.9 },
    { url: `${BASE}/interviews`,         ...(latestVideo ? { lastModified: latestVideo } : {}),             changeFrequency: "daily",   priority: 0.9 },
    { url: `${BASE}/articles`,           ...(latestArticle ? { lastModified: latestArticle } : {}),         changeFrequency: "weekly",  priority: 0.8 },
    { url: `${BASE}/taqrir`,             ...(latestNews ? { lastModified: latestNews } : {}),               changeFrequency: "daily",   priority: 0.8 },
    { url: `${BASE}/qadaya-sharia`,      ...(latestArticle ? { lastModified: latestArticle } : {}),         changeFrequency: "weekly",  priority: 0.7 },
    { url: `${BASE}/guests`,             changeFrequency: "weekly",  priority: 0.6 },
    { url: `${BASE}/about`,              changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/contact`,            changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/privacy-policy`,     changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE}/terms-of-use`,       changeFrequency: "yearly",  priority: 0.3 },
  ];

  const newsPages: MetadataRoute.Sitemap = news.filter((n) => (n.news_citations?.length ?? 0) > 0).map((n) => ({
    url:             `${BASE}${newsPath(n)}`,
    lastModified:    new Date(n.published_at),
    changeFrequency: "never",
    priority:        0.7,
  }));

  const articlePages: MetadataRoute.Sitemap = articles.map((a) => ({
    url:             `${BASE}/articles/${a.slug}`,
    lastModified:    new Date(a.published_at),
    changeFrequency: "never",
    priority:        0.8,
  }));

  const videoPages: MetadataRoute.Sitemap = videos.map((v) => ({
    url:             `${BASE}${videoPath(v.id)}`,
    lastModified:    new Date(v.published_at ?? v.created_at),
    changeFrequency: "never",
    priority:        0.7,
  }));

  return [...staticPages, ...newsPages, ...articlePages, ...videoPages];
}
