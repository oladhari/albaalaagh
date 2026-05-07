import { supabaseAdmin } from "@/lib/supabase";
import { MetadataRoute } from "next";

const BASE = "https://www.albaalaagh.com";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ data: news }, { data: articles }] = await Promise.all([
    supabaseAdmin
      .from("news")
      .select("slug, published_at")
      .eq("source", "البلاغ")
      .eq("status", "approved")
      .order("published_at", { ascending: false }),
    supabaseAdmin
      .from("articles")
      .select("slug, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false }),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE,                         lastModified: new Date(), changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE}/news`,               lastModified: new Date(), changeFrequency: "daily",   priority: 0.9 },
    { url: `${BASE}/interviews`,         lastModified: new Date(), changeFrequency: "daily",   priority: 0.9 },
    { url: `${BASE}/articles`,           lastModified: new Date(), changeFrequency: "weekly",  priority: 0.8 },
    { url: `${BASE}/taqrir`,             lastModified: new Date(), changeFrequency: "daily",   priority: 0.8 },
    { url: `${BASE}/qadaya-sharia`,      lastModified: new Date(), changeFrequency: "weekly",  priority: 0.7 },
    { url: `${BASE}/guests`,             lastModified: new Date(), changeFrequency: "weekly",  priority: 0.6 },
    { url: `${BASE}/about`,              lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/contact`,            lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/privacy-policy`,     lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
  ];

  const newsPages: MetadataRoute.Sitemap = (news ?? []).map((n) => ({
    url:             `${BASE}/taqrir/${n.slug}`,
    lastModified:    new Date(n.published_at),
    changeFrequency: "never",
    priority:        0.7,
  }));

  const articlePages: MetadataRoute.Sitemap = (articles ?? []).map((a) => ({
    url:             `${BASE}/articles/${a.slug}`,
    lastModified:    new Date(a.published_at),
    changeFrequency: "never",
    priority:        0.8,
  }));

  return [...staticPages, ...newsPages, ...articlePages];
}
