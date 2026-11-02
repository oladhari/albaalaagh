import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import sanitizeHtml from "sanitize-html";
import { parseDocument, DomUtils } from "htmlparser2";

export class NewsSourceError extends Error {}

const MAX_BYTES = 2_000_000;
const MAX_TEXT = 20_000;

function text(value: string): string {
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} })
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ").trim();
}

// Explicit article fields only: feed snippets, metadata descriptions and arbitrary
// page paragraphs must never become evidence for a generated report.
export function extractNewsSource(html: string, sourceUrl?: string) {
  const document = parseDocument(html);
  const elements = (name: string) => DomUtils.getElementsByTagName(name, document, true);
  const meta = (name: string) => {
    const node = elements("meta").find((node) => node.attribs.property === name || node.attribs.name === name);
    return text(node?.attribs.content ?? "");
  };
  const title = meta("og:title") || meta("twitter:title") || text(DomUtils.textContent(elements("title")[0] ?? document));
  const description = meta("og:description") || meta("description") || meta("twitter:description");
  const candidates: string[] = [];
  const scripts = elements("script");

  // Mosaïque's <article> is an empty hydration shell. Its *actual HTML body*
  // lives here; seoDescription/metadata and other stories are not fallbacks.
  if (sourceUrl && /(^|\.)mosaiquefm\.net$/i.test(new URL(sourceUrl).hostname)) {
    const script = scripts.find((node) => node.attribs.id === "__NEXT_DATA__");
    try {
      const article = JSON.parse(DomUtils.textContent(script ?? document)).props?.pageProps?.pagedata?.article;
      if (article && sourceUrl.split("/").includes(String(article.id)) && /<p\b/i.test(article.description ?? "")) {
        candidates.push(article.description);
      }
    } catch { /* Missing/changed hydration data is not permission to use metadata. */ }
  }

  // GDACS reports publish evidence in labelled table cells, not article <p>s.
  if (sourceUrl && /(^|\.)gdacs\.org$/i.test(new URL(sourceUrl).hostname)) {
    const summary = DomUtils.findOne((node) => node.attribs.id === "alert_summary_left", document.children, true);
    if (summary) {
      const rows = DomUtils.getElementsByTagName("tr", summary, true).map((row) =>
        DomUtils.getElementsByTagName("td", row, true).map((cell) => text(DomUtils.getOuterHTML(cell)).replace(/:\s*$/, "")).join(": "));
      const eventId = new URL(sourceUrl).searchParams.get("eventid");
      const evidence = [...DomUtils.getElementsByTagName("p", summary, true).map((node) => text(DomUtils.getOuterHTML(node))), ...rows].join("\n\n");
      if (eventId && /^\d+$/.test(eventId) && rows.some((row) => row.includes(` ${eventId}`)) && validArticleText(evidence)) {
        return { title, description, image: meta("og:image"), articleText: evidence };
      }
    }
  }

  const structuredBodies: string[] = [];
  const visit = (value: unknown, depth = 0) => {
    if (!value || typeof value !== "object" || depth > 12) return;
    if (Array.isArray(value)) { value.forEach((v) => visit(v, depth + 1)); return; }
    const record = value as Record<string, unknown>;
    const types = Array.isArray(record["@type"]) ? record["@type"] : [record["@type"]];
    if (types.some((v) => /^(?:NewsArticle|Article|BlogPosting|LiveBlogPosting|ReportageNewsArticle|TechArticle)$/.test(String(v)))
      && typeof record.articleBody === "string") structuredBodies.push(record.articleBody);
    // Only the document's structured graph, not related-item lists.
    if (record["@graph"]) visit(record["@graph"], depth + 1);
    if (record.mainEntity) visit(record.mainEntity, depth + 1);
  };
  for (const node of scripts.filter((node) => node.attribs.type === "application/ld+json")) {
    try { visit(JSON.parse(DomUtils.textContent(node))); } catch { /* Malformed JSON-LD: try the DOM. */ }
  }

  const ignored = /(?:^|[\s_-])(?:related|newsletter|share|sharing|advertisement|advert|social)(?:[\s_-]|$)/i;
  for (const node of DomUtils.findAll((node) => ["script", "style", "nav", "header", "footer", "aside", "figure", "figcaption", "form", "noscript", "button"].includes(node.name) || ignored.test(node.attribs.class ?? ""), document.children)) {
    DomUtils.removeElement(node);
  }
  const containers = DomUtils.findAll((node) => ["div", "section", "article", "main"].includes(node.name), document.children);
  const bodyClasses = /(?:^|\s)(?:entry-content|article-content|article-body|post-content|t-content__main|field--name-body|embed-responsive)(?:\s|$)/;
  const explicit = containers.filter((node) => node.attribs.itemprop === "articleBody" || "data-article-content" in node.attribs || bodyClasses.test(node.attribs.class ?? ""));
  // Do not stop at the first empty <article> (UN News/streamed React pages).
  const scoped = [...explicit, ...containers.filter((node) => node.name === "article"), ...containers.filter((node) => node.name === "main")];
  for (const node of scoped) candidates.push(DomUtils.getOuterHTML(node));
  for (const body of candidates) {
    const dom = parseDocument(body);
    const paragraphs = DomUtils.getElementsByTagName("p", dom, true)
      .map((node) => text(DomUtils.getOuterHTML(node))).filter((p) => p.length >= 2 && !/^(?:نشرت في:|آخر تحديث:|كلمات مفتاحية مرتبطة)/.test(p));
    const articleText = [...new Set(paragraphs)].join("\n\n").slice(0, MAX_TEXT);
    if (validArticleText(articleText)) return { title, description, image: meta("og:image") || meta("twitter:image"), articleText };
  }
  for (const body of structuredBodies) {
    const articleText = text(body).slice(0, MAX_TEXT);
    if (validArticleText(articleText) && articleText !== description && articleText !== title) {
      return { title, description, image: meta("og:image") || meta("twitter:image"), articleText };
    }
  }
  throw new NewsSourceError("تعذّر استخراج نص المقال كاملاً. ألصق نص المصدر للمراجعة بدلاً من التلخيص من عنوان فقط.");
}

function validArticleText(value: string): boolean {
  return value.length >= 250 && !/(?:access denied|just a moment|enable javascript|requires javascript|verify (?:that )?you are human|browser is not supported|checking your browser)/i.test(value);
}

export function isPublicNewsAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b, c] = address.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2))))
      || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113));
  }
  // Only global IPv6 unicast; excludes loopback, link-local, private and mapped IPv4.
  return isIP(address) === 6 && /^[23][0-9a-f]{3}:/i.test(address);
}

async function publicUrl(value: string): Promise<URL> {
  let url: URL;
  try { url = new URL(value); } catch { throw new NewsSourceError("رابط المصدر غير صالح"); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || (url.port && !["80", "443"].includes(url.port))) {
    throw new NewsSourceError("رابط المصدر غير مسموح به");
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => !isPublicNewsAddress(address))) {
    throw new NewsSourceError("رابط المصدر غير مسموح به");
  }
  return url;
}

export function extractEarthquakeSource(value: unknown, eventId: string) {
  const event = value as { id?: string; type?: string; properties?: Record<string, unknown>; geometry?: { coordinates?: number[] } };
  const props = event?.properties;
  const coordinates = event?.geometry?.coordinates;
  if (event?.type !== "Feature" || event.id !== eventId || !props || !coordinates || coordinates.length < 3
    || !coordinates.every(Number.isFinite) || typeof props.mag !== "number" || !Number.isFinite(props.mag)
    || typeof props.time !== "number" || !Number.isFinite(new Date(props.time).getTime()) || typeof props.place !== "string") {
    throw new NewsSourceError("تعذّر التحقق من بيانات الزلزال من USGS.");
  }
  const title = text(String(props.title || `M ${props.mag} - ${props.place}`));
  const articleText = [
    "Official USGS earthquake event data (GeoJSON).",
    `Event identifier: ${eventId}. Event type: ${text(String(props.type ?? "earthquake"))}.`,
    `Location: ${text(props.place)}. Magnitude: ${props.mag}; magnitude type: ${text(String(props.magType ?? "not supplied"))}.`,
    `Origin time (UTC): ${new Date(props.time).toISOString()}.`,
    `Epicentre coordinates: latitude ${coordinates[1]} degrees, longitude ${coordinates[0]} degrees. Depth: ${coordinates[2]} km.`,
    `Review status: ${text(String(props.status ?? "not supplied"))}.`,
    "These event fields do not provide confirmed casualty or damage counts; those must not be inferred from magnitude alone.",
  ].join("\n\n");
  return { title, description: title, image: "", articleText };
}

export async function fetchNewsSource(value: string) {
  const signal = AbortSignal.timeout(12_000);
  try {
    const originalUrl = await publicUrl(value);
    // GDACS still advertises HTTP links, while its report server requires HTTPS.
    if (/(^|\.)gdacs\.org$/.test(originalUrl.hostname)) originalUrl.protocol = "https:";
    const eventId = originalUrl.hostname === "earthquake.usgs.gov"
      ? /^\/earthquakes\/eventpage\/([a-z0-9]+)(?:\/|$)/i.exec(originalUrl.pathname)?.[1] : undefined;
    let url = eventId
      ? await publicUrl(`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&eventid=${encodeURIComponent(eventId)}`)
      : originalUrl;
    for (let redirects = 0; redirects <= 3; redirects++) {
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; AlBaalaagh/1.0)" },
        redirect: "manual", signal,
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        await response.body?.cancel();
        const location = response.headers.get("location");
        if (!location || redirects === 3) break;
        url = await publicUrl(new URL(location, url).href);
        continue;
      }
      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok || !response.body || !(eventId ? /application\/(?:geo\+)?json/.test(contentType) : contentType.includes("text/html"))) break;
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        bytes += chunk.byteLength;
        if (bytes > MAX_BYTES) { await reader.cancel(); throw new NewsSourceError("صفحة المصدر أكبر من الحد المسموح"); }
        chunks.push(chunk);
      }
      const source = Buffer.concat(chunks).toString("utf8");
      if (eventId) return { ...extractEarthquakeSource(JSON.parse(source), eventId), url: originalUrl.href };
      return { ...extractNewsSource(source, url.href), url: url.href };
    }
  } catch (error) {
    if (error instanceof NewsSourceError) throw error;
  }
  throw new NewsSourceError("تعذّر جلب نص المصدر. حاول مجدداً أو ألصق نص المقال للمراجعة.");
}
