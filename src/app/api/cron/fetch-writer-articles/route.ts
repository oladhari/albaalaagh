import { NextRequest, NextResponse } from "next/server";
import Parser from "rss-parser";
import { supabaseAdmin } from "@/lib/supabase";
import { WRITERS } from "@/types";

const parser = new Parser({ timeout: 10000 });

function googleNewsRSS(writerName: string): string {
  const query = encodeURIComponent(`"${writerName}"`);
  return `https://news.google.com/rss/search?q=${query}&hl=ar&gl=TN&ceid=TN:ar`;
}

// rss-parser doesn't follow 302 redirects — fetch the XML ourselves first
async function fetchFeed(url: string) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; AlBalaagh-bot/1.0)" },
    redirect: "follow",
  });
  if (!res.ok) return null;
  const xml = await res.text();
  return parser.parseString(xml);
}

function extractImageFromDescription(desc?: string): string | undefined {
  if (!desc) return undefined;
  const match = desc.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1];
}

function cleanExcerpt(desc?: string): string {
  if (!desc) return "";
  return desc.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 300);
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, number> = {};
  let totalSaved = 0;

  for (const writer of WRITERS) {
    try {
      const feedUrl = googleNewsRSS(writer.name);
      const feed = await fetchFeed(feedUrl);
      if (!feed) { results[writer.name] = -1; continue; }

      let savedForWriter = 0;

      for (const item of feed.items.slice(0, 8)) {
        if (!item.title || !item.link) continue;

        const imageUrl = extractImageFromDescription(item.content ?? item.summary);
        const excerpt = cleanExcerpt(item.content ?? item.summary ?? item.contentSnippet);
        const publishedAt = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();

        // Source domain from the link
        let source: string | undefined;
        try {
          source = new URL(item.link).hostname.replace("www.", "");
        } catch {
          source = undefined;
        }

        const { error } = await supabaseAdmin.from("writer_articles").upsert(
          {
            title: item.title.trim(),
            excerpt,
            url: item.link,
            image_url: imageUrl ?? null,
            writer_name: writer.name,
            source,
            published_at: publishedAt,
            status: "pending",
          },
          { onConflict: "url", ignoreDuplicates: true }
        );

        if (!error) {
          savedForWriter++;
          totalSaved++;
        }
      }

      results[writer.name] = savedForWriter;
    } catch (err) {
      console.error(`[fetch-writer-articles] Error for ${writer.name}:`, err);
      results[writer.name] = -1;
    }
  }

  return NextResponse.json({ ok: true, totalSaved, results });
}
