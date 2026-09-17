import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { newsPath } from "@/lib/public-urls";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.albaalaagh.com";

export async function GET() {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: paidSubscribers },
    { data: freeSubscribers },
    { data: videos },
    { data: articles },
    { data: news },
  ] = await Promise.all([
    supabaseAdmin.from("subscribers").select("id, email, name, plan, status").order("created_at", { ascending: false }),
    supabaseAdmin.from("newsletter_subscribers").select("id, email, name, status, created_at").order("created_at", { ascending: false }),
    supabaseAdmin.from("site_videos").select("id, title, video_url, published_at").eq("published", true).gte("created_at", oneWeekAgo).order("created_at", { ascending: false }).limit(10),
    supabaseAdmin.from("articles").select("id, title, slug, excerpt").eq("status", "published").gte("published_at", oneWeekAgo).order("published_at", { ascending: false }).limit(10),
    supabaseAdmin.from("news").select("id, slug, title, url, source").eq("status", "approved").gte("published_at", oneWeekAgo).order("published_at", { ascending: false }).limit(15),
  ]);

  const normalizedNews = (news ?? []).map((item) => ({
    ...item,
    url: item.source === "البلاغ" ? `${SITE_URL}${newsPath(item)}` : item.url,
  }));

  return NextResponse.json({
    subscribers:     paidSubscribers     ?? [],
    freeSubscribers: freeSubscribers     ?? [],
    videos:          videos              ?? [],
    articles:        articles            ?? [],
    news:            normalizedNews,
  });
}
