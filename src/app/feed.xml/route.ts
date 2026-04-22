import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const revalidate = 300;

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.albaalaagh.com";

function esc(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rfc822(date: string): string {
  return new Date(date).toUTCString();
}

export async function GET() {
  const [{ data: newsItems }, { data: articles }] = await Promise.all([
    supabaseAdmin
      .from("news")
      .select("id, slug, title, excerpt, image_url, source, published_at, category")
      .eq("status", "approved")
      .order("published_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("writer_articles")
      .select("id, slug, title, excerpt, writer_name, published_at")
      .eq("status", "approved")
      .order("published_at", { ascending: false })
      .limit(50),
  ]);

  type FeedItem = {
    guid: string;
    title: string;
    link: string;
    description: string;
    pubDate: string;
    author: string;
    image_url?: string | null;
    category?: string;
  };

  const combined: FeedItem[] = [
    ...(newsItems ?? []).map((n: any) => ({
      guid:        `${BASE}/taqrir/${n.slug}`,
      title:       n.title,
      link:        `${BASE}/taqrir/${n.slug}`,
      description: n.excerpt ?? "",
      pubDate:     n.published_at,
      author:      n.source ?? "البلاغ",
      image_url:   n.image_url,
      category:    n.category,
    })),
    ...(articles ?? []).map((a: any) => ({
      guid:        `${BASE}/articles/${a.slug}`,
      title:       a.title,
      link:        `${BASE}/articles/${a.slug}`,
      description: a.excerpt ?? "",
      pubDate:     a.published_at,
      author:      a.writer_name ?? "البلاغ",
      image_url:   null,
      category:    "مقال",
    })),
  ]
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, 100);

  const lastBuildDate = combined[0]?.pubDate
    ? rfc822(combined[0].pubDate)
    : new Date().toUTCString();

  const items = combined
    .map((item) => {
      const enclosure = item.image_url
        ? `\n      <enclosure url="${esc(item.image_url)}" type="image/jpeg" length="0" />`
        : "";
      return `
    <item>
      <title>${esc(item.title)}</title>
      <link>${esc(item.link)}</link>
      <guid isPermaLink="true">${esc(item.guid)}</guid>
      <description>${esc(item.description)}</description>
      <pubDate>${rfc822(item.pubDate)}</pubDate>
      <author>${esc(item.author)}</author>
      <category>${esc(item.category ?? "أخبار")}</category>${enclosure}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>البلاغ</title>
    <link>${BASE}</link>
    <atom:link href="${BASE}/feed.xml" rel="self" type="application/rss+xml" />
    <description>آخر تقارير وتحليلات البلاغ — سياسة، قضاء، فكر، مجتمع</description>
    <language>ar</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <ttl>300</ttl>
${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
    },
  });
}
