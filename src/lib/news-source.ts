import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import sanitizeHtml from "sanitize-html";

export class NewsSourceError extends Error {}

const MAX_BYTES = 2_000_000;
const MAX_TEXT = 20_000;

function text(value: string): string {
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} })
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ").trim();
}

// Find the matching closing tag, rather than stopping at a nested div's end.
function container(html: string, opening: RegExp): string | null {
  const match = opening.exec(html);
  if (!match) return null;
  const tag = /^<(\w+)/.exec(match[0])![1];
  const tags = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
  tags.lastIndex = match.index + match[0].length;
  const start = tags.lastIndex;
  let depth = 1;
  for (let token; (token = tags.exec(html));) {
    depth += token[1] ? -1 : 1;
    if (!depth) return html.slice(start, token.index);
  }
  return null;
}

export function extractNewsSource(html: string) {
  function meta(name: string): string {
    for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
      const attrs = Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)]
        .map((m) => [m[1].toLowerCase(), m[2] ?? m[3]]));
      if (attrs.property === name || attrs.name === name) return text(attrs.content ?? "");
    }
    return "";
  }
  const clean = html.replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|nav|header|footer|aside|figure|figcaption|form)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
  // Prefer the article body over headers, related stories and promotional copy.
  const body = container(clean, /<(?:div|section)\b[^>]*class=["'][^"']*\b(?:entry-content|article-content|article-body|post-content)\b[^"']*["'][^>]*>/i)
    ?? container(clean, /<article\b[^>]*>/i)
    ?? container(clean, /<main\b[^>]*>/i)
    ?? clean;
  const paragraphs = [...body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p\s*>/gi)]
    .map((m) => text(m[1])).filter((p) => p.length >= 20);
  const articleText = [...new Set(paragraphs)].join("\n\n").slice(0, MAX_TEXT);
  if (articleText.length < 250 || /^(access denied|just a moment|enable javascript)/i.test(articleText)) {
    throw new NewsSourceError("تعذّر استخراج نص المقال كاملاً. ألصق نص المصدر للمراجعة بدلاً من التلخيص من عنوان فقط.");
  }
  return {
    title: meta("og:title") || meta("twitter:title") || text(/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? ""),
    description: meta("og:description") || meta("description") || meta("twitter:description"),
    image: meta("og:image") || meta("twitter:image"),
    articleText,
  };
}

export function isPublicNewsAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && (b === 0 || b === 168)) || (a === 198 && (b === 18 || b === 19)));
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

export async function fetchNewsSource(value: string) {
  const signal = AbortSignal.timeout(12_000);
  try {
    let url = await publicUrl(value);
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
      if (!response.ok || !response.headers.get("content-type")?.includes("text/html") || !response.body) break;
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
      return { ...extractNewsSource(Buffer.concat(chunks).toString("utf8")), url: url.href };
    }
  } catch (error) {
    if (error instanceof NewsSourceError) throw error;
  }
  throw new NewsSourceError("تعذّر جلب نص المصدر. حاول مجدداً أو ألصق نص المقال للمراجعة.");
}
