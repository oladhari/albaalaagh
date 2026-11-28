import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { generateUrlDraft, type NewsDraft } from "@/lib/ai/workflows";
import { AiProviderError, toAdminAiResponse } from "@/lib/ai/provider";
import { fetchNewsSource, NewsSourceError } from "@/lib/news-source";
import { newsImportDraftUrl, newsImportTerms, newsImportUrls, type NewsImportMatch } from "@/lib/news-import-review";

export const maxDuration = 90;

const MATCH_FIELDS = "id,title,source,status,published_at,url,slug,geo,category";
type NewsRow = Omit<NewsImportMatch, "sameUrl"> & { excerpt?: string | null; slug: string | null; geo: string | null; category: string | null };

function reusable(row: NewsRow): boolean {
  return !row.slug && row.source !== "البلاغ";
}

async function findExactNews(urls: string[]): Promise<NewsRow[]> {
  const { data, error } = await supabaseAdmin.from("news").select(MATCH_FIELDS).in("url", urls);
  if (error) throw error;
  return data as NewsRow[];
}

async function reviewNews(url: string, urls: string[], exact: NewsRow[]) {
  let title = exact[0]?.title;
  if (!title) {
    try {
      title = (await fetchNewsSource(url)).title;
    } catch {
      // The review can use the URL headline. Draft generation still requires the body.
      const path = new URL(url).pathname;
      try {
        title = decodeURIComponent(path.split("/").filter(Boolean).at(-1) ?? "");
      } catch {
        title = "";
      }
    }
  }
  const terms = newsImportTerms(title ?? "").slice(0, 8);
  const cited = supabaseAdmin.from("news_citations")
    .select(`news_id,news!inner(${MATCH_FIELDS})`).in("url", urls).limit(12);
  const search = terms.flatMap((term, index) =>
    terms.slice(index + 1, index + 3).flatMap((other) => [
      `and(title.ilike.*${term}*,title.ilike.*${other}*)`,
      `and(excerpt.ilike.*${term}*,excerpt.ilike.*${other}*)`,
    ])
  );
  if (terms.length === 1) search.push(`title.ilike.*${terms[0]}*`);
  const related = search.length
    ? supabaseAdmin.from("news").select(`${MATCH_FIELDS},excerpt`)
        .or(search.join(","))
        .order("published_at", { ascending: false }).limit(80)
    : Promise.resolve({ data: [], error: null });
  const [citations, headlines] = await Promise.all([cited, related]);
  const rows = new Map<string, NewsImportMatch>();
  function add(row: NewsRow, sameUrl: boolean) {
    if (rows.has(row.id)) return;
    const { id, title, source, status, published_at, url } = row;
    rows.set(id, { id, title, source, status, published_at, url, sameUrl });
  }
  for (const row of exact) add(row, true);
  for (const item of citations.data ?? []) add(item.news as unknown as NewsRow, true);
  const ranked = ((headlines.data ?? []) as NewsRow[]).map((row) => {
    const titleTerms = new Set(newsImportTerms(row.title));
    const excerptTerms = new Set(newsImportTerms(row.excerpt ?? ""));
    const shared = terms.filter((term) => titleTerms.has(term) || excerptTerms.has(term));
    const score = shared.length + shared.filter((term) => titleTerms.has(term)).length;
    return { row, shared: shared.length, score };
  }).filter(({ shared }) => shared >= Math.min(2, terms.length)).sort((a, b) => b.score - a.score);
  for (const { row } of ranked) add(row, false);
  return { matches: [...rows.values()].slice(0, 12), partial: Boolean(!title || citations.error || headlines.error) };
}

export async function POST(req: NextRequest) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const body = await req.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  let parsedUrl: URL;
  try {
    if (url.length > 2048) throw new Error();
    parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol) || parsedUrl.username || parsedUrl.password) throw new Error();
  } catch {
    return NextResponse.json({ error: "رابط غير صالح" }, { status: 400 });
  }

  const sourceUrls = newsImportUrls(url);
  const draftUrl = newsImportDraftUrl(url);
  const lookupUrls = [...sourceUrls, draftUrl];
  let exact: NewsRow[];
  try {
    exact = await findExactNews(lookupUrls);
  } catch {
    return NextResponse.json({ error: "تعذّر التحقق من الأخبار المحفوظة." }, { status: 500 });
  }
  if (body.review === true) {
    return NextResponse.json(await reviewNews(url, sourceUrls, exact));
  }

  const existing = exact.find((row) => reusable(row) && row.url === url) ?? exact.find(reusable);
  let article: Awaited<ReturnType<typeof fetchNewsSource>>;
  try {
    article = await fetchNewsSource(url);
  } catch (error) {
    if (existing) {
      return NextResponse.json({
        newsId: existing.id,
        title: existing.title,
        excerpt: "",
        content: "",
        image_url: null,
        geo: existing.geo ?? "general",
        category: existing.category ?? "عام",
        sourceUnavailable: true,
        citations: [{ name: existing.source, url, kind: "media", is_primary: true, published_at: existing.published_at }],
      });
    }
    return NextResponse.json({ error: error instanceof NewsSourceError ? error.message : "تعذّر جلب المصدر" }, { status: 422 });
  }
  const sourceTitle = article.title || existing?.title || "خبر من رابط خارجي";
  const sourceDesc = article.description;
  const sourceName = parsedUrl.hostname.replace(/^www\./, "");

  let generated: NewsDraft;
  try {
    generated = await generateUrlDraft({
      original_title: sourceTitle,
      source_name: existing?.source ?? sourceName,
      source_url: url,
      description: sourceDesc,
      article_text: article.articleText,
    });
  } catch (err: unknown) {
    if (err instanceof AiProviderError) {
      const response = toAdminAiResponse(err);
      return NextResponse.json({ error: response.error, category: response.category }, { status: response.status });
    }
    console.error(JSON.stringify({ event: "url_news_generation_failed", route: "/api/admin/news/from-url" }));
    return NextResponse.json({ error: "تعذّر إنشاء مسودة صالحة من الرابط." }, { status: 500 });
  }

  // RSS may have stored this URL already. Reuse its row without changing its status.
  // If an existing Albaalaagh story owns the URL, reserve a separate pending row.
  let row = existing;
  if (!row) {
    const storageUrl = exact.length ? draftUrl : url;
    const { data, error } = await supabaseAdmin.from("news").insert({
      title: sourceTitle,
      excerpt: sourceDesc,
      content: null,
      image_url: article.image || null,
      source: sourceName,
      url: storageUrl,
      status: "pending",
      geo: "general",
      category: "عام",
      published_at: new Date().toISOString(),
    }).select(MATCH_FIELDS).single();

    if (error?.code === "23505") {
      try {
        row = (await findExactNews(lookupUrls)).find(reusable);
      } catch {
        // Report the same save failure as below.
      }
    } else if (!error) {
      row = data as NewsRow;
    }
    if (!row) return NextResponse.json({ error: "تعذّر حجز مسودة الخبر. حاول مجدداً." }, { status: 500 });
  }

  return NextResponse.json({
    newsId: row.id,
    title: generated.title,
    excerpt: generated.excerpt,
    content: generated.content,
    needs_internal_review: generated.needs_internal_review,
    image_url: article.image || null,
    geo: row.geo ?? "general",
    category: row.category ?? "عام",
    citations: [{
      name: row.source,
      url,
      kind: "media",
      is_primary: true,
      published_at: existing?.published_at ?? null,
    }],
  });
}
