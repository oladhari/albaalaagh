import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { generateUrlDraft, type NewsDraft } from "@/lib/ai/workflows";
import { AiProviderError, toAdminAiResponse } from "@/lib/ai/provider";

export const maxDuration = 60;

function extractMeta(html: string, property: string): string {
  const m =
    html.match(new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i")) ??
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, "i"));
  return m ? m[1].trim() : "";
}

function extractText(html: string): string {
  // Strip scripts, styles, nav, header, footer, aside
  const clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<(nav|header|footer|aside|figure|figcaption)[^>]*>[\s\S]*?<\/\1>/gi, "");

  // Extract <p> tag content
  const paragraphs: string[] = [];
  const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match;
  while ((match = pRe.exec(clean)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, "").trim();
    if (text.length > 60) paragraphs.push(text);
  }
  return paragraphs.slice(0, 20).join("\n\n");
}

export async function POST(req: NextRequest) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const { url } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "رابط غير صالح" }, { status: 400 });
  }
  // SSRF protection: only allow public HTTP(S) URLs, block private IPs
  let parsedUrl: URL;
  try { parsedUrl = new URL(url); } catch {
    return NextResponse.json({ error: "رابط غير صالح" }, { status: 400 });
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: "بروتوكول غير مسموح به" }, { status: 400 });
  }
  const hostname = parsedUrl.hostname.toLowerCase();
  const blockedPatterns = [/^localhost$/, /^127\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^::1$/, /^0\.0\.0\.0$/];
  if (blockedPatterns.some((p) => p.test(hostname))) {
    return NextResponse.json({ error: "رابط غير مسموح به" }, { status: 400 });
  }

  // 1. Fetch the page
  let html = "";
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AlBaalaagh/1.0)" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return NextResponse.json({ error: "تعذّر جلب الصفحة" }, { status: 400 });
    html = await res.text();
  } catch {
    return NextResponse.json({ error: "تعذّر الوصول إلى الرابط" }, { status: 400 });
  }

  // 2. Extract metadata
  const ogTitle   = extractMeta(html, "og:title")   || extractMeta(html, "twitter:title");
  const ogDesc    = extractMeta(html, "og:description") || extractMeta(html, "twitter:description");
  const ogImage   = extractMeta(html, "og:image")   || extractMeta(html, "twitter:image");
  const bodyText  = extractText(html);

  if (!ogTitle && !bodyText) {
    return NextResponse.json({ error: "لم نتمكن من استخراج محتوى الصفحة" }, { status: 400 });
  }

  const sourceTitle = ogTitle || "خبر من رابط خارجي";
  const sourceDesc  = ogDesc  || "";

  // 3. Generate and validate the complete draft before any database mutation.
  let generated: NewsDraft;
  try {
    generated = await generateUrlDraft({
      original_title: sourceTitle,
      source_name: parsedUrl.hostname.replace("www.", ""),
      source_url: url,
      description: sourceDesc,
      article_text: bodyText.slice(0, 12_000),
    });
  } catch (err: unknown) {
    if (err instanceof AiProviderError) {
      const response = toAdminAiResponse(err);
      return NextResponse.json({ error: response.error, category: response.category }, { status: response.status });
    }
    console.error(JSON.stringify({ event: "url_news_generation_failed", route: "/api/admin/news/from-url" }));
    return NextResponse.json({ error: "تعذّر إنشاء مسودة صالحة من الرابط." }, { status: 500 });
  }

  // 4. Insert placeholder news row so the publish flow can use its ID
  const { data: row, error: insertErr } = await supabaseAdmin
    .from("news")
    .insert({
      title:       sourceTitle,
      excerpt:     sourceDesc,
      content:     null,
      image_url:   ogImage || null,
      source:      new URL(url).hostname.replace("www.", ""),
      url,
      status:      "pending",
      geo:         "general",
      category:    "عام",
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertErr || !row) {
    console.error("[from-url] DB insert error:", insertErr);
    if (insertErr?.code === "23505") {
      const { data: existing } = await supabaseAdmin
        .from("news")
        .select("id, status")
        .eq("url", url)
        .maybeSingle();
      return NextResponse.json(
        { error: "هذا الخبر موجود مسبقاً في قاعدة البيانات", existingId: existing?.id ?? null },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "خطأ في قاعدة البيانات" }, { status: 500 });
  }

  return NextResponse.json({
    newsId:    row.id,
    title:     generated.title,
    excerpt:   generated.excerpt,
    content:   generated.content,
    needs_internal_review: generated.needs_internal_review,
    image_url: ogImage || null,
    geo:       "general",
    category:  "عام",
    citations: [{
      name: parsedUrl.hostname.replace("www.", ""),
      url,
      kind: "media",
      is_primary: true,
      published_at: null,
    }],
  });
}
